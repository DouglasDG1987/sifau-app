// ============================================================
// SIFAU — Tipos de domínio e constantes de UI (fonte única)
// ============================================================

export type UserRole = "cidadao" | "fiscal" | "gestor" | "auditor";

export type OccurrenceStatus =
  | "aberta"
  | "triada"
  | "atribuida"
  | "em_vistoria"
  | "resolvida"
  | "arquivada"
  | "escalonada";

export type UrgencyLevel = 1 | 2 | 3 | 4; // 1=Baixa 2=Média 3=Alta 4=Crítica
export type MediaKind = "foto" | "video";
export type CommentVisibility = "public" | "internal";
export type InspectionAction =
  | "notificacao"
  | "multa"
  | "encaminhamento"
  | "orientacao"
  | "sem_acao";

export type OrigemOS = "preventiva" | "denuncia" | "oficio" | "ci" | "gestao";
export type StatusOS = "aberta" | "em_vistoria" | "concluida" | "cancelada";
export type OrgaoApoio = "policia_militar" | "guarda_municipal" | "outro";
export type StatusVistoria = "em_andamento" | "finalizada";
export type CienciaStatus = "assinou" | "recusou" | "ausente";
export type NotificationType = "occurrence_status" | "sla_alert" | "assignment" | "system";
export type StatusPagamento = "pendente" | "pago" | "cancelado";
export type DevicePlatform = "ios" | "android" | "web";

export interface Profile {
  id: string;
  role: UserRole;
  nome: string;
  email: string;
  telefone?: string | null;
  bairro?: string | null;
  especialidade?: string | null;
  region?: string | null;
  cpf_cnpj?: string | null;
  push_enabled: boolean;
  ativo: boolean;
  created_at: string;
}

export interface Occurrence {
  id: string;
  citizen_id: string;
  category: string;
  subcategory?: string | null;
  description: string;
  status: OccurrenceStatus;
  urgency_score: UrgencyLevel;
  lat: number;
  lng: number;
  bairro?: string | null;
  address?: string | null;
  created_at: string;
  sla_deadline: string;
  duplicate_of?: string | null;
  archived: boolean;
  archive_reason?: string | null;
  assigned_fiscal_id?: string | null;
  assigned_fiscal_name?: string | null;
  /** Primeira foto (thumbnail) — enriquecido pela API quando disponível. */
  photo?: string | null;
}

export interface OccurrenceMedia {
  id: string;
  occurrence_id: string;
  url: string;
  type: MediaKind;
  uploaded_by: string;
  created_at: string;
}

export interface StatusLog {
  id: string;
  occurrence_id: string;
  from_status: OccurrenceStatus | null;
  to_status: OccurrenceStatus;
  changed_by: string;
  changed_by_name?: string | null;
  changed_at: string;
  ip_address?: string | null;
  geo?: string | null;
  note?: string | null;
}

export interface Inspection {
  id: string;
  occurrence_id: string;
  fiscal_id: string;
  arrival_at: string;
  arrival_lat?: number | null;
  arrival_lng?: number | null;
  report_json: Record<string, unknown>;
  action_taken: InspectionAction;
  fine_amount?: number | null;
  fine_process_number?: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  occurrence_id: string;
  author_id: string;
  author_name?: string | null;
  visibility: CommentVisibility;
  text: string;
  created_at: string;
}

export interface SlaRule {
  id: string;
  category: string;
  max_hours: number;
}

export interface FiscalStat {
  fiscal_id: string;
  fiscal_name: string;
  sla_compliance_pct: number;
  avg_rating: number;
  total_resolved: number;
  active_assigned: number;
}

export interface AIClassificationResult {
  category: string;
  subcategory: string | null;
  urgency: UrgencyLevel;
  confidence: number;
  duplicate_suspected: boolean;
  duplicate_of?: string | null;
  rationale: string;
  source?: "ia" | "heuristica";
}

export interface PrefeituraConfig {
  id: string;
  nome_prefeitura: string;
  legislacao_aplicavel: string[];
}

