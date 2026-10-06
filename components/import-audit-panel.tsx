"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, LoaderCircle, ShieldCheck, Truck } from "lucide-react";
import { getImportAudit } from "@/lib/firestore-service";
import { formatDate } from "@/lib/format";
import type { ImportAudit, Ranking, SourceReportSummary } from "@/lib/types";

function formatTimestamp(value: unknown) {
  if (!value) return "Não informado";
  let date: Date | null = null;
  if (value instanceof Date) date = value;
  else if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") date = (value as { toDate: () => Date }).toDate();
  else if (typeof value === "object" && value && "seconds" in value) date = new Date(Number((value as { seconds: number }).seconds) * 1000);
  return date ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date) : "Não informado";
}

function activeRows(source: SourceReportSummary) {
  const key = Object.keys(source.statusCounts ?? {}).find((status) => status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === "ATIVO");
  return key ? source.statusCounts[key] : 0;
}

export function ImportAuditPanel({ ranking }: { ranking: Ranking }) {
  const [audit, setAudit] = useState<ImportAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getImportAudit(ranking.importId)
      .then((item) => { if (active) setAudit(item); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar a auditoria."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ranking.importId]);

  if (loading) return <section className="panel audit-history-panel"><div className="audit-loading"><LoaderCircle className="spin" size={19} /> Carregando auditoria do fechamento...</div></section>;
  if (error) return <div className="notice notice--error"><AlertCircle size={18} /><span>{error}</span></div>;
  if (!audit) return <section className="panel audit-history-panel"><div className="panel__header"><div><span className="section-kicker">Rastreabilidade</span><h3>Auditoria da importação</h3></div></div><div className="inline-empty">Este fechamento não possui o registro detalhado da importação.</div></section>;

  const considersAllStatuses = audit.rulesVersion?.startsWith("todas-situacoes-") ?? false;
  const countLabel = considersAllStatuses ? "Registros considerados" : "Veículos ativos";

  return <section className="panel audit-history-panel">
    <div className="panel__header audit-history-panel__header"><div><span className="section-kicker">Rastreabilidade</span><h3>Auditoria da importação</h3><p>Confira a origem e as validações aplicadas neste fechamento.</p></div><span className="audit-verified"><ShieldCheck size={17} /> Fechamento rastreado</span></div>
    <div className="audit-metadata">
      <div><span>Responsável</span><strong>{audit.createdByName || ranking.createdByName || "Não informado"}</strong></div>
      <div><span>Importado em</span><strong>{formatTimestamp(audit.createdAt ?? ranking.createdAt)}</strong></div>
      <div><span>Período consolidado</span><strong>{formatDate(audit.periodStart)} a {formatDate(audit.periodEnd)}</strong></div>
      <div><span>Regra aplicada</span><strong>{audit.rulesVersion || "Regra padrão"}</strong></div>
    </div>

    <div className="audit-source-grid">{(audit.sourceReports ?? []).map((source) => <article key={`${source.system}-${source.fileHash}`}>
      <div className="audit-source-title"><span>{source.system === "TRUCK" ? <Truck size={20} /> : <FileSpreadsheet size={20} />}</span><div><small>SGA {source.system === "TRUCK" ? "Truck" : "Leves"}</small><strong>{source.fileName}</strong></div></div>
      <dl><div><dt>Linhas do arquivo</dt><dd>{source.totalRows}</dd></div><div><dt>{countLabel}</dt><dd>{considersAllStatuses ? source.totalRows : activeRows(source)}</dd></div><div><dt>Duplicidades internas</dt><dd>{source.duplicateRows}</dd></div><div><dt>Placas ausentes</dt><dd>{source.missingPlates}</dd></div><div><dt>Período</dt><dd>{source.periodStart && source.periodEnd ? `${formatDate(source.periodStart)} a ${formatDate(source.periodEnd)}` : "Sem produção"}</dd></div></dl>
    </article>)}</div>

    <div className="audit-consolidated"><div><CheckCircle2 size={22} /><span>Resultado consolidado</span></div><dl><div><dt>Linhas analisadas</dt><dd>{audit.totalRows}</dd></div><div><dt>{countLabel}</dt><dd>{considersAllStatuses ? (audit.consideredRows ?? ranking.totalVehicles) : audit.activeRows}</dd></div><div><dt>Duplicidades removidas</dt><dd>{audit.duplicateRows}</dd></div><div><dt>Repetidos entre sistemas</dt><dd>{audit.crossSourceDuplicates}</dd></div><div><dt>Placas ausentes</dt><dd>{audit.missingPlates}</dd></div></dl></div>
  </section>;
}
