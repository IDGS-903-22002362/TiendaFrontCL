"use client";

import Link from "next/link";
import { Bot, History, LockKeyhole, MessageSquarePlus, TriangleAlert } from "lucide-react";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useAiConversation } from "@/hooks/use-ai-conversation";
import { AiChatComposer } from "@/components/ai/ai-chat-composer";
import { AiMessageThread } from "@/components/ai/ai-message-thread";
import { AiTryOnPanel } from "@/components/ai/ai-try-on-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProductQnA({ product }: { product: Product }) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const conversation = useAiConversation({
    defaultTitle: `Consulta sobre ${product.name}`,
    storageKey: isAuthenticated ? `ai-product-session:${product.id}` : undefined,
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

  const aiWorkspaceHref = conversation.currentSessionId
    ? `/ai?sessionId=${encodeURIComponent(conversation.currentSessionId)}`
    : "/ai";

  return (
    <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader className="border-b bg-background/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Bot className="h-6 w-6 text-primary" />
              Asistente AI del producto
            </CardTitle>
            <CardDescription className="mt-1">
              Consulta este producto en lenguaje natural y genera try-ons desde
              la misma experiencia.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void conversation.startNewSession(`Consulta sobre ${product.name}`)}
              disabled={!isAuthenticated || conversation.isLoadingSession}
            >
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Nueva conversación
            </Button>
            <Button asChild variant="secondary">
              <Link href={aiWorkspaceHref}>
                <History className="mr-2 h-4 w-4" />
                Abrir módulo AI
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">
            Verificando sesión...
          </div>
        ) : !isAuthenticated ? (
          <div className="space-y-4 p-6">
            <div className="rounded-2xl border border-dashed bg-muted/40 p-5">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <LockKeyhole className="h-4 w-4 text-primary" />
                Inicia sesión para usar el agente AI
              </div>
              <p className="text-sm text-muted-foreground">
                El backend AI requiere sesión autenticada. Puedes retomar la
                conversación y usar virtual try-on cuando entres con tu cuenta.
              </p>
            </div>
            <Button asChild>
              <Link href={`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`}>
                Iniciar sesión
              </Link>
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="chat" className="w-full">
            <div className="border-b px-6 pt-4">
              <TabsList className="grid w-full max-w-sm grid-cols-2">
                <TabsTrigger value="chat">Chat AI</TabsTrigger>
                <TabsTrigger value="tryon">Virtual Try-On</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="space-y-4 p-6">
              {conversation.syncState === "degraded_missing_index" ? (
                <Alert>
                  <TriangleAlert className="h-4 w-4" />
                  <AlertTitle>Historial temporalmente degradado</AlertTitle>
                  <AlertDescription>
                    El backend AI todavía requiere un índice Firestore para
                    rehidratar mensajes antiguos. Puedes seguir usando esta
                    conversación, pero el historial completo no estará
                    disponible hasta que el índice se publique.
                  </AlertDescription>
                </Alert>
              ) : null}

              <AiMessageThread
                messages={conversation.messages}
                toolCalls={conversation.toolCalls}
                isLoading={conversation.isLoadingSession}
                streamStatus={conversation.streamStatus}
                className="h-[360px]"
                emptyTitle="Haz tu primera pregunta"
                emptyDescription={`Pregunta por tallas, estilo, materiales o recomendaciones sobre ${product.name}.`}
              />

              {conversation.error ? (
                <p className="text-sm text-destructive">{conversation.error}</p>
              ) : null}

              <AiChatComposer
                isSending={conversation.isSending}
                disabled={conversation.isLoadingSession}
                placeholder={`Pregunta algo sobre ${product.name}...`}
                quickPrompts={quickPrompts}
                onSubmit={handleSendMessage}
              />
            </TabsContent>

            <TabsContent value="tryon" className="p-6">
              <AiTryOnPanel
                sessionId={conversation.currentSessionId || undefined}
                ensureSession={conversation.ensureSession}
                defaultProduct={product}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