export interface OrdemServico {
  id: string;
  numero_os: string;
  origem_os: OrigemOS;
  denuncia_id: string | null;
  requerente: string;
  gerente_id: string;
  gerente_nome?: string | null;
  fiscal_id: string | null;
  fiscal_nome?: string | null;
  apoio_operacional: boolean;
  orgao_apoio: OrgaoApoio | null;
  orgao_apoio_outro: string | null;
  servico_descricao: string;
  legislacao_aplicavel: string[];
  endereco: string;
  latitude: number | null;
  longitude: number | null;
  data_emissao: string;
  prazo_resposta: string;
  status: StatusOS;
  criado_em: string;
  atualizado_em: string;
}

export interface AcaoFiscalizacao {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
}

export interface TipoInfracao {
  id: string;
  artigo_legal: string;
  descricao: string;
  valor_base: number;
}

export interface Vistoria {
  id: string;
  os_id: string;
  fiscal_id: string;
  iniciada_em: string;
  finalizada_em: string | null;
  geo_inicio_lat: number | null;
  geo_inicio_lng: number | null;
  geo_inicio_precisao_m: number | null;
  relatorio: string | null;
  fotos: string[];
  status: StatusVistoria;
  criado_em: string;
}

export interface AutoInfracao {
  id: string;
  os_id: string;
  tipo_infracao_id: string;
  valor_multa: number;
  motivo: string | null;
  autuado_nome: string | null;
  autuado_documento: string | null;
  ciencia_status: CienciaStatus;
  testemunha_nome: string | null;
  status_pagamento: StatusPagamento;
  data_vencimento: string | null;
  recidiva_id: string | null;
  criado_em: string;
  tipo_infracao?: TipoInfracao | null;
}

export interface Recidiva {
  id: string;
  auto_infracao_id: string;
  documento_responsavel: string;
  ocorrencia_original_id: string;
  nivel_reincidencia: number;
  fator_multiplicacao: number;
  criado_em: string;
}

export interface DeviceToken {
  id: string;
  profile_id: string;
  token: string;
  platform: DevicePlatform;
  device_info: Record<string, unknown>;
  active: boolean;
  last_used: string;
  created_at: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
  occurrence_id?: string | null;
}

// ------------------------------------------------------------
// Constantes / rótulos (pt-BR)
// ------------------------------------------------------------

export const CATEGORIES = [
  "Buraco na via",
  "Poluição sonora",
  "Comércio irregular",
  "Descarte irregular de lixo",
  "Obra sem alvará",
  "Iluminação pública",
  "Sinalização",
  "Esgoto / Drenagem",
  "Outro",
] as const;

export const SUBCATEGORIES: Record<string, string[]> = {
  "Buraco na via": ["Via local", "Avenida", "Rodovia", "Trecho de obra"],
  "Poluição sonora": ["Estabelecimento", "Obra", "Evento", "Veículo"],
  "Comércio irregular": ["Sem alvará", "Ambulante", "Produto irregular", "Ocupação de calçada"],
  "Descarte irregular de lixo": ["Entulho", "Resíduo orgânico", "Eletrônico", "Volume grande"],
  "Obra sem alvará": ["Residencial", "Comercial", "Reforma", "Demolição"],
  "Iluminação pública": ["Lâmpada queimada", "Poste danificado", "Fiação exposta", "Sem iluminação"],
  Sinalização: ["Placa danificada", "Faixa apagada", "Semáforo", "Pintura de solo"],
  "Esgoto / Drenagem": ["Vazamento", "Entupimento", "Alagamento", "Esgoto a céu aberto"],
  Outro: ["Não especificado"],
};

export const STATUS_LABELS: Record<OccurrenceStatus, string> = {
  aberta: "Aberta",
  triada: "Triada",
  atribuida: "Atribuída",
  em_vistoria: "Em vistoria",
  resolvida: "Resolvida",
  arquivada: "Arquivada",
  escalonada: "Escalonada",
};

export const STATUS_COLORS: Record<OccurrenceStatus, string> = {
  aberta: "bg-primary/10 text-primary border-primary/20",
  triada: "bg-accent text-accent-foreground border-accent",
  atribuida: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-300",
  em_vistoria: "bg-warning/10 text-warning border-warning/30",
  resolvida: "bg-success/10 text-success border-success/30",
  arquivada: "bg-muted text-muted-foreground border-border",
  escalonada: "bg-danger/10 text-danger border-danger/30",
};

