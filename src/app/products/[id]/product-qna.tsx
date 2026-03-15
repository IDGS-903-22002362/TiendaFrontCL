"use client";

import { useState } from "react";
import Link from "next/link";
import {
  History,
  LockKeyhole,
  MessageSquarePlus,
  MessageCircle,
  ChevronDown,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useAiConversation } from "@/hooks/use-ai-conversation";
import { AssistantComposer } from "@/components/ai/assistant-composer";
import { AssistantHeader } from "@/components/ai/assistant-header";
import { AssistantMessages } from "@/components/ai/assistant-messages";
import { AssistantTabs } from "@/components/ai/assistant-tabs";
import { AiBotAvatar } from "@/components/ai/ai-bot-avatar";
import { AiTryOnPanel } from "@/components/ai/ai-try-on-panel";
import { ProductAssistantPanel } from "@/components/ai/product-assistant-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  buildProductContextMessage,
  messageContainsProductContext,
} from "@/lib/ai/message-content";
import { cn } from "@/lib/utils";
import type { AiMessage } from "@/lib/ai/types";

export function ProductQnA({ product }: { product: Product }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [tryOnMessages, setTryOnMessages] = useState<AiMessage[]>([]);
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const conversation = useAiConversation({
    defaultTitle: `Consulta sobre ${product.name}`,
    storageKey: isAuthenticated
      ? `ai-product-session:${product.id}`
      : undefined,
  });

  const quickPrompts = [
    { label: "Stock", prompt: `¿Qué disponibilidad tiene ${product.name}?` },
    { label: "Tallas", prompt: `¿Qué tallas me recomiendas?` },
  ];
  const sessionHasActiveProductContext = conversation.messages.some((message) =>
    messageContainsProductContext(message.content, product.id),
  );

  async function handleSendMessage(message: string) {
    try {
      await conversation.sendMessage(
        sessionHasActiveProductContext
          ? message
          : {
              text: buildProductContextMessage(product, message),
              displayText: message,
            },
      );
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

  const chatMessages = [...conversation.messages, ...tryOnMessages].sort(
    (a, b) => {
      const left = a.createdAt ? Date.parse(a.createdAt) : 0;
      const right = b.createdAt ? Date.parse(b.createdAt) : 0;
      return left - right;
    },
  );

  return (
    <div className="fixed left-auto right-4 z-50 flex flex-col items-end gap-3 bottom-[calc(var(--product-mobile-cta-height)+1rem)] md:bottom-8 md:right-8">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="mb-3 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 origin-bottom-right">
          <ProductAssistantPanel
            variant="product-premium"
            className="h-[min(78dvh,760px)] max-h-[calc(100dvh-6rem)] w-[min(calc(100vw-1.5rem),400px)] max-w-[calc(100vw-1.5rem)] md:w-[400px]"
          >
            <AssistantHeader
              variant="product-premium"
              title="Asistente León"
              description={`${product.name}`}
              icon={<AiBotAvatar imageClassName="object-contain p-1" />}
              onClose={() => setIsOpen(false)}
              actions={
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() =>
                      void conversation.startNewSession(
                        `Consulta: ${product.name}`,
                      )
                    }
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                  >
                    <Link href={aiWorkspaceHref}>
                      <History className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              }
            />

            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center p-8 text-xs text-muted-foreground animate-pulse">
                Sincronizando...
              </div>
            ) : !isAuthenticated ? (
              <div className="h-[300px] flex flex-col items-center justify-center p-8 text-center space-y-4">
                <LockKeyhole className="h-8 w-8 text-muted-foreground opacity-40" />
                <p className="text-xs font-medium text-muted-foreground">
                  Inicia sesión para usar la IA
                </p>
                <Button asChild size="sm" className="rounded-xl px-6">
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`}
                  >
                    Entrar
                  </Link>
                </Button>
              </div>
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div className="border-b border-border bg-background-deep/55 px-4 py-2">
                  <AssistantTabs
                    variant="default"
                    className="h-10 w-full max-w-none"
                    tabs={[
                      { value: "chat", label: "Consulta" },
                      { value: "tryon", label: "Try-On" },
                    ]}
                  />
                </div>

                <TabsContent
                  value="chat"
                  className="m-0 overflow-hidden bg-background data-[state=active]:flex data-[state=active]:min-h-0 data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=inactive]:hidden"
                >
                  {conversation.syncState === "degraded_missing_index" && (
                    <div className="px-4 pt-2">
                      <Alert className="rounded-xl border-warning/30 bg-warning/10 py-1.5">
                        <AlertDescription className="text-[10px] leading-tight text-warning">
                          Historial limitado por mantenimiento.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <AssistantMessages
                    messages={chatMessages}
                    toolCalls={conversation.toolCalls}
                    isLoading={conversation.isLoadingSession}
                    streamStatus={conversation.streamStatus}
                    className="flex-1 min-h-0"
                    emptyTitle="¡Hola!"
                    emptyDescription={`Pregúntame sobre este producto.`}
                    variant="product-premium"
                  />

                  <AssistantComposer
                    isSending={conversation.isSending}
                    disabled={conversation.isLoadingSession}
                    hasMessages={chatMessages.length > 0}
                    placeholder="Escribe tu duda..."
                    quickPrompts={quickPrompts}
                    onSubmit={handleSendMessage}
                    variant="product-premium"
                  />
                </TabsContent>

                <TabsContent
                  value="tryon"
                  className="m-0 overflow-hidden bg-background data-[state=active]:flex data-[state=active]:min-h-0 data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=inactive]:hidden"
                >
                  <AiTryOnPanel
                    sessionId={conversation.currentSessionId || undefined}
                    ensureSession={conversation.ensureSession}
                    defaultProduct={product}
                    onResultReady={({ message }) => {
                      setTryOnMessages((currentMessages) => {
                        const exists = currentMessages.some(
                          (entry) => entry.id === message.id,
                        );
                        if (exists) {
                          return currentMessages;
                        }

                        return [...currentMessages, message];
                      });
                      setActiveTab("chat");
                    }}
                    variant="product-premium"
                  />
                </TabsContent>
              </Tabs>
            )}
          </ProductAssistantPanel>
        </CollapsibleContent>

        <CollapsibleTrigger asChild>
          <Button
            size="lg"
            className={cn(
              "h-12 w-12 rounded-full shadow-xl transition-all duration-300",
              isOpen
                ? "rotate-180 bg-muted text-text-secondary"
                : "bg-primary text-primary-foreground",
            )}
          >
            {isOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <MessageCircle className="h-5 w-5" />
            )}
          </Button>
        </CollapsibleTrigger>
      </Collapsible>
    </div>
  );
}
