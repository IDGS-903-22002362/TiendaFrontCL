"use client";

import { useRef, useState } from "react";
import { SendHorizonal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

type QuickPrompt = {
  label: string;
  prompt: string;
};

export type AiChatComposerProps = {
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
  quickPrompts?: QuickPrompt[];
  hasMessages?: boolean;
  onSubmit: (message: string) => Promise<void> | void;
  variant?: "default" | "product-premium";
};

export function AiChatComposer({
  disabled = false,
  isSending = false,
  placeholder = "Haz una pregunta...",
  quickPrompts = [],
  hasMessages = false,
  onSubmit,
  variant = "default",
}: AiChatComposerProps) {
  const [message, setMessage] = useState("");
  const inputFormRef = useRef<HTMLFormElement>(null);
  const isProductPremium = variant === "product-premium";

  const contextualPlaceholders =
    variant === "product-premium"
      ? [
          "¿Este producto tiene stock en mi talla?",
          "¿Qué talla me recomiendas según este modelo?",
          "¿Con qué otros productos combina este artículo?",
          "¿Qué tiempo de entrega tiene este producto?",
        ]
      : [
          "Buscame jerseys negros en talla M",
          "¿Qué productos en oferta me recomiendas hoy?",
          "Arma un outfit completo para el estadio",
          "¿Qué novedades llegaron esta semana?",
        ];

  const placeholders = [placeholder, ...contextualPlaceholders].filter(Boolean);

  async function submitMessage(nextMessage: string) {
    const trimmed = nextMessage.trim();
    if (!trimmed || disabled || isSending) {
      return;
    }

    window.setTimeout(() => {
      setMessage((currentValue) =>
        currentValue.trim() === trimmed ? "" : currentValue,
      );
    }, 220);

    await onSubmit(trimmed);
  }

  return (
    <div className="border-t bg-muted/5 p-3 sm:p-3">
      <div className="space-y-2.5">
        {quickPrompts.length > 0 && !hasMessages ? (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide no-scrollbar">
            {quickPrompts.map((quickPrompt) => (
              <button
                key={quickPrompt.label}
                type="button"
                disabled={disabled || isSending}
                onClick={() => void submitMessage(quickPrompt.prompt)}
                className="whitespace-nowrap flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[10px] font-bold text-muted-foreground transition-all hover:border-primary/50 hover:text-primary"
              >
                <Sparkles className="h-3 w-3" />
                {quickPrompt.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="relative flex items-center gap-2">
          <div
            className={`relative flex-1 rounded-2xl border transition-all focus-within:ring-2 focus-within:ring-primary/20 ${
              isProductPremium
                ? "border-primary/20 focus-within:border-primary/40 bg-[linear-gradient(90deg,rgba(10,130,66,0.035),rgba(18,18,18,0.94),rgba(10,130,66,0.02))]"
                : "border-border bg-background"
            }`}
          >
            <PlaceholdersAndVanishInput
              placeholders={placeholders}
              value={message}
              formRef={inputFormRef}
              onChange={(event) => setMessage(event.target.value)}
              onSubmit={(event) => {
                event.preventDefault();
                void submitMessage(message);
              }}
              disabled={disabled || isSending}
              hideSubmitButton
              className={`h-11 max-w-none rounded-2xl border-0 bg-transparent px-0 shadow-none ${
                isProductPremium ? "[&_input]:font-medium" : ""
              }`}
              inputClassName={`min-h-[44px] border-0 bg-transparent px-3.5 py-2.5 text-sm text-foreground focus-visible:ring-0 sm:pl-3.5 sm:pr-3.5 ${
                isProductPremium
                  ? "placeholder:text-muted-foreground/85"
                  : "placeholder:text-text-muted"
              }`}
              placeholderClassName={`pl-3.5 text-sm sm:pl-3.5 ${
                isProductPremium
                  ? "text-muted-foreground/95 font-medium tracking-[0.01em]"
                  : "text-text-muted"
              }`}
            />
          </div>
          <Button
            type="button"
            size="icon"
            onClick={() => inputFormRef.current?.requestSubmit()}
            disabled={disabled || isSending || !message.trim()}
            className={`h-11 w-11 shrink-0 rounded-2xl shadow-lg ${
              isProductPremium
                ? "bg-primary hover:bg-primary/90 shadow-primary/20"
                : ""
            }`}
          >
            {isSending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