export const STATUS_HEX: Record<OccurrenceStatus, string> = {
  aberta: "#1750AB",
  triada: "#5CC8F5",
  atribuida: "#7C6CF0",
  em_vistoria: "#F59F0A",
  resolvida: "#73A61C",
  arquivada: "#8A94A6",
  escalonada: "#DC2828",
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  1: "Baixa",
  2: "Média",
  3: "Alta",
  4: "Crítica",
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  1: "bg-success/10 text-success border-success/30",
  2: "bg-warning/10 text-warning border-warning/30",
  3: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  4: "bg-danger/10 text-danger border-danger/30",
};

export const URGENCY_HEX: Record<UrgencyLevel, string> = {
  1: "#73A61C",
  2: "#F59F0A",
  3: "#F97316",
  4: "#DC2828",
};

export const ACTION_LABELS: Record<InspectionAction, string> = {
  notificacao: "Notificação",
  multa: "Multa",
  encaminhamento: "Encaminhamento",
  orientacao: "Orientação",
  sem_acao: "Sem ação",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  cidadao: "Cidadão",
  fiscal: "Fiscal",
  gestor: "Gestor Municipal",
  auditor: "Auditor/Admin",
};

export const ORIGEM_OS_LABELS: Record<OrigemOS, string> = {
  preventiva: "Preventiva",
  denuncia: "Denúncia",
  oficio: "Ofício",
  ci: "CI",
  gestao: "Gestão",
};

export const ORIGEM_OS_COLORS: Record<OrigemOS, string> = {
  preventiva: "bg-primary/10 text-primary border-primary/20",
  denuncia: "bg-warning/10 text-warning border-warning/30",
  oficio: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-300",
  ci: "bg-secondary text-secondary-foreground border-border",
  gestao: "bg-accent text-accent-foreground border-accent",
};

export const STATUS_OS_LABELS: Record<StatusOS, string> = {
  aberta: "Aberta",
  em_vistoria: "Em Vistoria",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const STATUS_OS_COLORS: Record<StatusOS, string> = {
  aberta: "bg-primary/10 text-primary border-primary/20",
  em_vistoria: "bg-warning/10 text-warning border-warning/30",
  concluida: "bg-success/10 text-success border-success/30",
  cancelada: "bg-muted text-muted-foreground border-border",
};

export const STATUS_OS_HEX: Record<StatusOS, string> = {
  aberta: "#1750AB",
  em_vistoria: "#F59F0A",
  concluida: "#73A61C",
  cancelada: "#8A94A6",
};

export const CIENCIA_LABELS: Record<CienciaStatus, string> = {
  assinou: "Assinou",
  recusou: "Recusou assinar",
  ausente: "Ausente",
};

export const ORGAO_APOIO_LABELS: Record<OrgaoApoio, string> = {
  policia_militar: "Polícia Militar",
  guarda_municipal: "Guarda Municipal",
  outro: "Outro",
};

export const STATUS_PAGAMENTO_LABELS: Record<StatusPagamento, string> = {
  pendente: "Pendente",
  pago: "Pago",
  cancelado: "Cancelado",
};

export const STATUS_PAGAMENTO_COLORS: Record<StatusPagamento, string> = {
  pendente: "bg-warning/10 text-warning border-warning/30",
  pago: "bg-success/10 text-success border-success/30",
  cancelado: "bg-muted text-muted-foreground border-border",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  occurrence_status: "Status de Ocorrência",
  sla_alert: "Alerta de SLA",
  assignment: "Designação",
  system: "Sistema",
};

export const ACTION_OPTIONS: { value: InspectionAction; label: string }[] = [
  { value: "notificacao", label: "Notificação" },
  { value: "multa", label: "Multa" },
  { value: "encaminhamento", label: "Encaminhamento" },
  { value: "orientacao", label: "Orientação" },
  { value: "sem_acao", label: "Sem ação" },
];

// Raio (metros) de geofencing para início de vistoria de OS
export const GEOFENCE_RADIUS_M = 200;
// SLA padrão (horas) quando não há regra para a categoria
export const DEFAULT_SLA_HOURS = 72;
// Raio (graus) para busca de duplicatas próximas (~3 km)
export const DUPLICATE_SEARCH_RADIUS_DEG = 0.05;

export function isOpenStatus(s: OccurrenceStatus): boolean {
  return ["aberta", "triada", "atribuida", "em_vistoria", "escalonada"].includes(s);
}
