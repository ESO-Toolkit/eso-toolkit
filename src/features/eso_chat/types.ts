export type MessageRole = 'user' | 'assistant';

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

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  sources?: SourcePayload;
  timestamp: number;
}

export interface StreamEvent {
  event: 'token' | 'sources' | 'error' | 'done';
  data: string;
  id?: string;
}

export interface ExtractedIntent {
  weapons: string[];
  traits: string[];
  enchants: string[];
  roles: string[];
  classes: string[];
  keywords: string[];
}
