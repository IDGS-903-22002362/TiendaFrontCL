/* eslint-disable @next/next/no-img-element */
"use client";

import { Fragment } from "react";
import { ChevronDown, Loader2, Sparkles, User } from "lucide-react";
import { Logo } from "@/components/icons";
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
        <strong key={`${token.value}-${index}`} className="font-semibold text-current">
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
          className="font-medium text-[#0B7A43] underline decoration-[#0B7A43]/30 underline-offset-4 transition hover:text-[#096738] hover:decoration-[#096738]"
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
          className="space-y-2.5 pl-0 text-[15px] leading-7 text-current"
        >
          {block.items.map((item, itemIndex) => (
            <li key={`item-${itemIndex}`} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0B7A43]/55" />
              <span>{renderInlineContent(item)}</span>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p
        key={`paragraph-${blockIndex}`}
        className="text-[15px] leading-7 tracking-[-0.01em] text-current"
      >
        {renderInlineContent(block.text)}
      </p>
    );
  });
}

function renderImageAttachments(
  attachments: AiAttachment[] | undefined,
  variant: "default" | "product-premium",
) {
  const imageAttachments = (attachments ?? []).filter(
    (attachment) => attachment.url && attachment.mimeType.startsWith("image/"),
  );

  if (imageAttachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-3">
      {imageAttachments.map((attachment) => (
        <a
          key={attachment.assetId}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "group block overflow-hidden rounded-2xl border transition",
            variant === "product-premium"
              ? "border-[#E6ECE6] bg-white"
              : "border-border bg-background",
          )}
        >
          <div className="aspect-[4/3] overflow-hidden bg-[#F6F8F6]">
            <img
              src={attachment.url}
              alt={
                attachment.kind === "user_upload"
                  ? "Imagen enviada por el usuario"
                  : "Resultado generado por AI"
              }
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.01]"
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-medium text-current">
              {attachment.kind === "user_upload" ? "Imagen enviada" : "Vista generada"}
            </span>
            <span className="text-[#5F6B63]">Abrir imagen</span>
          </div>
        </a>
      ))}
    </div>
  );
}

const premiumStyles = {
  empty: "rounded-3xl border border-dashed border-[#D8E2DA] bg-[#F7FAF7] px-5 py-5 text-[#5F6B63]",
  assistantAvatar:
    "h-9 w-9 rounded-2xl border border-[#E6ECE6] bg-white text-[#0B7A43]",
  userAvatar: "h-9 w-9 rounded-2xl bg-[#EEF3EE] text-[#5F6B63]",
  assistantBubble:
    "rounded-[24px] border border-[#E6ECE6] bg-white px-5 py-4 text-[#1C241F]",
  userBubble:
    "rounded-[24px] bg-[#1C241F] px-5 py-4 text-white shadow-[0_8px_20px_rgba(28,36,31,0.08)]",
  loadingBubble:
    "rounded-[24px] border border-[#E6ECE6] bg-[#F7FAF7] px-4 py-3 text-[#5F6B63]",
} as const;

const defaultStyles = {
  empty: "rounded-2xl border border-dashed bg-muted/30 p-5 text-sm",
  assistantAvatar: "h-9 w-9 rounded-full bg-primary/10 text-primary",
  userAvatar: "h-9 w-9 rounded-full bg-muted text-foreground",
  assistantBubble: "rounded-2xl bg-secondary px-4 py-3 text-foreground shadow-sm",
  userBubble:
    "rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-sm",
  loadingBubble: "rounded-2xl bg-secondary px-4 py-3 text-sm text-foreground",
} as const;

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
  const styles = variant === "product-premium" ? premiumStyles : defaultStyles;

  return (
    <ScrollArea className={cn("h-full min-h-0", className)}>
      <div className={cn("space-y-4", variant === "product-premium" ? "pr-4" : "pr-4")}>
        {messages.length === 0 && !isLoading ? (
          <div className={styles.empty}>
            <div className="mb-2 flex items-center gap-2 font-medium text-[#1C241F]">
              <Sparkles className="h-4 w-4 text-[#0B7A43]" />
              {emptyTitle}
            </div>
            <p className={variant === "product-premium" ? "text-sm leading-6" : "text-muted-foreground"}>
              {emptyDescription}
            </p>
          </div>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === "user";
          const isAssistant = !isUser;

          return (
            <div
              key={message.id}
              className={cn("flex items-end gap-3", isUser && "justify-end")}
            >
              {isAssistant ? (
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center",
                    styles.assistantAvatar,
                  )}
                >
                  <Logo className="h-5 w-auto" />
                </div>
              ) : null}

              <div
                className={cn(
                  "max-w-[min(42rem,85%)]",
                  isUser ? "order-1" : "order-none",
                )}
              >
                <div
                  className={cn(
                    "space-y-3",
                    isUser ? styles.userBubble : styles.assistantBubble,
                  )}
                >
                  <div className="space-y-3">{renderMessageContent(message.content)}</div>
                  {renderImageAttachments(message.attachments, variant)}
                  {message.model ? (
                    <p
                      className={cn(
                        "text-[11px]",
                        isUser ? "text-white/65" : "text-[#5F6B63]",
                      )}
                    >
                      {message.model}
                    </p>
                  ) : null}
                </div>
              </div>

              {isUser ? (
                <div
                  className={cn(
                    "order-2 flex shrink-0 items-center justify-center",
                    styles.userAvatar,
                  )}
                >
                  <User className="h-4 w-4" />
                </div>
              ) : null}
            </div>
          );
        })}

        {streamStatus ? (
          <div className="flex items-end gap-3">
            <div
              className={cn(
                "flex shrink-0 items-center justify-center",
                styles.assistantAvatar,
              )}
            >
              <Logo className="h-5 w-auto" />
            </div>
            <div className={cn("flex items-center gap-2.5", styles.loadingBubble)}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                {streamStatus === "processing"
                  ? "Procesando tu mensaje..."
                  : streamStatus}
              </span>
            </div>
          </div>
        ) : null}

        {toolCalls.length > 0 && toolCallDisplay === "chips" ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {toolCalls.slice(-4).map((toolCall) => (
              <span
                key={toolCall.id}
                className="rounded-full border border-[#E6ECE6] bg-[#F6F8F6] px-3 py-1 text-xs text-[#5F6B63]"
              >
                {toolCall.toolName}: {toolCall.status}
              </span>
            ))}
          </div>
        ) : null}

        {toolCalls.length > 0 && toolCallDisplay === "collapsible" ? (
          <Collapsible className="rounded-2xl border border-[#E6ECE6] bg-[#FBFCFB]">
            <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 text-left">
              <div>
                <p className="text-sm font-medium text-[#1C241F]">Detalles técnicos</p>
                <p className="text-xs text-[#5F6B63]">
                  {toolCalls.length} acciones ejecutadas por el agente
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-[#5F6B63] transition group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-[#E6ECE6] px-4 py-4">
              <div className="flex flex-wrap gap-2">
                {toolCalls.slice(-6).map((toolCall) => (
                  <span
                    key={toolCall.id}
                    className="rounded-full border border-[#E1E8E1] bg-white px-3 py-1 text-xs text-[#5F6B63]"
                  >
                    {toolCall.toolName}: {toolCall.status}
                  </span>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </ScrollArea>
  );
}
