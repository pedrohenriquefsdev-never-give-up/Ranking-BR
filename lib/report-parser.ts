import type { ParsedReport, ReportRow, ReportSystem, SourceReportSummary } from "./types";
import { extractCooperativeCode } from "./team-mapping";

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function parseCurrency(value: string) {
  const cleaned = value.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBrazilianDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function countBy(rows: ReportRow[], select: (row: ReportRow) => string) {
  return rows.reduce<Record<string, number>>((result, row) => {
    const key = select(row) || "NÃO INFORMADO";
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
}

async function hashFile(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashText(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function summarizeSource(report: ParsedReport, system: ReportSystem): SourceReportSummary {
  return {
    system,
    fileName: report.fileName,
    fileHash: report.fileHash,
    totalRows: report.totalRows,
    duplicateRows: report.duplicateRows,
    missingPlates: report.missingPlates,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    statusCounts: report.statusCounts,
  };
}

function selectDuplicateRow(current: ReportRow, candidate: ReportRow) {
  return candidate.dataContrato > current.dataContrato ? candidate : current;
}

export async function mergeManagementReports(leves: ParsedReport | null, truck: ParsedReport | null): Promise<ParsedReport> {
  const sources = [
    leves ? { system: "LEVES" as const, report: leves } : null,
    truck ? { system: "TRUCK" as const, report: truck } : null,
  ].filter((source): source is { system: ReportSystem; report: ParsedReport } => source !== null);

  if (!sources.length) {
    throw new Error("Selecione pelo menos um relatório de Leves ou Truck.");
  }

  if (leves && truck && leves.fileHash === truck.fileHash) {
    throw new Error("Os relatórios de Leves e Truck são o mesmo arquivo. Selecione um arquivo diferente em cada campo.");
  }

  const uniqueRows = new Map<string, ReportRow>();
  let crossSourceDuplicates = 0;
  sources.forEach(({ report }, sourceIndex) => {
    report.rows.forEach((row) => {
      const key = row.chassi || normalizeText(row.placa);
      const existing = uniqueRows.get(key);
      if (existing) {
        if (sourceIndex > 0) crossSourceDuplicates += 1;
        uniqueRows.set(key, selectDuplicateRow(existing, row));
      } else {
        uniqueRows.set(key, row);
      }
    });
  });

  const rows = Array.from(uniqueRows.values());
  const dates = rows.map((row) => row.dataContrato).filter(Boolean).sort();
  if (!rows.length || !dates.length) {
    throw new Error("O relatório selecionado não contém produção válida. Envie pelo menos um relatório com registros para gerar o ranking.");
  }
  const productionSources = sources.filter(({ report }) => report.rows.length > 0);
  const fileHash = await hashText(productionSources.map(({ system, report }) => `${system}:${report.fileHash}`).join("|"));

  return {
    fileName: sources.map(({ system, report }) => `${system === "LEVES" ? "Leves" : "Truck"}: ${report.fileName}`).join(" | "),
    fileHash,
    rows,
    totalRows: rows.length,
    duplicateRows: sources.reduce((total, { report }) => total + report.duplicateRows, 0) + crossSourceDuplicates,
    crossSourceDuplicates,
    missingPlates: rows.filter((row) => !row.placa).length,
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
    generatedAt: sources.map(({ report }) => report.generatedAt).filter((value): value is string => Boolean(value)).sort().at(-1),
    generatedBy: sources.map(({ report }) => report.generatedBy).filter((value): value is string => Boolean(value)).join(" / ") || undefined,
    statusCounts: countBy(rows, (row) => row.situacao),
    adhesionCounts: countBy(rows, (row) => row.tipoAdesao),
    vehicleTypeCounts: countBy(rows, (row) => row.tipoVeiculo),
    sourceReports: sources.map(({ system, report }) => summarizeSource(report, system)),
  };
}

export async function parseManagementReport(file: File): Promise<ParsedReport> {
  const [buffer, fileHash] = await Promise.all([file.arrayBuffer(), hashFile(file)]);
  const html = new TextDecoder("windows-1252").decode(buffer);

  if (!/<table[\s>]/i.test(html)) {
    throw new Error("Este arquivo não segue o layout Gestão Adesão exportado pelo sistema.");
  }

  const documentNode = new DOMParser().parseFromString(html, "text/html");
  const tables = Array.from(documentNode.querySelectorAll("table"));
  const reportTable = tables.find((table) => {
    const text = normalizeText(table.textContent ?? "");
    return text.includes("VOLUNTARIO") && text.includes("CHASSI") && text.includes("DATA CONTRATO");
  });

  if (!reportTable) {
    throw new Error("Não encontrei as colunas Voluntário, Chassi e Data Contrato no relatório.");
  }

  const tableRows = Array.from(reportTable.querySelectorAll("tr"));
  const headerIndex = tableRows.findIndex((row) => {
    const cells = Array.from(row.querySelectorAll("th,td")).map((cell) => normalizeText(cell.textContent ?? ""));
    return cells.includes("NOME") && cells.includes("VOLUNTARIO") && cells.includes("CHASSI");
  });

  if (headerIndex < 0) throw new Error("O cabeçalho do relatório Gestão Adesão não foi reconhecido.");

  const headers = Array.from(tableRows[headerIndex].querySelectorAll("th,td")).map((cell) => normalizeText(cell.textContent ?? ""));
  const column = (label: string) => headers.indexOf(normalizeText(label));
  const indexes = {
    nome: column("Nome"),
    placa: column("Placa"),
    tipoVeiculo: column("Tipo Veículo"),
    cooperativa: column("Cooperativa"),
    executivo: column("Voluntário"),
    situacao: column("Situação Veículo"),
    data: column("Data Contrato"),
    tipoAdesao: column("Tipo Adesão"),
    previsao: headers.findIndex((header) => header.startsWith("VALOR PREVISAO RATEIO")),
    chassi: column("Chassi"),
  };

  if (Object.values(indexes).some((index) => index < 0)) {
    throw new Error("O layout do relatório mudou e uma ou mais colunas obrigatórias não foram encontradas.");
  }

  const rawRows = tableRows.slice(headerIndex + 1).flatMap<ReportRow>((row) => {
    const cells = Array.from(row.querySelectorAll("td")).map((cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim());
    if (cells.length < headers.length) return [];
    const executivo = cells[indexes.executivo];
    const chassi = cells[indexes.chassi];
    if (!executivo || !chassi) return [];
    const situacao = cells[indexes.situacao];
    const tipoAdesao = cells[indexes.tipoAdesao];
    return [{
      nomeAssociado: cells[indexes.nome],
      placa: cells[indexes.placa],
      tipoVeiculo: cells[indexes.tipoVeiculo],
      cooperativa: cells[indexes.cooperativa],
      cooperativaCodigo: extractCooperativeCode(cells[indexes.cooperativa]),
      executivo,
      executivoNormalizado: normalizeText(executivo),
      situacao,
      situacaoNormalizada: normalizeText(situacao),
      dataContrato: parseBrazilianDate(cells[indexes.data]),
      tipoAdesao,
      tipoAdesaoNormalizado: normalizeText(tipoAdesao),
      previsao: parseCurrency(cells[indexes.previsao]),
      chassi: normalizeText(chassi),
    }];
  });

  const uniqueRows = new Map<string, ReportRow>();
  rawRows.forEach((row) => {
    const key = row.chassi || normalizeText(row.placa);
    const existing = uniqueRows.get(key);
    uniqueRows.set(key, existing ? selectDuplicateRow(existing, row) : row);
  });
  const rows = Array.from(uniqueRows.values());
  const dates = rows.map((row) => row.dataContrato).filter(Boolean).sort();

  const metadataText = tables.map((table) => table.textContent ?? "").join(" ").replace(/\s+/g, " ");
  const metadataMatch = metadataText.match(/Usuário:\s*(\d{2}\/\d{2}\/\d{4})-(\d{2}:\d{2}:\d{2})-(.+?)\s*$/i);

  return {
    fileName: file.name,
    fileHash,
    rows,
    totalRows: rows.length,
    duplicateRows: rawRows.length - rows.length,
    missingPlates: rows.filter((row) => !row.placa).length,
    periodStart: dates[0] ?? "",
    periodEnd: dates[dates.length - 1] ?? "",
    generatedAt: metadataMatch ? `${parseBrazilianDate(metadataMatch[1])}T${metadataMatch[2]}` : undefined,
    generatedBy: metadataMatch?.[3]?.trim(),
    statusCounts: countBy(rows, (row) => row.situacao),
    adhesionCounts: countBy(rows, (row) => row.tipoAdesao),
    vehicleTypeCounts: countBy(rows, (row) => row.tipoVeiculo),
  };
}
