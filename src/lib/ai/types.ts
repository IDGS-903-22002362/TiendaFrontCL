import type { UserRole } from "@/lib/types";

export type AiSessionStatus = "active" | "archived" | "closed";
export type AiMessageRole = "user" | "assistant" | "system" | "tool";
export type AiToolCallStatus = "success" | "error" | "denied";
export type TryOnJobStatus = "queued" | "processing" | "completed" | "failed";
export type TryOnAssetKind = "user_upload" | "product_image" | "output_image";

export type AiAttachment = {
  assetId: string;
  url?: string;
  mimeType: string;
  kind: TryOnAssetKind | "generic";
};

export type AiSession = {
  id: string;
  userId: string;
  role: UserRole;
  channel: string;
  title: string;
  status: AiSessionStatus;
  summary?: string;
  lastMessageAt?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AiMessage = {
  id: string;
  sessionId: string;
  userId: string;
  role: AiMessageRole;
  content: string;
  model?: string;
  attachments?: AiAttachment[];
  toolCallIds?: string[];
  latencyMs?: number;
  tokenUsage?: {
    promptTokens?: number;
    responseTokens?: number;
    totalTokens?: number;
  };
  createdAt: string | null;
};

export type AiToolCall = {
  id: string;
  sessionId: string;
  messageId: string;
  userId: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: AiToolCallStatus;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string | null;
};

export type TryOnAsset = {
  id: string;
  userId: string;
  sessionId?: string;
  jobId?: string;
  productId?: string;
  variantId?: string;
  sku?: string;
  kind: TryOnAssetKind;
  bucket: string;
  objectPath: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  sha256?: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TryOnJob = {
  id: string;
  userId: string;
  sessionId: string;
  productId: string;
  variantId?: string;
  sku?: string;
  inputUserImageAssetId: string;
  inputUserImageUrl?: string;
  inputProductImageUrl: string;
  outputAssetId?: string;
  outputImageUrl?: string;
  status: TryOnJobStatus;
  consentAccepted: boolean;
  requestedByRole: UserRole;
  errorCode?: string;
  errorMessage?: string;
  providerJobId?: string;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt?: string | null;
};

export type AiSessionDetail = {
  session: AiSession;
  messages: AiMessage[];
  toolCalls: AiToolCall[];
};

export type AiChatToolCallSummary = {
  id: string;
  toolName: string;
  status: string;
};

export type AiChatResult = {
  text: string;
  toolCalls: AiChatToolCallSummary[];
  model?: string;
  latencyMs?: number;
};

export type AiAdminMetrics = {
  sessions: number;
  messages: number;
  toolCalls: number;
  tryOnJobs: number;
};

export type AiConversationSyncState = "ready" | "degraded_missing_index";

export type CreateAiSessionInput = {
  channel?: string;
  title?: string;
};

export type SendAiMessageInput = {
  sessionId: string;
  message: string;
};

export type CreateTryOnJobInput = {
  sessionId: string;
  productId: string;
  userImageAssetId: string;
  consentAccepted: true;
  sku?: string;
};

export type AiSseStatusEvent = {
  status: string;
};

export type AiSseError = Error & {
  code?: string;
};

export type AiSseHandlers = {
  onStatus?: (payload: AiSseStatusEvent) => void;
  onFinal?: (payload: AiChatResult) => void;
  onError?: (error: AiSseError) => void;
};
