"use client";

import { Loader2, Sparkles, User } from "lucide-react";
import { Logo } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AiMessage, AiToolCall } from "@/lib/ai/types";

type AiMessageThreadProps = {
  messages: AiMessage[];
  toolCalls?: AiToolCall[];
  isLoading?: boolean;
  streamStatus?: string;
  emptyTitle: string;
  emptyDescription: string;
  className?: string;
};

export function AiMessageThread({
  messages,
  toolCalls = [],
  isLoading = false,
  streamStatus,
  emptyTitle,
  emptyDescription,
  className,
}: AiMessageThreadProps) {
  return (
    <ScrollArea className={className}>
      <div className="space-y-4 pr-4">
        {messages.length === 0 && !isLoading ? (
          <div className="rounded-2xl border border-dashed bg-muted/30 p-5 text-sm">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              {emptyTitle}
            </div>
            <p className="text-muted-foreground">{emptyDescription}</p>
          </div>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.role === "user" ? "justify-end" : ""
            }`}
          >
            {message.role !== "user" ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Logo className="h-6 w-auto" />
              </div>
            ) : null}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.model ? (
                <p className="mt-2 text-[11px] opacity-70">{message.model}</p>
              ) : null}
            </div>

            {message.role === "user" ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4" />
              </div>
            ) : null}
          </div>
        ))}

        {streamStatus ? (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Logo className="h-6 w-auto" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {streamStatus === "processing"
                  ? "Procesando tu mensaje..."
                  : streamStatus}
              </span>
            </div>
          </div>
        ) : null}

        {toolCalls.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {toolCalls.slice(-4).map((toolCall) => (
              <Badge key={toolCall.id} variant="secondary" className="rounded-full">
                {toolCall.toolName}: {toolCall.status}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </ScrollArea>
  );
}
