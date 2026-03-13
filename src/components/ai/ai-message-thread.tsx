/* eslint-disable @next/next/no-img-element */
"use client";

import { Fragment } from "react";
import { ChevronDown, Loader2, Sparkles, User, Bot } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AiAttachment, AiMessage, AiToolCall } from "@/lib/ai/types";

type MessageBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "link"; value: string; href: string };

export type AiMessageThreadProps = {
  messages: AiMessage[];
  toolCalls?: AiToolCall[];
  isLoading?: boolean;
  streamStatus?: string;
  emptyTitle: string;
  emptyDescription: string;
  className?: string;
  variant?: "default" | "product-premium";
  toolCallDisplay?: "chips" | "collapsible";
};

function parseMessageBlocks(content: string): MessageBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MessageBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join(" ").replace(/\s+/g, " ").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
    }
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const listMatch = line.match(/^[*-]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1].trim());
      continue;
    }
    flushList();
    paragraphLines.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

function renderMessageContent(content: string) {
  return parseMessageBlocks(content).map((block, blockIndex) => {
    if (block.type === "list") {
      return (
        <ul key={`list-${blockIndex}`} className="space-y-1.5 pl-4 list-disc text-[13px] leading-relaxed">
          {block.items.map((item, itemIndex) => (
            <li key={`item-${itemIndex}`}>{item}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={`paragraph-${blockIndex}`} className="text-[13px] leading-relaxed tracking-tight">
        {block.text}
      </p>
    );
  });
}

export function AiMessageThread({
  messages,
  isLoading = false,
  streamStatus,
  emptyTitle,
  emptyDescription,
  className,
}: AiMessageThreadProps) {
  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="flex flex-col gap-4 p-4">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 opacity-60">
            <Sparkles className="h-6 w-6 text-primary" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold">{emptyTitle}</h3>
              <p className="text-[11px] max-w-[180px] mx-auto">{emptyDescription}</p>
            </div>
          </div>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={cn("flex w-full items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}
            >
              <div className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold shadow-sm",
                isUser ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
              )}>
                {isUser ? "TÚ" : <Bot className="h-3 w-3" />}
              </div>
              <div className={cn(
                "rounded-2xl px-3 py-2 max-w-[85%] shadow-sm",
                isUser 
                  ? "bg-primary text-primary-foreground rounded-br-none" 
                  : "bg-muted/50 border border-border text-foreground rounded-bl-none"
              )}>
                <div className="space-y-2">{renderMessageContent(message.content)}</div>
              </div>
            </div>
          );
        })}

        {streamStatus ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground animate-pulse ml-8">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{streamStatus === "processing" ? "Dungeon AI pensando..." : streamStatus}</span>
          </div>
        ) : null}
      </div>
    </ScrollArea>
  );
}
