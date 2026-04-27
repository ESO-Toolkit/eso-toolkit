export interface Env {
  DB: D1Database;
  VECTOR_INDEX: VectorizeIndex;
  AI: Ai;
  INGEST_SECRET: string;
  GLM_API_KEY?: string;
}

export interface ChatRequest {
  message: string;
  context?: ChatContext;
}

export interface ChatContext {
  role?: string;
  class?: string;
  weaponCombo?: string;
}

export interface BuildStatRow {
  id?: number;
  weapon_combo: string;
  role: string;
  class: string;
  front_bar_enchant: string;
  back_bar_enchant: string;
  front_bar_trait: string;
  back_bar_trait: string;
  usage_count: number;
  avg_parse_score: number;
  patch_version: string;
  updated_at: string;
}

export interface KnowledgeDocRow {
  id?: number;
  doc_type: string;
  title: string;
  content: string;
  vectorize_id: string | null;
  source: string;
  created_at: string;
}

export interface SourcePayload {
  buildStats: BuildStatSource[];
  knowledgeDocs: KnowledgeDocSource[];
}

export interface BuildStatSource {
  weaponCombo: string;
  role: string;
  class: string;
  usageCount: number;
  avgParseScore: number;
}

export interface KnowledgeDocSource {
  title: string;
  docType: string;
  score: number;
}

export interface ExtractedIntent {
  weapons: string[];
  traits: string[];
  enchants: string[];
  roles: string[];
  classes: string[];
  keywords: string[];
}

export interface StreamEvent {
  event: string;
  data: string;
  id?: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  sources?: SourcePayload;
  timestamp: number;
}
