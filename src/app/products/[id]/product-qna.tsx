"use client";

import Link from "next/link";
import {
  Bot,
  History,
  LockKeyhole,
  MessageSquarePlus,
  TriangleAlert,
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
      label: "Combínalo",
      prompt: `Recomiéndame cómo combinar ${product.name} para día de partido.`,
    },
    {
      label: "Detalles",
      prompt: `Explícame las características más importantes de ${product.name}.`,
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
      title: "Try-on listo",
      description: `La imagen ${job.id.slice(0, 8)} ya está visible dentro del chat de try-on.`,
    });
  }

  const aiWorkspaceHref = conversation.currentSessionId
    ? `/ai?sessionId=${encodeURIComponent(conversation.currentSessionId)}`
    : "/ai";

  return (
    <ProductAssistantPanel variant="product-premium" className="bg-white">
      <AssistantHeader
        variant="product-premium"
        title="Asistente AI del producto"
        description="Consulta este producto en lenguaje natural y genera try-ons desde una experiencia más ligera y visual."
        icon={<Bot className="h-5 w-5" />}
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                void conversation.startNewSession(
                  `Consulta sobre ${product.name}`,
                )
              }
              disabled={!isAuthenticated || conversation.isLoadingSession}
              className="h-11 rounded-2xl border border-[#E6ECE6] bg-white px-4 text-sm font-medium text-[#1C241F] hover:bg-[#F6F8F6]"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Nueva conversación
            </Button>
            <Button
              asChild
              variant="ghost"
              className="h-11 rounded-2xl border border-transparent bg-[#F6F8F6] px-4 text-sm font-medium text-[#5F6B63] hover:bg-[#EEF3EE] hover:text-[#1C241F]"
            >
              <Link href={aiWorkspaceHref}>
                <History className="h-4 w-4" />
                Abrir módulo AI
              </Link>
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="px-5 py-6 text-sm text-[#5F6B63] sm:px-6">
          Verificando sesión...
        </div>
      ) : !isAuthenticated ? (
        <div className="space-y-4 px-5 py-6 sm:px-6">
          <div className="rounded-[24px] border border-dashed border-[#D8E2DA] bg-[#F7FAF7] p-5">
            <div className="mb-2 flex items-center gap-2 font-medium text-[#1C241F]">
              <LockKeyhole className="h-4 w-4 text-[#0B7A43]" />
              Inicia sesión para usar el asistente AI
            </div>
            <p className="text-sm leading-6 text-[#5F6B63]">
              El backend AI requiere sesión autenticada. Podrás retomar la
              conversación y usar virtual try-on al entrar con tu cuenta.
            </p>
          </div>
          <Button
            asChild
            className="h-11 rounded-2xl bg-[#0B7A43] px-5 text-white hover:bg-[#096738]"
          >
            <Link
              href={`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`}
            >
              Iniciar sesión
            </Link>
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col">
          <AssistantTabs
            variant="product-premium"
            tabs={[
              { value: "chat", label: "Chat AI" },
              { value: "tryon", label: "Virtual Try-On" },
            ]}
          />

          <TabsContent
            value="chat"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="flex min-h-0 flex-1 flex-col">
              {conversation.syncState === "degraded_missing_index" ? (
                <div className="px-4 pt-4 sm:px-5">
                  <Alert className="rounded-2xl border-[#E8D9AE] bg-[#FFF9E8] text-[#5E4A13]">
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Historial temporalmente degradado</AlertTitle>
                    <AlertDescription>
                      El backend AI todavía requiere un índice Firestore para
                      rehidratar mensajes antiguos. Puedes seguir usando esta
                      conversación, pero el historial completo no estará
                      disponible hasta que el índice se publique.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : null}

              <AssistantMessages
                messages={conversation.messages}
                toolCalls={conversation.toolCalls}
                isLoading={conversation.isLoadingSession}
                streamStatus={conversation.streamStatus}
                className="min-h-0 flex-1 px-4 py-4 sm:px-5"
                emptyTitle="Haz tu primera pregunta"
                emptyDescription={`Pregunta por tallas, estilo, materiales o recomendaciones sobre ${product.name}.`}
                variant="product-premium"
                toolCallDisplay="collapsible"
              />

              {conversation.error ? (
                <p className="px-4 pb-3 text-sm text-destructive sm:px-5">
                  {conversation.error}
                </p>
              ) : null}

              <AssistantComposer
                isSending={conversation.isSending}
                disabled={conversation.isLoadingSession}
                placeholder={`Pregunta algo sobre ${product.name}...`}
                quickPrompts={quickPrompts}
                onSubmit={handleSendMessage}
                variant="product-premium"
              />
            </div>
          </TabsContent>

          <TabsContent
            value="tryon"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
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
