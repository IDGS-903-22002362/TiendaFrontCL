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

  async function submitMessage(nextMessage: string) {
    const trimmed = nextMessage.trim();
    if (!trimmed || disabled || isSending) {
      return;
    }

    setMessage("");
    await onSubmit(trimmed);
  }

  return (
    <div className="border-t p-3 bg-muted/5">
      <div className="space-y-3">
        {quickPrompts.length > 0 && !hasMessages ? (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
            {quickPrompts.map((quickPrompt) => (
              <button
                key={quickPrompt.label}
                type="button"
                disabled={disabled || isSending}
                onClick={() => void submitMessage(quickPrompt.prompt)}
                className="whitespace-nowrap flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[10px] font-bold text-muted-foreground transition-all hover:border-primary/50 hover:text-primary"
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
          className="relative flex items-center gap-2"
        >
          <div className="relative flex-1 bg-background rounded-2xl border border-border focus-within:ring-2 focus-within:ring-primary/20 transition-all">
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
              className="min-h-[40px] max-h-[100px] flex-1 resize-none border-0 bg-transparent px-4 py-2.5 text-xs focus-visible:ring-0"
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={disabled || isSending || !message.trim()}
            className="h-10 w-10 shrink-0 rounded-2xl shadow-lg"
          >
            {isSending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
