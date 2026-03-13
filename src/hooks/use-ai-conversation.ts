"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAiSession,
  getAiConversationSyncState,
  getAiSessionDetail,
  isAiStreamingConfigError,
  isFirestoreIndexError,
  sendAiMessageJson,
  sendAiMessageSse,
} from "@/lib/api/ai";
import type {
  AiConversationSyncState,
  AiMessage,
  AiSession,
  AiToolCall,
} from "@/lib/ai/types";

type UseAiConversationOptions = {
  defaultTitle?: string;
  storageKey?: string;
  onSessionReady?: (session: AiSession) => void | Promise<void>;
  onAfterSend?: (sessionId: string) => void | Promise<void>;
};

type OpenSessionOptions = {
  silent?: boolean;
  fallbackSession?: AiSession;
};

type OpenSessionResult = {
  ok: boolean;
  syncState: AiConversationSyncState;
};

const MISSING_INDEX_MESSAGE =
  "El historial de esta conversación no está disponible temporalmente porque el backend AI requiere un índice Firestore. Puedes seguir chateando en esta sesión mientras se completa la corrección.";

function logConversationDebug(label: string, payload?: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (payload === undefined) {
    console.log(`[ai-conversation] ${label}`);
    return;
  }

  console.log(`[ai-conversation] ${label}`, payload);
}

