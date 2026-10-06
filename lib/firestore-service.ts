import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { buildTeamRanking } from "./ranking";
import { teamDocumentId } from "./team-mapping";
import type { AppUser, Executive, ImportAudit, ParsedReport, Ranking, RankingEntry, Team } from "./types";

function requireDb() {
  if (!db) throw new Error("O Firebase não está configurado neste ambiente.");
  return db;
}

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStoredRanking(id: string, data: Record<string, unknown>): Ranking {
  const stored = { id, ...data } as Ranking;
  const entries = Array.isArray(stored.entries) ? stored.entries.map((entry) => {
    const plates = numeric(entry.plates);
    const revenue = numeric(entry.revenue);
    return {
      ...entry,
      name: entry.name || "Participante sem nome",
      normalizedName: entry.normalizedName || entry.name?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || entry.executiveId || "sem-identificacao",
      teamId: entry.teamId ?? null,
      team: entry.team || "Sem equipe",
      cooperativeCodes: Array.isArray(entry.cooperativeCodes) ? entry.cooperativeCodes : [],
      plates,
      revenue,
      averageTicket: numeric(entry.averageTicket, plates > 0 ? revenue / plates : 0),
      movement: numeric(entry.movement),
      newAdhesions: numeric(entry.newAdhesions),
    };
  }) : [];
  const teamEntries = Array.isArray(stored.teamEntries) ? stored.teamEntries.map((entry) => {
    const plates = numeric(entry.plates);
    const revenue = numeric(entry.revenue);
    return {
      ...entry,
      teamId: entry.teamId || entry.cooperativeCode || entry.team || "sem-identificacao",
      cooperativeCode: entry.cooperativeCode || "",
      team: entry.team || "Equipe sem nome",
      plates,
      revenue,
      averageTicket: numeric(entry.averageTicket, plates > 0 ? revenue / plates : 0),
      members: numeric(entry.members),
      movement: numeric(entry.movement),
    };
  }) : [];
  return {
    ...stored,
    entries,
    teamEntries,
    label: stored.label || "Fechamento sem nome",
    periodStart: stored.periodStart || "",
    periodEnd: stored.periodEnd || "",
    createdByName: stored.createdByName || "Não informado",
    importId: stored.importId || "",
    fileName: stored.fileName || "",
    totalVehicles: numeric(stored.totalVehicles, entries.reduce((sum, entry) => sum + entry.plates, 0)),
    totalRevenue: numeric(stored.totalRevenue, entries.reduce((sum, entry) => sum + entry.revenue, 0)),
    totalExecutives: numeric(stored.totalExecutives, entries.length),
    statusCounts: stored.statusCounts ?? {},
  };
}

export async function listTeams() {
  const database = requireDb();
  const snapshot = await getDocs(query(collection(database, "equipes"), orderBy("nome")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Team));
}

export async function saveTeam(team: Pick<Team, "nome" | "ativo"> & { id?: string; codigoCooperativa?: string; nomeRelatorio?: string; configurada?: boolean }) {
  const database = requireDb();
  const reference = team.id
    ? doc(database, "equipes", team.id)
    : team.codigoCooperativa
      ? doc(database, "equipes", teamDocumentId(team.codigoCooperativa))
      : doc(collection(database, "equipes"));
  await setDoc(reference, {
    nome: team.nome.trim(),
    codigoCooperativa: team.codigoCooperativa ?? "",
    nomeRelatorio: team.nomeRelatorio ?? "",
    configurada: team.configurada ?? true,
    ativo: team.ativo,
    updatedAt: serverTimestamp(),
    ...(team.id ? {} : { createdAt: serverTimestamp() }),
  }, { merge: true });
  return reference.id;
}

export async function setTeamActive(teamId: string, ativo: boolean) {
  await updateDoc(doc(requireDb(), "equipes", teamId), { ativo, updatedAt: serverTimestamp() });
}

export async function listExecutives() {
  const database = requireDb();
  const snapshot = await getDocs(query(collection(database, "executivos"), orderBy("nome")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Executive));
}

