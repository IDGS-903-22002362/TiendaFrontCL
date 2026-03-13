"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot,
  History,
  LockKeyhole,
  MessageSquarePlus,
  TriangleAlert,
  MessageCircle,
  ChevronDown,
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
    { label: "Material", prompt: `¿De qué está hecho?` },
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
    <div className="fixed bottom-24 right-6 z-50 md:bottom-10 md:right-10 flex flex-col items-end gap-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="mb-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 origin-bottom-right">
          <ProductAssistantPanel variant="product-premium">
            <AssistantHeader
              variant="product-premium"
              title="Dungeon AI"
              description={`Asistente para ${product.name}`}
              icon={<Bot className="h-5 w-5" />}
              onClose={() => setIsOpen(false)}
              actions={
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => void conversation.startNewSession(`Consulta: ${product.name}`)}
                    title="Reiniciar chat"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </Button>
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Link href={aiWorkspaceHref} title="Ver historial">
                      <History className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              }
            />

            {isLoading ? (
              <div className="h-[400px] flex items-center justify-center p-8 text-xs text-muted-foreground animate-pulse">
                Sincronizando Dungeon AI...
              </div>
            ) : !isAuthenticated ? (
              <div className="h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-4">
                <LockKeyhole className="h-10 w-10 text-muted-foreground opacity-50" />
                <p className="text-sm font-medium">Inicia sesión para usar la IA</p>
                <Button asChild size="sm">
                  <Link href={`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`}>Entrar</Link>
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="chat" className="flex h-[450px] flex-col bg-background">
                <div className="border-b bg-background/50 px-4 py-1 backdrop-blur-sm">
                  <AssistantTabs
                    variant="product-premium"
                    className="border-none bg-transparent"
                    tabs={[
                      { value: "chat", label: "Consulta" },
                      { value: "tryon", label: "Try-On" },
                    ]}
                  />
                </div>

                <TabsContent value="chat" className="m-0 flex flex-1 flex-col overflow-hidden">
                  {conversation.syncState === "degraded_missing_index" && (
                    <div className="px-4 pt-2">
                      <Alert className="py-2 rounded-xl border-amber-200 bg-amber-50">
                        <AlertDescription className="text-[10px] text-amber-900 leading-tight">
                          Historial temporalmente limitado por mantenimiento.
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
                    emptyTitle="¡Hola! ¿En qué te ayudo?"
                    emptyDescription={`Pregúntame sobre ${product.name}.`}
                    variant="product-premium"
                    toolCallDisplay="collapsible"
                  />

                  <AssistantComposer
                    isSending={conversation.isSending}
                    disabled={conversation.isLoadingSession}
                    hasMessages={conversation.messages.length > 0}
                    placeholder="Escribe aquí..."
                    quickPrompts={quickPrompts}
                    onSubmit={handleSendMessage}
                    variant="product-premium"
                  />
                </TabsContent>

                <TabsContent value="tryon" className="m-0 flex flex-1 flex-col overflow-hidden">
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
              "h-14 w-14 rounded-full shadow-2xl transition-all duration-300",
              isOpen ? "rotate-180 bg-muted text-muted-foreground" : "bg-primary text-white scale-110"
            )}
          >
            {isOpen ? <ChevronDown className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </Button>
        </CollapsibleTrigger>
      </Collapsible>
    </div>
  );
}
