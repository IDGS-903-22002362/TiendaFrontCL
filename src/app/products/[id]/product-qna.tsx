"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot,
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
import { AiTryOnPanel } from "@/components/ai/ai-try-on-panel";
import { ProductAssistantPanel } from "@/components/ai/product-assistant-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function ProductQnA({ product }: { product: Product }) {
  const [isOpen, setIsOpen] = useState(false);
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
    <div className="fixed bottom-24 right-6 z-50 md:bottom-8 md:right-8 flex flex-col items-end gap-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="mb-3 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 origin-bottom-right">
          <ProductAssistantPanel variant="product-premium" className="max-h-[min(580px,80vh)] w-[360px] md:w-[400px]">
            <AssistantHeader
              variant="product-premium"
              title="Dungeon AI"
              description={`${product.name}`}
              icon={<Bot className="h-4 w-4" />}
              onClose={() => setIsOpen(false)}
              actions={
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    onClick={() => void conversation.startNewSession(`Consulta: ${product.name}`)}
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                  </Button>
                  <Button asChild variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                    <Link href={aiWorkspaceHref}>
                      <History className="h-3.5 w-3.5" />
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
                <p className="text-xs font-medium text-muted-foreground">Inicia sesión para usar la IA</p>
                <Button asChild size="sm" className="rounded-xl px-6">
                  <Link href={`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`}>Entrar</Link>
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="chat" className="flex flex-1 flex-col overflow-hidden">
                <div className="bg-muted/30 px-4 py-2">
                  <AssistantTabs
                    variant="default"
                    className="h-9 w-full max-w-none"
                    tabs={[
                      { value: "chat", label: "Consulta" },
                      { value: "tryon", label: "Try-On" },
                    ]}
                  />
                </div>

                <TabsContent value="chat" className="m-0 flex flex-1 flex-col overflow-hidden bg-background">
                  {conversation.syncState === "degraded_missing_index" && (
                    <div className="px-4 pt-2">
                      <Alert className="py-1.5 rounded-xl border-amber-200 bg-amber-50">
                        <AlertDescription className="text-[10px] text-amber-900 leading-tight">
                          Historial limitado por mantenimiento.
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
                    emptyTitle="¡Hola!"
                    emptyDescription={`Pregúntame sobre este producto.`}
                    variant="product-premium"
                  />

                  <AssistantComposer
                    isSending={conversation.isSending}
                    disabled={conversation.isLoadingSession}
                    hasMessages={conversation.messages.length > 0}
                    placeholder="Escribe tu duda..."
                    quickPrompts={quickPrompts}
                    onSubmit={handleSendMessage}
                    variant="product-premium"
                  />
                </TabsContent>

                <TabsContent value="tryon" className="m-0 flex flex-1 flex-col overflow-hidden bg-background">
                  <AiTryOnPanel
                    sessionId={conversation.currentSessionId || undefined}
                    ensureSession={conversation.ensureSession}
                    defaultProduct={product}
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
              isOpen ? "rotate-180 bg-muted text-muted-foreground" : "bg-primary text-white"
            )}
          >
            {isOpen ? <ChevronDown className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
          </Button>
        </CollapsibleTrigger>
      </Collapsible>
    </div>
  );
}
