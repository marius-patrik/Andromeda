import type * as vscode from "vscode";
import type { MessageEnvelope } from "../shared/protocol.js";
import type { ProjectJson } from "../shared/schemas.js";

export type { MessageEnvelope };

export interface ProjectSession {
  projectId: string;
  uri: vscode.Uri;
  enginePanel: vscode.WebviewPanel;
  engineReady: boolean;
  pendingEngineMessages: MessageEnvelope[];
  views: Map<string, vscode.WebviewPanel>;
  autoSaveTimer?: NodeJS.Timeout;
  backupTimer?: NodeJS.Timeout;
  isDirty: boolean;
  isUntitled: boolean;
  isSaving?: boolean;
  isClosing?: boolean;
  projectJson?: ProjectJson;
  lastSnapshot?: unknown;
}

export interface PendingRequest {
  resolve: (value: MessageEnvelope) => void;
  reject: (reason?: Error) => void;
  timeout: NodeJS.Timeout;
  responseType?: string;
}