export async function saveExecutive(executive: Omit<Executive, "id"> & { id?: string }) {
  const database = requireDb();
  const reference = executive.id ? doc(database, "executivos", executive.id) : doc(collection(database, "executivos"));
  await setDoc(reference, {
    nome: executive.nome.trim(),
    nomeArte: executive.nomeArte?.trim() ?? "",
    nomeRelatorio: executive.nomeRelatorio.trim(),
    nomeNormalizado: executive.nomeNormalizado,
    equipeId: executive.equipeId || null,
    fotoDataUrl: executive.fotoDataUrl ?? "",
    fotoPosicaoX: executive.fotoPosicaoX ?? 50,
    fotoPosicaoY: executive.fotoPosicaoY ?? 50,
    fotoZoom: executive.fotoZoom ?? 1,
    ativo: executive.ativo,
    updatedAt: serverTimestamp(),
    ...(executive.id ? {} : { createdAt: serverTimestamp() }),
  }, { merge: true });
  return reference.id;
}

export async function assignTeamMembers(teamId: string, selectedIds: string[], executives: Executive[]) {
  const database = requireDb();
  const selected = new Set(selectedIds);
  const batch = writeBatch(database);
  executives.forEach((executive) => {
    const shouldJoin = selected.has(executive.id);
    const shouldLeave = executive.equipeId === teamId && !shouldJoin;
    if (shouldJoin || shouldLeave) {
      batch.update(doc(database, "executivos", executive.id), {
        equipeId: shouldJoin ? teamId : null,
        updatedAt: serverTimestamp(),
      });
    }
  });
  await batch.commit();
}

export async function listRankings(maxResults = 24) {
  const database = requireDb();
  const snapshot = await getDocs(query(collection(database, "rankings"), orderBy("createdAt", "desc"), limit(maxResults)));
  return snapshot.docs.map((item) => normalizeStoredRanking(item.id, item.data()));
}

export async function getLatestRanking() {
  const rankings = await listRankings(1);
  return rankings[0];
}

