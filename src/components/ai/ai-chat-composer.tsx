"use client";

import { useState } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  placeholder = "Escribe tu mensaje...",
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

  if (variant === "product-premium") {
    return (
      <div className="border-t border-[#E6ECE6] bg-[#FBFCFB] px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-3">
          {quickPrompts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((quickPrompt) => (
                <button
                  key={quickPrompt.label}
                  type="button"
                  disabled={disabled || isSending}
                  onClick={() => void submitMessage(quickPrompt.prompt)}
                  className="rounded-full border border-[#E6ECE6] bg-white px-3.5 py-2 text-sm font-medium text-[#5F6B63] transition hover:border-[#CAD5CB] hover:bg-[#F6F8F6] hover:text-[#1C241F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B7A43] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
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
            className="rounded-[24px] border border-[#E6ECE6] bg-white p-2 shadow-[0_8px_24px_rgba(28,36,31,0.04)]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={placeholder}
                disabled={disabled || isSending}
                rows={3}
                className="min-h-[88px] resize-none border-0 bg-transparent px-3 py-2 text-[15px] leading-6 text-[#1C241F] placeholder:text-[#7B857E] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                disabled={disabled || isSending || !message.trim()}
                className="h-11 rounded-2xl bg-[#0B7A43] px-5 text-sm font-medium text-white hover:bg-[#096738] sm:min-w-[120px]"
              >
                <SendHorizonal className="h-4 w-4" />
                {isSending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
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
