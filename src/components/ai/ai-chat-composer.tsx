"use client";

import { useState } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type QuickPrompt = {
  label: string;
  prompt: string;
};

type AiChatComposerProps = {
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
  quickPrompts?: QuickPrompt[];
  onSubmit: (message: string) => Promise<void> | void;
};

export function AiChatComposer({
  disabled = false,
  isSending = false,
  placeholder = "Escribe tu mensaje...",
  quickPrompts = [],
  onSubmit,
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
    <div className="space-y-3">
      {quickPrompts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((quickPrompt) => (
            <Button
              key={quickPrompt.label}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isSending}
              onClick={() => void submitMessage(quickPrompt.prompt)}
            >
              {quickPrompt.label}
            </Button>
          ))}
        </div>
      ) : null}

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submitMessage(message);
        }}
      >
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={3}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={disabled || isSending || !message.trim()}>
            <SendHorizonal className="mr-2 h-4 w-4" />
            {isSending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
