"use client";

import Link from "next/link";
import {
  Bot,
  History,
  LockKeyhole,
  MessageSquarePlus,
  TriangleAlert,
  Sparkles,
} from "lucide-react";
import type { TryOnJob } from "@/lib/ai/types";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useAiConversation } from "@/hooks/use-ai-conversation";
import { AssistantComposer } from "@/components/ai/assistant-composer";
import { AssistantHeader } from "@/components/ai/assistant-header";
import { AssistantMessages } from "@/components/ai/assistant-messages";
import { AssistantTabs } from "@/components/ai/assistant-tabs";
import { AiTryOnPanel } from "@/components/ai/ai-try-on-panel";
import { ProductAssistantPanel } from "@/components/ai/product-assistant-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";

export function ProductQnA({ product }: { product: Product }) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const conversation = useAiConversation({
    defaultTitle: `Consulta sobre ${product.name}`,
    storageKey: isAuthenticated
      ? `ai-product-session:${product.id}`
      : undefined,
  });

  const quickPrompts = [
    {
      label: "Disponibilidad",
      prompt: `¿Qué disponibilidad y tallas tiene ${product.name}?`,
    },
    {
      label: "Materiales",
      prompt: `¿De qué materiales está hecho ${product.name}?`,
    },
    {
      label: "Combínalo",
      prompt: `Recomiéndame cómo combinar ${product.name} para un día de partido.`,
    },
  ];

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

  async function handleTryOnResult({
    job,
  }: {
    imageUrl: string;
    job: TryOnJob;
  }) {
    toast({
      title: "¡Virtual Try-On listo!",
      description: "Desliza a la pestaña de Try-On para ver el resultado.",
    });
  }

  const aiWorkspaceHref = conversation.currentSessionId
    ? `/ai?sessionId=${encodeURIComponent(conversation.currentSessionId)}`
    : "/ai";

  return (
    <ProductAssistantPanel
      variant="product-premium"
      className="mt-8 border-none bg-transparent"
    >
      <AssistantHeader
        variant="product-premium"
        title="Asistente Inteligente"
        description={`Todo sobre ${product.name} en segundos.`}
        icon={<Bot className="h-6 w-6" />}
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void conversation.startNewSession(
                  `Consulta sobre ${product.name}`,
                )
              }
              disabled={!isAuthenticated || conversation.isLoadingSession}
              className="h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider"
            >
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Reiniciar
            </Button>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider"
            >
              <Link href={aiWorkspaceHref}>
                <History className="mr-2 h-4 w-4" />
                Historial
              </Link>
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center p-12 text-sm text-muted-foreground animate-pulse">
          Sincronizando con La Dungeon AI...
        </div>
      ) : !isAuthenticated ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
            <LockKeyhole className="h-10 w-10" />
          </div>
          <div className="max-w-xs space-y-2">
            <h3 className="font-headline text-xl font-bold text-foreground">
              Acceso Restringido
            </h3>
            <p className="text-sm text-muted-foreground">
              Inicia sesión para desbloquear el Asistente y el Probador Virtual
              personalizado.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="rounded-2xl px-8 font-bold shadow-lg shadow-primary/20"
          >
            <Link
              href={`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`}
            >
              Iniciar Sesión Ahora
            </Link>
          </Button>
        </div>
      ) : (
        <Tabs
          defaultValue="chat"
          className="flex min-h-0 flex-1 flex-col bg-background"
        >
          <div className="border-b bg-background/50 px-6 py-2 backdrop-blur-sm">
            <AssistantTabs
              variant="product-premium"
              className="border-none bg-transparent p-0"
              tabs={[
                { value: "chat", label: "Consulta de Producto" },
                { value: "tryon", label: "Probador Virtual (Try-On)" },
              ]}
            />
          </div>

          <TabsContent
            value="chat"
            className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="flex min-h-0 flex-1 flex-col">
              {conversation.syncState === "degraded_missing_index" && (
                <div className="px-6 pt-4">
                  <Alert
                    variant="destructive"
                    className="rounded-2xl border-amber-200 bg-amber-50 text-amber-900"
                  >
                    <TriangleAlert className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-xs font-bold uppercase tracking-tighter">
                      Historial no disponible
                    </AlertTitle>
                    <AlertDescription className="text-xs opacity-80">
                      Estamos optimizando la base de datos. El chat funciona,
                      pero no verás mensajes antiguos hoy.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <AssistantMessages
                messages={conversation.messages}
                toolCalls={conversation.toolCalls}
                isLoading={conversation.isLoadingSession}
                streamStatus={conversation.streamStatus}
                className="flex-1"
                emptyTitle="¡Hola! Soy tu asistente de La Dungeon"
                emptyDescription={`Pregúntame sobre la tela, el ajuste o cómo se ve ${product.name}.`}
                variant="product-premium"
                toolCallDisplay="collapsible"
              />

              {conversation.error && (
                <div className="px-6 pb-2">
                  <p className="rounded-xl bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
                    {conversation.error}
                  </p>
                </div>
              )}

              <AssistantComposer
                isSending={conversation.isSending}
                disabled={conversation.isLoadingSession}
                hasMessages={conversation.messages.length > 0}
                placeholder={`¿Qué te gustaría saber sobre ${product.name}?`}
                quickPrompts={quickPrompts}
                onSubmit={handleSendMessage}
                variant="product-premium"
              />
            </div>
          </TabsContent>

          <TabsContent
            value="tryon"
            className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <AiTryOnPanel
              sessionId={conversation.currentSessionId || undefined}
              ensureSession={conversation.ensureSession}
              defaultProduct={product}
              variant="product-premium"
              onResultReady={handleTryOnResult}
            />
          </TabsContent>
        </Tabs>
      )}
    </ProductAssistantPanel>
  );
}