function buildTemporaryMessage(
  role: AiMessage["role"],
  content: string,
  sessionId: string,
): AiMessage {
  return {
    id: `temp_${role}_${Date.now()}`,
    sessionId,
    userId: "local",
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function mergeAssistantReply(
  currentMessages: AiMessage[],
  sessionId: string,
  content: string,
) {
  const normalizedContent = content.trim();
  if (!normalizedContent) {
    return currentMessages;
  }

  const hasAssistantReply = currentMessages.some(
    (message) =>
      message.sessionId === sessionId &&
      message.role === "assistant" &&
      message.content.trim() === normalizedContent,
  );

  if (hasAssistantReply) {
    return currentMessages;
  }

  return [
    ...currentMessages,
    buildTemporaryMessage("assistant", normalizedContent, sessionId),
  ];
}

export function useAiConversation(options: UseAiConversationOptions = {}) {
  const { defaultTitle, storageKey, onSessionReady, onAfterSend } = options;
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [session, setSession] = useState<AiSession | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<AiToolCall[]>([]);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<AiConversationSyncState>("ready");
  const createSessionInFlightRef = useRef<Promise<string> | null>(null);
  const sendInFlightRef = useRef(false);

  const persistSessionId = useCallback(
    async (sessionId: string) => {
      if (!storageKey || typeof window === "undefined") {
        return;
      }

      window.sessionStorage.setItem(storageKey, sessionId);
    },
    [storageKey],
  );

  const openSession = useCallback(
    async (
      sessionId: string,
      openOptions: OpenSessionOptions = {},
    ): Promise<OpenSessionResult> => {
      if (!sessionId) {
        setCurrentSessionId("");
        setSession(null);
        setMessages([]);
        setToolCalls([]);
        setSyncState("ready");
        return { ok: false, syncState: "ready" };
      }

      setCurrentSessionId(sessionId);
      setError(null);

      if (!openOptions.silent) {
        setIsLoadingSession(true);
      }

      try {
        const detail = await getAiSessionDetail(sessionId);
        logConversationDebug("openSession-detail", {
          sessionId,
          messageCount: detail.messages.length,
          messages: detail.messages,
        });
        setSession(detail.session);
        setMessages(detail.messages);
        setToolCalls(detail.toolCalls);
        setSyncState("ready");
        await persistSessionId(detail.session.id);
        await onSessionReady?.(detail.session);
        return { ok: true, syncState: "ready" };
      } catch (caughtError) {
        const nextSyncState = getAiConversationSyncState(caughtError);
        setSyncState(nextSyncState);

        if (nextSyncState === "degraded_missing_index") {
          if (openOptions.fallbackSession) {
            setSession(openOptions.fallbackSession);
          }

          setMessages([]);
          setToolCalls([]);
          setError(MISSING_INDEX_MESSAGE);
          return { ok: false, syncState: nextSyncState };
        }

        const nextError =
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo cargar la conversación";
        setError(nextError);
        return { ok: false, syncState: nextSyncState };
      } finally {
        setIsLoadingSession(false);
        setStreamStatus("");
      }
    },
    [onSessionReady, persistSessionId],
  );

  const startNewSession = useCallback(
    async (title = defaultTitle) => {
      if (createSessionInFlightRef.current) {
        return createSessionInFlightRef.current;
      }

      setError(null);
      setIsLoadingSession(true);
      setSyncState("ready");

      const inFlightPromise = (async () => {
        try {
          const createdSession = await createAiSession({ title });
          setCurrentSessionId(createdSession.id);
          setSession(createdSession);
          setMessages([]);
          setToolCalls([]);
          await persistSessionId(createdSession.id);
          await onSessionReady?.(createdSession);
          return createdSession.id;
        } finally {
          setIsLoadingSession(false);
          createSessionInFlightRef.current = null;
        }
      })();

      createSessionInFlightRef.current = inFlightPromise;
      return inFlightPromise;
    },
    [defaultTitle, onSessionReady, persistSessionId],
  );

  const ensureSession = useCallback(async () => {
    if (currentSessionId) {
      return currentSessionId;
    }

    return startNewSession();
  }, [currentSessionId, startNewSession]);

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || sendInFlightRef.current) {
        return null;
      }

      sendInFlightRef.current = true;

      const sessionId = await ensureSession();
      if (!sessionId) {
        sendInFlightRef.current = false;
        return null;
      }

      const optimisticMessage = buildTemporaryMessage(
        "user",
        trimmed,
        sessionId,
      );
      setMessages((currentMessages) => [...currentMessages, optimisticMessage]);
      logConversationDebug("sendMessage-start", {
        sessionId,
        message: trimmed,
      });
      setIsSending(true);
      setStreamStatus("processing");
      setError(null);

      let finalText = "";
      let hasFinalPayload = false;
      let streamError: Error | null = null;
      const activeSession = session;

      try {
        await sendAiMessageSse(
          { sessionId, message: trimmed },
          {
            onStatus: (payload) => {
              logConversationDebug("sendMessage-status", payload);
              setStreamStatus(payload.status);
            },
            onFinal: (payload) => {
              logConversationDebug("sendMessage-final", payload);
              finalText = payload.text;
              hasFinalPayload = true;
            },
            onError: (nextStreamError) => {
              logConversationDebug("sendMessage-stream-error", {
                message: nextStreamError.message,
                code: nextStreamError.code,
              });
              streamError = nextStreamError;
            },
          },
        );

        if (!hasFinalPayload) {
          try {
            const jsonResult = await sendAiMessageJson({
              sessionId,
              message: trimmed,
            });
            logConversationDebug("sendMessage-json-fallback", {
              sessionId,
              hasStreamError: Boolean(streamError),
              textLength: jsonResult.text.length,
            });
            finalText = jsonResult.text;
            hasFinalPayload = true;
          } catch (fallbackError) {
            if (streamError) {
              throw streamError;
            }
            throw fallbackError;
          }
        }

        logConversationDebug("sendMessage-after-stream", {
          sessionId,
          hasFinalPayload,
          finalText,
        });

        if (hasFinalPayload && finalText) {
          setMessages((currentMessages) => {
            const nextMessages = mergeAssistantReply(
              currentMessages,
              sessionId,
              finalText,
            );
            logConversationDebug("sendMessage-after-local-append", {
              sessionId,
              messageCount: nextMessages.length,
              messages: nextMessages,
            });
            return nextMessages;
          });
        }

        const syncResult = await openSession(sessionId, {
          silent: true,
          fallbackSession: activeSession ?? session ?? undefined,
        });
        logConversationDebug("sendMessage-after-sync", {
          sessionId,
          syncState: syncResult.syncState,
        });

        if (hasFinalPayload && finalText) {
          setMessages((currentMessages) => {
            const nextMessages = mergeAssistantReply(
              currentMessages,
              sessionId,
              finalText,
            );
            logConversationDebug("sendMessage-after-sync-merge", {
              sessionId,
              messageCount: nextMessages.length,
              messages: nextMessages,
            });
            return nextMessages;
          });
        }

        if (syncResult.syncState === "degraded_missing_index") {
          setSyncState("degraded_missing_index");
          setError(MISSING_INDEX_MESSAGE);
        }

        await onAfterSend?.(sessionId);
        return sessionId;
      } catch (caughtError) {
        logConversationDebug("sendMessage-catch", caughtError);
        const nextError =
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo enviar el mensaje";

        const userFacingError =
          caughtError instanceof Error && isAiStreamingConfigError(caughtError)
            ? "El servidor AI tiene una configuración de streaming pendiente. Intenta de nuevo en unos minutos."
            : nextError;

        if (isFirestoreIndexError(caughtError)) {
          setSyncState("degraded_missing_index");
          setError(MISSING_INDEX_MESSAGE);
          return sessionId;
        }

        setError(userFacingError);
        setMessages((currentMessages) => [
          ...currentMessages,
          buildTemporaryMessage(
            "assistant",
            "No pude responder en este momento. Intenta de nuevo.",
            sessionId,
          ),
        ]);
        return null;
      } finally {
        sendInFlightRef.current = false;
        setIsSending(false);
        setStreamStatus("");
      }
    },
    [ensureSession, onAfterSend, openSession, session],
  );

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }

    const storedSessionId = window.sessionStorage.getItem(storageKey);
    if (storedSessionId) {
      void openSession(storedSessionId);
    }
  }, [openSession, storageKey]);

  return {
    currentSessionId,
    session,
    messages,
    toolCalls,
    isLoadingSession,
    isSending,
    streamStatus,
    error,
    syncState,
    openSession,
    sendMessage,
    startNewSession,
    ensureSession,
    setError,
  };
}
