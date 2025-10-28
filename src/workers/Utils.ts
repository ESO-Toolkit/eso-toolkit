export type OnProgressCallback = (progress: number) => void;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMessage {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp?: number;
}

export type OnLogCallback = (log: LogMessage) => void;
