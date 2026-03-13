"use client";

import { useState } from "react";
import { SendHorizonal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type QuickPrompt = {
  label: string;
  prompt: string;
};

export type AiChatComposerProps = {
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
  quickPrompts?: QuickPrompt[];
  onSubmit: (message: string) => Promise<void> | void;
  variant?: "default" | "product-premium";
};

export function AiChatComposer({
  disabled = false,
  isSending = false,
  placeholder = "Haz una pregunta...",
  quickPrompts = [],
  onSubmit,
  variant = "default",
}: AiChatComposerProps) {
  const [message, setMessage] = useState("");

  async function submitMessage(nextMessage: string) {
    const trimmed = nextMessage.trim();
    if (!trimmed || disabled || isSending) {
      return;
    }

    setMessage("");
    await onSubmit(trimmed);
  }

  const isPremium = variant === "product-premium";

  return (
    <div className={cn(
      "border-t p-4 sm:p-6 transition-all",
      isPremium ? "bg-muted/10" : "bg-card"
    )}>
      <div className="mx-auto max-w-3xl space-y-4">
        {quickPrompts.length > 0 && messages.length === 0 ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {quickPrompts.map((quickPrompt) => (
              <button
                key={quickPrompt.label}
                type="button"
                disabled={disabled || isSending}
                onClick={() => void submitMessage(quickPrompt.prompt)}
                className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-muted-foreground transition-all hover:border-primary/50 hover:text-primary hover:shadow-sm disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" />
                {quickPrompt.label}
              </button>
            ))}
          </div>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitMessage(message);
          }}
          className={cn(
            "relative flex items-center rounded-2xl border bg-background p-1.5 transition-all focus-within:ring-2 focus-within:ring-primary/20",
            isSending ? "opacity-70" : "opacity-100"
          )}
        >
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitMessage(message);
              }
            }}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-4 py-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="submit"
            size="icon"
            disabled={disabled || isSending || !message.trim()}
            className="h-10 w-10 shrink-0 rounded-xl"
          >
            {isSending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <SendHorizonal className="h-5 w-5" />
            )}
            <span className="sr-only">Enviar mensaje</span>
          </Button>
        </form>
        
        <p className="text-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40">
          Inteligencia Artificial Dungeon v2.0
        </p>
      </div>
    </div>
  );
}
