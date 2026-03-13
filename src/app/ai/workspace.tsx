"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bot, History, Loader2, Plus, Sparkles, TriangleAlert } from "lucide-react";
import {
  getTryOnDownloadLink,
  listAiSessions,
  listTryOnJobs,
} from "@/lib/api/ai";
import { fetchProducts } from "@/lib/api/storefront";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { AiSession, TryOnJob } from "@/lib/ai/types";
import type { Product } from "@/lib/types";
import { useAiConversation } from "@/hooks/use-ai-conversation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AiChatComposer } from "@/components/ai/ai-chat-composer";
import { AiMessageThread } from "@/components/ai/ai-message-thread";
import { AiTryOnPanel } from "@/components/ai/ai-try-on-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AiWorkspace() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [jobs, setJobs] = useState<TryOnJob[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(false);
  const conversation = useAiConversation({
    defaultTitle: "Nueva conversacion AI",
    storageKey: isAuthenticated ? "ai-global-session" : undefined,
    onSessionReady: async () => {
      await refreshSessions();
    },
    onAfterSend: async () => {
      await refreshSessions();
    },
  });
  const { currentSessionId, openSession } = conversation;

  const refreshSessions = useCallback(async () => {
    if (!isAuthenticated) {
      setSessions([]);
      return;
    }

    setIsLoadingSidebar(true);

    try {
      const data = await listAiSessions();
      setSessions(data);
    } catch (caughtError) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar las sesiones AI",
        description: getApiErrorMessage(caughtError),
      });
    } finally {
      setIsLoadingSidebar(false);
    }
  }, [isAuthenticated, toast]);

  const refreshTryOnJobs = useCallback(async () => {
    if (!isAuthenticated) {
      setJobs([]);
      return;
    }

    try {
      const data = await listTryOnJobs();
      setJobs(data);
    } catch (caughtError) {
      toast({
        variant: "destructive",
        title: "No se pudo cargar el historial de try-on",
        description: getApiErrorMessage(caughtError),
      });
    }
  }, [isAuthenticated, toast]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void refreshSessions();
    void refreshTryOnJobs();
    void fetchProducts().then(setProducts).catch(() => setProducts([]));
  }, [isAuthenticated, refreshSessions, refreshTryOnJobs]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const requestedSessionId = searchParams.get("sessionId");
    if (requestedSessionId) {
      void openSession(requestedSessionId);
    }
  }, [isAuthenticated, openSession, searchParams]);

  useEffect(() => {
    if (!isAuthenticated || currentSessionId || sessions.length === 0) {
      return;
    }

    void openSession(sessions[0].id);
  }, [currentSessionId, isAuthenticated, openSession, sessions]);

  async function handleSendMessage(message: string) {
    try {
      await conversation.sendMessage(message);
    } catch (caughtError) {
      toast({
        variant: "destructive",
        title: "No se pudo enviar el mensaje",
        description: getApiErrorMessage(caughtError),
      });
    }
  }

  async function handleDownload(jobId: string) {
    try {
      const data = await getTryOnDownloadLink(jobId);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (caughtError) {
      toast({
        variant: "destructive",
        title: "No se pudo abrir la descarga",
        description: getApiErrorMessage(caughtError),
      });
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 text-sm text-muted-foreground">
        Verificando sesión AI...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Módulo AI
            </CardTitle>
            <CardDescription>
              Necesitas iniciar sesión para recuperar sesiones, chatear con el
              agente y usar virtual try-on.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/login?redirect=%2Fai">Iniciar sesión</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products">Ir al catálogo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            AI Workspace
          </p>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Asistente y Virtual Try-On
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Gestiona tus sesiones, conversa con el agente y genera resultados de
            try-on desde un solo lugar.
          </p>
        </div>
        <Button
          onClick={() => void conversation.startNewSession("Nueva conversacion AI")}
          disabled={conversation.isLoadingSession}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva sesión
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-4 w-4 text-primary" />
              Sesiones
            </CardTitle>
            <CardDescription>
              Historial reciente del chat AI persistido en backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingSidebar ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando sesiones...
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Aún no tienes sesiones. Crea una nueva conversación para empezar.
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => void conversation.openSession(session.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                    session.id === conversation.currentSessionId
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/40"
                  }`}
                >
                  <p className="font-medium">{session.title}</p>
                  {session.summary ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {session.summary}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Actualizada {formatDateTime(session.updatedAt)}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="tryon">Try-On</TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Conversación activa
                </CardTitle>
                <CardDescription>
                  {conversation.session
                    ? conversation.session.title
                    : "Selecciona una sesión o inicia una nueva."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {conversation.syncState === "degraded_missing_index" ? (
                  <Alert>
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Historial temporalmente no disponible</AlertTitle>
                    <AlertDescription>
                      La conversación activa sigue funcionando, pero el backend
                      aún no puede reconstruir mensajes previos porque falta un
                      índice Firestore en AI Sessions.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <AiMessageThread
                  messages={conversation.messages}
                  toolCalls={conversation.toolCalls}
                  isLoading={conversation.isLoadingSession}
                  streamStatus={conversation.streamStatus}
                  className="h-[420px]"
                  emptyTitle="Asistente listo"
                  emptyDescription="Haz preguntas sobre catálogo, recomendaciones, disponibilidad o estilo."
                />

                {conversation.error ? (
                  <p className="text-sm text-destructive">{conversation.error}</p>
                ) : null}

                <AiChatComposer
                  isSending={conversation.isSending}
                  disabled={conversation.isLoadingSession}
                  quickPrompts={[
                    {
                      label: "Jerseys negros",
                      prompt: "Buscame jerseys negros disponibles en talla M",
                    },
                    {
                      label: "Outfit partido",
                      prompt:
                        "Recomiéndame un outfit completo para ir al estadio este fin de semana",
                    },
                    {
                      label: "Promociones",
                      prompt: "¿Qué productos en oferta me recomiendas hoy?",
                    },
                  ]}
                  onSubmit={handleSendMessage}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tryon" className="space-y-4">
            <AiTryOnPanel
              sessionId={conversation.currentSessionId || undefined}
              ensureSession={conversation.ensureSession}
              products={products}
              allowProductSelection
              onJobCreated={refreshTryOnJobs}
              onJobCompleted={refreshTryOnJobs}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historial de try-ons</CardTitle>
                <CardDescription>
                  Últimos resultados asociados a tu cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {jobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    Aún no tienes jobs de try-on.
                  </div>
                ) : (
                  jobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-2xl border bg-background/70 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{job.productId}</p>
                          <p className="text-sm text-muted-foreground">
                            Estado: {job.status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(job.createdAt)}
                          </p>
                          {job.errorMessage ? (
                            <p className="mt-1 text-sm text-destructive">
                              {job.errorMessage}
                            </p>
                          ) : null}
                        </div>
                        {job.status === "completed" ? (
                          <Button
                            variant="outline"
                            onClick={() => void handleDownload(job.id)}
                          >
                            Descargar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
