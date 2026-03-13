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

function stripTrailingPunctuation(url: string) {
  const match = url.match(/[.,!?;:]+$/);
  if (!match) {
    return { url, trailing: "" };
  }

  return {
    url: url.slice(0, -match[0].length),
    trailing: match[0],
  };
}

function tokenizeInlineText(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern =
    /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s]+)|(\*\*([^*]+)\*\*)/g;

  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const matchText = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      tokens.push({
        type: "text",
        value: text.slice(lastIndex, index),
      });
    }

    if (match[2] && match[3]) {
      tokens.push({
        type: "link",
        value: match[2],
        href: match[3],
      });
    } else if (match[4]) {
      const { url, trailing } = stripTrailingPunctuation(match[4]);
      tokens.push({
        type: "link",
        value: url,
        href: url,
      });
      if (trailing) {
        tokens.push({
          type: "text",
          value: trailing,
        });
      }
    } else if (match[6]) {
      tokens.push({
        type: "bold",
        value: match[6],
      });
    } else {
      tokens.push({
        type: "text",
        value: matchText,
      });
    }

    lastIndex = index + matchText.length;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return tokens;
}

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
      const item = listMatch[1].trim();
      if (item) {
        listItems.push(item);
      }
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function renderInlineContent(text: string) {
  return tokenizeInlineText(text).map((token, index) => {
    if (token.type === "bold") {
      return (
        <strong key={`${token.value}-${index}`} className="font-bold text-foreground">
          {token.value}
        </strong>
      );
    }

    if (token.type === "link") {
      return (
        <a
          key={`${token.href}-${index}`}
          href={token.href}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline underline-offset-4 transition-all"
        >
          {token.value}
        </a>
      );
    }

    return <Fragment key={`${token.value}-${index}`}>{token.value}</Fragment>;
  });
}

function renderMessageContent(content: string) {
  return parseMessageBlocks(content).map((block, blockIndex) => {
    if (block.type === "list") {
      return (
        <ul
          key={`list-${blockIndex}`}
          className="space-y-2 pl-4 list-disc text-sm sm:text-[15px]"
        >
          {block.items.map((item, itemIndex) => (
            <li key={`item-${itemIndex}`} className="leading-relaxed">
              {renderInlineContent(item)}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p
        key={`paragraph-${blockIndex}`}
        className="text-sm sm:text-[15px] leading-relaxed tracking-tight"
      >
        {renderInlineContent(block.text)}
      </p>
    );
  });
}

function renderImageAttachments(
  attachments: AiAttachment[] | undefined,
) {
  const imageAttachments = (attachments ?? []).filter(
    (attachment) => attachment.url && attachment.mimeType.startsWith("image/"),
  );

  if (imageAttachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2">
      {imageAttachments.map((attachment) => (
        <a
          key={attachment.assetId}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="group block overflow-hidden rounded-xl border border-border bg-muted/50 transition-all hover:border-primary/30"
        >
          <div className="aspect-video overflow-hidden">
            <img
              src={attachment.url}
              alt="Adjunto"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          </div>
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>{attachment.kind === "user_upload" ? "Tu imagen" : "Generado por IA"}</span>
            <span className="text-primary group-hover:underline">Ver completo</span>
          </div>
        </a>
      ))}
    </div>
  );
}

export function AiMessageThread({
  messages,
  toolCalls = [],
  isLoading = false,
  streamStatus,
  emptyTitle,
  emptyDescription,
  className,
  variant = "default",
  toolCallDisplay = "chips",
}: AiMessageThreadProps) {
  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="flex flex-col gap-6 p-6">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 rounded-3xl border border-dashed border-muted bg-muted/5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-8 w-8" />
            </div>
            <div className="space-y-1 px-6">
              <h3 className="font-headline text-xl font-bold">{emptyTitle}</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {emptyDescription}
              </p>
            </div>
          </div>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={cn(
                "flex w-full items-start gap-3",
                isUser ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg shadow-sm",
                isUser ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
              )}>
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className={cn(
                "flex flex-col gap-2 max-w-[85%]",
                isUser ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "rounded-2xl px-4 py-3 shadow-sm",
                  isUser 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-muted/50 border border-border text-foreground rounded-tl-none"
                )}>
                  <div className="space-y-3">{renderMessageContent(message.content)}</div>
                  {renderImageAttachments(message.attachments)}
                </div>
                
                {message.model && (
                  <span className="text-[10px] text-muted-foreground px-1 uppercase tracking-widest font-semibold opacity-50">
                    {message.model}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {streamStatus ? (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none bg-muted/50 border border-border px-4 py-3 text-sm flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-muted-foreground italic">
                {streamStatus === "processing" ? "Generando respuesta..." : streamStatus}
              </span>
            </div>
          </div>
        ) : null}

        {toolCalls.length > 0 && toolCallDisplay === "collapsible" && (
          <Collapsible className="mt-4 rounded-xl border border-muted bg-muted/5 overflow-hidden transition-all hover:border-primary/20">
            <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/10">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Procesamiento Inteligente
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-muted/50 px-4 py-3 bg-muted/10">
              <div className="flex flex-wrap gap-2">
                {toolCalls.map((toolCall) => (
                  <span
                    key={toolCall.id}
                    className="inline-flex items-center rounded-lg bg-background border border-border px-2.5 py-1 text-[10px] font-mono text-muted-foreground"
                  >
                    {toolCall.toolName}
                  </span>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </ScrollArea>
  );
}
