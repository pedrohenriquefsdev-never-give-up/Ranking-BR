import { formatCurrency, formatDate } from "./format";
import type { Ranking } from "./types";

function downloadBlob(content: BlobPart[], type: string, fileName: string) {
  const url = URL.createObjectURL(new Blob(content, { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function escapeXml(value: string | number) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type ExcelCellKind = "text" | "integer" | "decimal";

function excelCell(value: string | number, kind: ExcelCellKind = "text", striped = false) {
  const style = `${striped ? "Stripe" : ""}${kind === "text" ? "Text" : kind === "integer" ? "Integer" : "Decimal"}`;
  if (kind === "text") return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  return `<Cell ss:StyleID="${style}"><Data ss:Type="Number">${safeValue}</Data></Cell>`;
}

function excelHeaderCell(value: string) {
  return `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

export function buildRankingExcelXml(ranking: Ranking) {
  const executiveRows = ranking.entries.map((entry, index) => {
    const ticket = typeof entry.averageTicket === "number" ? entry.averageTicket : (entry.plates ? entry.revenue / entry.plates : 0);
    const striped = index % 2 === 1;
    return `<Row>${excelCell(entry.position, "integer", striped)}${excelCell(entry.name, "text", striped)}${excelCell(entry.team, "text", striped)}${excelCell(entry.plates, "integer", striped)}${excelCell(entry.revenue ?? 0, "decimal", striped)}${excelCell(ticket, "decimal", striped)}${excelCell(entry.movement ?? 0, "integer", striped)}</Row>`;
  }).join("");
  const teamRows = (ranking.teamEntries ?? []).map((entry, index) => {
    const ticket = typeof entry.averageTicket === "number" ? entry.averageTicket : (entry.plates ? entry.revenue / entry.plates : 0);
    const striped = index % 2 === 1;
    return `<Row>${excelCell(entry.position, "integer", striped)}${excelCell(entry.team, "text", striped)}${excelCell(entry.cooperativeCode ?? "", "text", striped)}${excelCell(entry.members ?? 0, "integer", striped)}${excelCell(entry.plates, "integer", striped)}${excelCell(entry.revenue ?? 0, "decimal", striped)}${excelCell(ticket, "decimal", striped)}${excelCell(entry.movement ?? 0, "integer", striped)}</Row>`;
  }).join("");
  const executiveHeader = ["Posição", "Executivo", "Equipe", "Placas", "Previsão", "Ticket médio", "Movimento"].map(excelHeaderCell).join("");
  const teamHeader = ["Posição", "Equipe", "Cooperativa", "Participantes", "Placas", "Previsão", "Ticket médio", "Movimento"].map(excelHeaderCell).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
    <Style ss:ID="Cell"><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CFD3D7"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CFD3D7"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CFD3D7"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CFD3D7"/></Borders></Style>
    <Style ss:ID="Title"><Font ss:FontName="Arial" ss:Size="15" ss:Bold="1" ss:Color="#FFC400"/><Interior ss:Color="#17191D" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Label"><Font ss:Bold="1"/></Style>
    <Style ss:ID="Header" ss:Parent="Cell"><Font ss:Bold="1" ss:Color="#17191D"/><Interior ss:Color="#FFC400" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Text" ss:Parent="Cell"/>
    <Style ss:ID="Integer" ss:Parent="Cell"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="0"/></Style>
    <Style ss:ID="Decimal" ss:Parent="Cell"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="#,##0.00"/></Style>
    <Style ss:ID="StripeText" ss:Parent="Cell"><Interior ss:Color="#F5F6F7" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StripeInteger" ss:Parent="Integer"><Interior ss:Color="#F5F6F7" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StripeDecimal" ss:Parent="Decimal"><Interior ss:Color="#F5F6F7" ss:Pattern="Solid"/></Style>
  </Styles>
  <Worksheet ss:Name="Resumo">
    <Table>
      <Column ss:Width="150"/><Column ss:Width="240"/>
      <Row ss:Height="28"><Cell ss:StyleID="Title" ss:MergeAcross="1"><Data ss:Type="String">Ranking BR · ${escapeXml(ranking.label)}</Data></Cell></Row>
      <Row><Cell ss:StyleID="Label"><Data ss:Type="String">Período</Data></Cell><Cell><Data ss:Type="String">${escapeXml(formatDate(ranking.periodStart))} a ${escapeXml(formatDate(ranking.periodEnd))}</Data></Cell></Row>
      <Row><Cell ss:StyleID="Label"><Data ss:Type="String">Responsável</Data></Cell><Cell><Data ss:Type="String">${escapeXml(ranking.createdByName || "Não informado")}</Data></Cell></Row>
      <Row><Cell ss:StyleID="Label"><Data ss:Type="String">Placas produzidas</Data></Cell><Cell ss:StyleID="Integer"><Data ss:Type="Number">${Number(ranking.totalVehicles) || 0}</Data></Cell></Row>
      <Row><Cell ss:StyleID="Label"><Data ss:Type="String">Executivos</Data></Cell><Cell ss:StyleID="Integer"><Data ss:Type="Number">${Number(ranking.totalExecutives) || 0}</Data></Cell></Row>
      <Row><Cell ss:StyleID="Label"><Data ss:Type="String">Previsão total</Data></Cell><Cell ss:StyleID="Decimal"><Data ss:Type="Number">${Number(ranking.totalRevenue) || 0}</Data></Cell></Row>
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Executivos">
    <Table><Column ss:Width="58"/><Column ss:Width="190"/><Column ss:Width="150"/><Column ss:Width="65"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="70"/><Row>${executiveHeader}</Row>${executiveRows}</Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions>
  </Worksheet>
  <Worksheet ss:Name="Equipes">
    <Table><Column ss:Width="58"/><Column ss:Width="190"/><Column ss:Width="90"/><Column ss:Width="82"/><Column ss:Width="65"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="70"/><Row>${teamHeader}</Row>${teamRows}</Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions>
  </Worksheet>
</Workbook>`;
}

export function exportRankingExcel(ranking: Ranking) {
  const xml = buildRankingExcelXml(ranking);
  downloadBlob(["\ufeff", xml], "application/vnd.ms-excel;charset=utf-8", `ranking-br-${safeFileName(ranking.label)}-excel.xml`);
}

type PdfLine = { text: string; bold?: boolean; size?: number; color?: "dark" | "yellow" | "muted" };

function pdfText(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\xFF]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function latin1Bytes(value: string) {
  return Uint8Array.from(Array.from(value, (character) => character.charCodeAt(0) & 0xff));
}

function makePdf(lines: PdfLine[]) {
  const pageWidth = 842;
  const pageHeight = 595;
  const linesPerPage = 29;
  const pages: PdfLine[][] = [];
  for (let index = 0; index < lines.length; index += linesPerPage) pages.push(lines.slice(index, index + linesPerPage));
  const fontRegularId = 3 + pages.length * 2;
  const fontBoldId = fontRegularId + 1;
  const objects: string[] = [];
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  const pageIds = pages.map((_, index) => 3 + index * 2);
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;

  pages.forEach((pageLines, pageIndex) => {
    const pageId = 3 + pageIndex * 2;
    const contentId = pageId + 1;
    const commands = pageLines.map((line, lineIndex) => {
      const y = pageHeight - 44 - lineIndex * 17;
      const font = line.bold ? "F2" : "F1";
      const size = line.size ?? 9;
      const color = line.color === "yellow" ? "0.90 0.62 0" : line.color === "muted" ? "0.38 0.40 0.44" : "0.08 0.09 0.11";
      return `BT /${font} ${size} Tf ${color} rg 42 ${y} Td (${pdfText(line.text)}) Tj ET`;
    });
    commands.push(`BT /F1 8 Tf 0.45 0.47 0.50 rg 760 22 Td (${pageIndex + 1}/${pages.length}) Tj ET`);
    const stream = commands.join("\n");
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  objects[fontRegularId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[fontBoldId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return latin1Bytes(pdf);
}

export function exportRankingPdf(ranking: Ranking) {
  const lines: PdfLine[] = [
    { text: "RANKING BR · GPV ASSOCIADOS", bold: true, size: 17, color: "yellow" },
    { text: ranking.label, bold: true, size: 14 },
    { text: `Período: ${formatDate(ranking.periodStart)} a ${formatDate(ranking.periodEnd)} · Responsável: ${ranking.createdByName || "Não informado"}`, color: "muted" },
    { text: `Placas produzidas: ${ranking.totalVehicles} · Executivos: ${ranking.totalExecutives} · Previsão total: ${formatCurrency(ranking.totalRevenue)}` },
    { text: "" },
    { text: "RANKING DE EXECUTIVOS", bold: true, size: 12 },
    { text: "POS.  EXECUTIVO                     EQUIPE                    PLACAS    PREVISÃO        T. MÉDIO", bold: true, size: 8 },
    ...ranking.entries.map((entry) => ({ text: `${String(entry.position).padStart(2, "0")}º   ${truncate(entry.name, 28).padEnd(29)} ${truncate(entry.team, 23).padEnd(24)} ${String(entry.plates).padStart(5)}     ${formatCurrency(entry.revenue).padStart(14)}  ${formatCurrency(entry.averageTicket).padStart(12)}`, size: 8 })),
    { text: "" },
    { text: "RANKING DE EQUIPES", bold: true, size: 12 },
    { text: "POS.  EQUIPE                         PARTIC.   PLACAS    PREVISÃO        T. MÉDIO", bold: true, size: 8 },
    ...(ranking.teamEntries ?? []).map((entry) => ({ text: `${String(entry.position).padStart(2, "0")}º   ${truncate(entry.team, 30).padEnd(31)} ${String(entry.members).padStart(5)}     ${String(entry.plates).padStart(5)}     ${formatCurrency(entry.revenue).padStart(14)}  ${formatCurrency(entry.averageTicket).padStart(12)}`, size: 8 })),
  ];
  downloadBlob([makePdf(lines)], "application/pdf", `ranking-br-${safeFileName(ranking.label)}.pdf`);
}
