"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, FileSpreadsheet, LoaderCircle, ShieldCheck, UploadCloud, X } from "lucide-react";
import { useAuth } from "./auth-provider";
import { getLatestRanking, listExecutives, listTeams, saveClosing } from "@/lib/firestore-service";
import { formatCurrency, formatDate } from "@/lib/format";
import { buildRanking, defaultClosingLabel } from "@/lib/ranking";
import { mergeManagementReports, parseManagementReport } from "@/lib/report-parser";
import { mergeDefaultTeams, resolveReportTeams } from "@/lib/team-mapping";
import type { ParsedReport, RankingEntry, Team } from "@/lib/types";

export function ImportPanel() {
  const { user, configured } = useAuth();
  const levesInputRef = useRef<HTMLInputElement>(null);
  const truckInputRef = useRef<HTMLInputElement>(null);
  const [levesFile, setLevesFile] = useState<File | null>(null);
  const [truckFile, setTruckFile] = useState<File | null>(null);
  const [report, setReport] = useState<ParsedReport | null>(null);
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [label, setLabel] = useState("");
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedRankingId, setSavedRankingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!configured) return;
    listTeams()
      .then((teamItems) => {
        setTeams(mergeDefaultTeams(teamItems).filter((team) => team.ativo));
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Não foi possível carregar os cadastros."));
  }, [configured]);

  const totalRevenue = useMemo(() => entries.reduce((sum, entry) => sum + entry.revenue, 0), [entries]);
  const selectedFileCount = Number(Boolean(levesFile)) + Number(Boolean(truckFile));
  const unconfiguredTeams = teams.filter((team) => !team.configurada && report?.rows.some((row) => row.cooperativaCodigo === team.codigoCooperativa));

  const reset = () => {
    setLevesFile(null);
    setTruckFile(null);
    setReport(null);
    setEntries([]);
    setLabel("");
    setSavedRankingId("");
    setError("");
    if (levesInputRef.current) levesInputRef.current.value = "";
    if (truckInputRef.current) truckInputRef.current.value = "";
  };

  async function parseSourceFile(file: File | null, source: "SGA Leves" | "SGA Truck") {
    if (!file?.size) return null;
    try {
      return await parseManagementReport(file);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Não foi possível ler o arquivo.";
      throw new Error(`${source} (${file.name}): ${message}`);
    }
  }

  async function processFiles() {
    if (!levesFile && !truckFile) return;
    setProcessing(true);
    setError("");
    try {
      const [levesReport, truckReport] = await Promise.all([
        parseSourceFile(levesFile, "SGA Leves"),
        parseSourceFile(truckFile, "SGA Truck"),
      ]);
      const parsed = await mergeManagementReports(levesReport, truckReport);
      const [latest, executiveItems, teamItems] = configured
        ? await Promise.all([getLatestRanking(), listExecutives(), listTeams()])
        : [undefined, [], []];
      const activeExecutives = executiveItems.filter((item) => item.ativo);
      const activeTeams = resolveReportTeams(parsed, teamItems).filter((item) => item.ativo);
      setTeams(activeTeams);
      setReport(parsed);
      setEntries(buildRanking(parsed, activeExecutives, activeTeams, latest));
      setLabel(defaultClosingLabel(parsed.periodEnd));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível processar os relatórios.");
    } finally {
      setProcessing(false);
    }
  }

  async function confirmClosing() {
    if (!report || !user || !label.trim()) return;
    setSaving(true);
    setError("");
    try {
      const rankingId = await saveClosing({ report, label, entries, teams, user });
      setSavedRankingId(rankingId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o fechamento.");
    } finally {
      setSaving(false);
    }
  }

  if (savedRankingId) {
    return (
      <section className="panel success-panel">
        <span className="success-panel__icon"><CheckCircle2 size={38} /></span>
        <span className="section-kicker">Fechamento confirmado</span>
        <h2>{label}</h2>
        <p>O ranking foi salvo com {entries.reduce((sum, item) => sum + item.plates, 0)} placas produzidas no período e já faz parte do histórico.</p>
        <div className="success-panel__actions">
          <Link className="button button--primary" href="/rankings">Ver ranking</Link>
          <Link className="button button--secondary" href="/gerar-arte">Gerar arte do Top 3</Link>
          <button className="button button--ghost-light" onClick={reset}>Criar outro fechamento</button>
        </div>
      </section>
    );
  }

  if (report) {
    return (
      <div className="import-preview-layout">
        <section className="panel import-preview">
          <div className="panel__header">
            <div><span className="section-kicker">Etapa 2 de 3</span><h3>Validar fechamento</h3></div>
            <button className="button button--subtle" onClick={reset}>Trocar arquivos</button>
          </div>

          <div className="preview-metrics">
            <article><span>Placas produzidas</span><strong>{entries.reduce((sum, item) => sum + item.plates, 0)}</strong><small>todas as situações</small></article>
            <article><span>Executivos</span><strong>{entries.length}</strong><small>vínculo automático</small></article>
            <article><span>Previsão</span><strong>{formatCurrency(totalRevenue)}</strong><small>desempate do ranking</small></article>
            <article><span>Período</span><strong>{formatDate(report.periodStart)}</strong><small>até {formatDate(report.periodEnd)}</small></article>
          </div>

          <label className="form-label">
            <span>Nome do fechamento</span>
            <input className="text-input" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} />
          </label>

          {unconfiguredTeams.length > 0 && (
            <div className="notice notice--warning"><AlertCircle size={19} /><span>{unconfiguredTeams.length} {unconfiguredTeams.length === 1 ? "cooperativa ainda não possui" : "cooperativas ainda não possuem"} nome de equipe configurado. Os resultados serão preservados e você poderá definir os nomes em Equipes.</span></div>
          )}

          <div className="ranking-table-wrap preview-table-wrap">
            <table className="ranking-table">
              <thead><tr><th>Pos.</th><th>Executivo</th><th>Equipe neste fechamento</th><th>Placas</th><th>Prev. Fat.</th><th>T. Médio</th></tr></thead>
              <tbody>{entries.map((entry) => (
                <tr key={entry.normalizedName}>
                  <td><span className={`position-badge position-badge--${entry.position}`}>{entry.position}º</span></td>
                  <td><strong>{entry.name}</strong>{!entry.executiveId && <small className="new-record">Novo cadastro</small>}</td>
                  <td><span className="team-tag">{entry.team}</span></td>
                  <td><strong>{entry.plates}</strong></td>
                  <td>{formatCurrency(entry.revenue)}</td>
                  <td>{formatCurrency(entry.averageTicket)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          {error && <div className="notice notice--error"><AlertCircle size={19} /><span>{error}</span></div>}
          <div className="confirmation-bar">
            <div><ShieldCheck size={20} /><span><strong>Regra aplicada:</strong> toda produção do período, independentemente da situação, equipe pela cooperativa BR, 1 ponto por placa e desempate por previsão.</span></div>
            <button className="button button--primary" disabled={saving || !label.trim()} onClick={confirmClosing}>
              {saving ? <><LoaderCircle className="spin" size={18} /> Salvando...</> : "Confirmar e salvar ranking"}
            </button>
          </div>
        </section>

        <aside className="panel report-audit">
          <span className="section-kicker">Auditoria da leitura</span>
          <h3>{report.sourceReports?.length === 2 ? "Leves + Truck" : "Relatório processado"}</h3>
          {report.sourceReports?.map((source) => (
            <section className="audit-source" key={source.system}>
              <strong>{source.system === "LEVES" ? "SGA Leves" : "SGA Truck"}</strong>
              <dl>
                <div><dt>Arquivo</dt><dd>{source.fileName}</dd></div>
                <div><dt>Registros únicos</dt><dd>{source.totalRows}</dd></div>
                <div><dt>Duplicidades internas</dt><dd>{source.duplicateRows}</dd></div>
              </dl>
            </section>
          ))}
          <section className="audit-source audit-source--total">
            <strong>Resultado consolidado</strong>
            <dl>
              <div><dt>Registros únicos</dt><dd>{report.totalRows}</dd></div>
              <div><dt>Sem placa</dt><dd>{report.missingPlates} <small>identificados pelo chassi</small></dd></div>
              <div><dt>Repetidos entre sistemas</dt><dd>{report.crossSourceDuplicates ?? 0}</dd></div>
              {Object.entries(report.statusCounts).map(([status, count]) => <div key={status}><dt>{status}</dt><dd>{count}</dd></div>)}
            </dl>
          </section>
          <p>{report.sourceReports?.length === 2 ? "Os dois arquivos foram lidos" : "O arquivo foi lido"} apenas no navegador. Nomes de associados, placas e chassis não serão gravados no Firebase.</p>
        </aside>
      </div>
    );
  }

  return (
    <div className="two-column-layout">
      <section className="panel import-card">
        <div className="panel__header"><div><span className="section-kicker">Etapa 1 de 3</span><h3>Adicionar relatórios</h3><p>Envie pelo menos um arquivo. O Truck é opcional quando não houver produção.</p></div></div>
        <div className="dual-upload-grid">
          <section className="upload-source-card">
            <span className="upload-source-card__label">1 · SGA Leves</span>
            <button
              className="dropzone dropzone--compact"
              onClick={() => levesInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); setLevesFile(event.dataTransfer.files[0] ?? null); }}
            >
              <span className="dropzone__icon"><UploadCloud size={27} /></span>
              <strong>Relatório de Leves</strong>
              <span>arraste ou clique para selecionar</span>
              <small>Gestão Adesão · .xls</small>
            </button>
            <input ref={levesInputRef} className="sr-only" type="file" accept=".xls,application/vnd.ms-excel" onChange={(event) => setLevesFile(event.target.files?.[0] ?? null)} />
            {levesFile ? (
              <div className="selected-file">
                <FileSpreadsheet size={24} />
                <div><strong>{levesFile.name}</strong><span>{(levesFile.size / 1024).toFixed(1)} KB · {levesFile.size ? "pronto" : "vazio · será ignorado"}</span></div>
                <button className="icon-button" aria-label="Remover relatório de Leves" onClick={() => setLevesFile(null)}><X size={18} /></button>
              </div>
            ) : <div className="empty-file-note">Relatório de Leves não selecionado.</div>}
          </section>

          <section className="upload-source-card">
            <span className="upload-source-card__label">2 · SGA Truck · opcional</span>
            <button
              className="dropzone dropzone--compact"
              onClick={() => truckInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); setTruckFile(event.dataTransfer.files[0] ?? null); }}
            >
              <span className="dropzone__icon"><UploadCloud size={27} /></span>
              <strong>Relatório de Truck</strong>
              <span>arraste ou clique para selecionar</span>
              <small>Gestão Adesão · .xls</small>
            </button>
            <input ref={truckInputRef} className="sr-only" type="file" accept=".xls,application/vnd.ms-excel" onChange={(event) => setTruckFile(event.target.files?.[0] ?? null)} />
            {truckFile ? (
              <div className="selected-file">
                <FileSpreadsheet size={24} />
                <div><strong>{truckFile.name}</strong><span>{(truckFile.size / 1024).toFixed(1)} KB · {truckFile.size ? "pronto" : "vazio · será ignorado"}</span></div>
                <button className="icon-button" aria-label="Remover relatório de Truck" onClick={() => setTruckFile(null)}><X size={18} /></button>
              </div>
            ) : <div className="empty-file-note">Relatório de Truck não selecionado.</div>}
          </section>
        </div>

        {error && <div className="notice notice--error"><AlertCircle size={19} /><span>{error}</span></div>}
        <div className="form-actions">
          <button className="button button--ghost" onClick={reset}>Limpar</button>
          <button className="button button--primary" disabled={selectedFileCount === 0 || processing} onClick={processFiles}>
            {processing ? <><LoaderCircle className="spin" size={18} /> Processando...</> : selectedFileCount === 1 ? "Processar relatório" : "Consolidar relatórios"}
          </button>
        </div>
        <p className="feature-note">Nada será salvo antes da sua conferência e confirmação.</p>
      </section>

      <aside className="panel guide-card">
        <span className="section-kicker">Como funciona</span>
        <h3>Dos relatórios ao ranking</h3>
        <ol className="step-list">
          <li><span>1</span><div><strong>Envie Leves e/ou Truck</strong><p>Use pelo menos um Gestão Adesão .xls. Arquivo só com cabeçalho também é aceito.</p></div></li>
          <li><span>2</span><div><strong>Confira o consolidado</strong><p>Participantes iguais são somados automaticamente.</p></div></li>
          <li><span>3</span><div><strong>Confirme o fechamento</strong><p>Um único ranking combinado entra no histórico.</p></div></li>
        </ol>
        <div className="security-box"><CheckCircle2 size={20} /><span>Somente o resultado consolidado é salvo. Os relatórios originais não são armazenados.</span></div>
      </aside>
    </div>
  );
}