export async function getImportAudit(importId: string) {
  if (!importId) return null;
  const snapshot = await getDoc(doc(requireDb(), "imports", importId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as ImportAudit) : null;
}

export async function saveClosing({
  report,
  label,
  entries,
  teams,
  user,
}: {
  report: ParsedReport;
  label: string;
  entries: RankingEntry[];
  teams: Team[];
  user: AppUser;
}) {
  const database = requireDb();
  const importReference = doc(database, "imports", report.fileHash);
  if ((await getDoc(importReference)).exists()) {
    throw new Error("Este mesmo conjunto de relatórios já foi confirmado anteriormente.");
  }

  const existingExecutives = await listExecutives();
  const executiveByName = new Map(existingExecutives.map((item) => [item.nomeNormalizado, item]));
  const batch = writeBatch(database);
  const selectedTeamByName = new Map(entries.map((entry) => [entry.normalizedName, entry.teamId]));
  const reportNames = new Map(report.rows.map((row) => [row.executivoNormalizado, row.executivo]));
  const executiveReferenceByName = new Map(existingExecutives.map((item) => [item.nomeNormalizado, doc(database, "executivos", item.id)]));

  teams.filter((team) => team.codigoCooperativa).forEach((team) => {
    batch.set(doc(database, "equipes", team.id), {
      nome: team.nome,
      codigoCooperativa: team.codigoCooperativa,
      nomeRelatorio: team.nomeRelatorio ?? "",
      configurada: team.configurada ?? true,
      ativo: team.ativo,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  reportNames.forEach((reportName, normalizedName) => {
    if (!executiveReferenceByName.has(normalizedName)) {
      const executiveReference = doc(collection(database, "executivos"));
      executiveReferenceByName.set(normalizedName, executiveReference);
      batch.set(executiveReference, {
        nome: reportName,
        nomeArte: "",
        nomeRelatorio: reportName,
        nomeNormalizado: normalizedName,
        equipeId: selectedTeamByName.get(normalizedName) ?? null,
        fotoDataUrl: "",
        fotoPosicaoX: 50,
        fotoPosicaoY: 50,
        fotoZoom: 1,
        ativo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });

  const finalEntries = entries.map((entry) => {
    const existing = executiveByName.get(entry.normalizedName);
    const executiveReference = executiveReferenceByName.get(entry.normalizedName) as ReturnType<typeof doc>;
    if (existing && existing.equipeId !== entry.teamId) {
      batch.update(executiveReference, { equipeId: entry.teamId, updatedAt: serverTimestamp() });
    }

    return { ...entry, executiveId: executiveReference.id };
  });

  const teamById = new Map(teams.map((team) => [team.id, team]));
  const snappedEntries = finalEntries.map((entry) => ({
    ...entry,
    team: entry.teamId ? teamById.get(entry.teamId)?.nome ?? entry.team : entry.team,
  }));
  const previousRanking = await getLatestRanking();
  const teamEntries = buildTeamRanking(report, teams, previousRanking?.teamEntries ?? []);
  const totalRevenue = Number(snappedEntries.reduce((sum, entry) => sum + entry.revenue, 0).toFixed(2));
  const totalVehicles = snappedEntries.reduce((sum, entry) => sum + entry.plates, 0);
  const activeRows = report.rows.filter((row) => row.situacaoNormalizada === "ATIVO").length;
  const rankingReference = doc(collection(database, "rankings"));

  batch.set(importReference, {
    fileName: report.fileName,
    fileHash: report.fileHash,
    label: label.trim(),
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    generatedAt: report.generatedAt ?? null,
    generatedBy: report.generatedBy ?? null,
    totalRows: report.totalRows,
    activeRows,
    consideredRows: totalVehicles,
    duplicateRows: report.duplicateRows,
    missingPlates: report.missingPlates,
    statusCounts: report.statusCounts,
    adhesionCounts: report.adhesionCounts,
    vehicleTypeCounts: report.vehicleTypeCounts,
    sourceReports: report.sourceReports ?? [],
    crossSourceDuplicates: report.crossSourceDuplicates ?? 0,
    rankingId: rankingReference.id,
    rulesVersion: "todas-situacoes-producao-periodo-sga-opcional-v5",
    createdBy: user.uid,
    createdByName: user.nome,
    createdAt: serverTimestamp(),
  });

  batch.set(rankingReference, {
    label: label.trim(),
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    createdBy: user.uid,
    createdByName: user.nome,
    importId: report.fileHash,
    fileName: report.fileName,
    totalVehicles,
    totalRevenue,
    totalExecutives: snappedEntries.length,
    statusCounts: report.statusCounts,
    entries: snappedEntries,
    teamEntries,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return rankingReference.id;
}

function recalculateMovements(rankings: Ranking[]) {
  return rankings.map((ranking, index) => {
    const previous = rankings[index - 1];
    const previousExecutivePositions = new Map(previous?.entries.map((entry) => [entry.normalizedName, entry.position]) ?? []);
    const previousTeamPositions = new Map(previous?.teamEntries?.map((entry) => [entry.teamId, entry.position]) ?? []);
    return {
      ...ranking,
      entries: ranking.entries.map((entry) => ({
        ...entry,
        movement: previousExecutivePositions.has(entry.normalizedName)
          ? (previousExecutivePositions.get(entry.normalizedName) as number) - entry.position
          : 0,
      })),
      teamEntries: (ranking.teamEntries ?? []).map((entry) => ({
        ...entry,
        movement: previousTeamPositions.has(entry.teamId)
          ? (previousTeamPositions.get(entry.teamId) as number) - entry.position
          : 0,
      })),
    };
  });
}

export async function deleteRanking(ranking: Ranking) {
  const database = requireDb();
  const snapshot = await getDocs(query(collection(database, "rankings"), orderBy("createdAt", "asc")));
  const remaining = snapshot.docs
    .filter((item) => item.id !== ranking.id)
    .map((item) => normalizeStoredRanking(item.id, item.data()));
  const recalculated = recalculateMovements(remaining);
  const batch = writeBatch(database);

  batch.delete(doc(database, "rankings", ranking.id));
  if (ranking.importId) batch.delete(doc(database, "imports", ranking.importId));
  recalculated.forEach((item) => {
    batch.update(doc(database, "rankings", item.id), {
      entries: item.entries,
      teamEntries: item.teamEntries,
    });
  });
  await batch.commit();
}
