/* eslint-disable @next/next/no-img-element */
"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AiAttachment, AiMessage, AiToolCall } from "@/lib/ai/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AiBotAvatar } from "@/components/ai/ai-bot-avatar";
import { stripProductContextFromMessage } from "@/lib/ai/message-content";

type MessageBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

type InlineToken =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string };

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

function isSafeHttpUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return (
      parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function splitTrailingUrlPunctuation(value: string) {
  const match = value.match(/^(.*?)([),.;:!?]+)?$/);
  return {
    url: match?.[1] ?? value,
    trailing: match?.[2] ?? "",
  };
}

function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      tokens.push({
        type: "text",
        value: text.slice(lastIndex, matchIndex),
      });
    }

    const markdownLabel = match[1];
    const markdownHref = match[2];
    const bareHref = match[3];

    if (markdownLabel && markdownHref && isSafeHttpUrl(markdownHref)) {
      tokens.push({
        type: "link",
        href: markdownHref,
        label: markdownLabel,
      });
      lastIndex = matchIndex + match[0].length;
      continue;
    }

    if (bareHref) {
      const { url, trailing } = splitTrailingUrlPunctuation(bareHref);
      if (isSafeHttpUrl(url)) {
        tokens.push({
          type: "link",
          href: url,
          label: url,
        });
        if (trailing) {
          tokens.push({ type: "text", value: trailing });
        }
      } else {
        tokens.push({ type: "text", value: match[0] });
      }
    } else {
      tokens.push({ type: "text", value: match[0] });
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return tokens;
}

function renderTextWithStrong(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      nodes.push(
        <span key={`${keyPrefix}-text-${lastIndex}`}>
          {text.slice(lastIndex, matchIndex)}
        </span>,
      );
    }

    nodes.push(
      <strong key={`${keyPrefix}-strong-${matchIndex}`} className="font-bold">
        {match[1]}
      </strong>,
    );
    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <span key={`${keyPrefix}-text-${lastIndex}`}>{text.slice(lastIndex)}</span>,
    );
  }

  return nodes.length > 0
    ? nodes
    : [<span key={`${keyPrefix}-text-0`}>{text}</span>];
}

function renderInlineContent(text: string): ReactNode[] {
  return parseInlineTokens(text).map((token, index) => {
    if (token.type === "text") {
      return (
        <span key={`text-${index}`}>
          {renderTextWithStrong(token.value, `text-${index}`)}
        </span>
      );
    }

    return (
      <a
        key={`link-${index}`}
        href={token.href}
        target="_blank"
        rel="noreferrer noopener"
        className="break-all underline underline-offset-2"
      >
        {renderTextWithStrong(token.label, `link-${index}`)}
      </a>
    );
  });
}

function parseMessageBlocks(content: string): MessageBlock[] {
  const normalizedContent = stripProductContextFromMessage(content);
  const lines = normalizedContent.replace(/\r\n/g, "\n").split("\n");
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
        <ul
          key={`list-${blockIndex}`}
          className="space-y-1.5 pl-4 list-disc text-[13px] leading-relaxed"
        >
          {block.items.map((item, itemIndex) => (
            <li key={`item-${itemIndex}`}>{renderInlineContent(item)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p
        key={`paragraph-${blockIndex}`}
        className="text-[13px] leading-relaxed tracking-tight"
      >
        {renderInlineContent(block.text)}
      </p>
    );
  });
}

function renderImageAttachments(
  attachments: AiAttachment[] | undefined,
  onOpenImage: (payload: { url: string; label: string }) => void,
) {
  if (!attachments?.length) {
    return null;
  }

  const imageAttachments = attachments.filter((attachment) => {
    if (!attachment.url) {
      return false;
    }

    if (attachment.mimeType.toLowerCase().startsWith("image/")) {
      return true;
    }

    return (
      attachment.kind === "output_image" || attachment.kind === "user_upload"
    );
  });

  if (imageAttachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {imageAttachments.map((attachment) => (
        <div
          key={attachment.assetId}
          className="overflow-hidden rounded-xl border border-border/70 bg-background/80"
        >
          <button
            type="button"
            className="w-full text-left"
            onClick={() =>
              onOpenImage({
                url: attachment.url || "",
                label:
                  attachment.kind === "user_upload"
                    ? "Imagen enviada"
                    : "Resultado Try-On",
              })
            }
          >
            <img
              src={attachment.url}
              alt="Imagen generada por IA"
              className="h-auto max-h-[420px] w-full object-contain"
              loading="lazy"
            />
          </button>
        </div>
      ))}
    </div>
  );
}

export function AiMessageThread({
  messages,
  isLoading = false,
  streamStatus,
  emptyTitle,
  emptyDescription,
  className,
}: AiMessageThreadProps) {
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    label: string;
  } | null>(null);

  return (
    <>
      <ScrollArea className={cn("h-full min-h-0", className)}>
        <div className="flex flex-col gap-4 p-4">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 opacity-60">
              <Sparkles className="h-6 w-6 text-primary" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold">{emptyTitle}</h3>
                <p className="text-[11px] max-w-[180px] mx-auto">
                  {emptyDescription}
                </p>
              </div>
            </div>
          ) : null}

          {messages.map((message) => {
            const isUser = message.role === "user";
            const hasImageAttachments = Boolean(
              message.attachments?.some(
                (attachment) =>
                  attachment.url &&
                  attachment.mimeType.toLowerCase().startsWith("image/"),
              ),
            );

            return (
              <div
                key={message.id}
                className={cn(
                  "flex w-full items-end gap-2",
                  isUser ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold shadow-xs",
                    isUser
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground overflow-hidden p-0",
                  )}
                >
                  {isUser ? "TÚ" : <AiBotAvatar imageClassName="object-cover" />}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 shadow-xs",
                    hasImageAttachments ? "max-w-[94%]" : "max-w-[85%]",
                    isUser
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted/50 border border-border text-foreground rounded-bl-none",
                  )}
                >
                  <div className="space-y-2">
                    {message.content
                      ? renderMessageContent(
                          message.displayContent ?? message.content,
                        )
                      : null}
                    {renderImageAttachments(
                      message.attachments,
                      setPreviewImage,
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {streamStatus ? (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground animate-pulse ml-8">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>
                {streamStatus === "processing"
                  ? "Asistente León pensando..."
                  : streamStatus}
              </span>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <Dialog
        open={Boolean(previewImage)}
        onOpenChange={(open) => !open && setPreviewImage(null)}
      >
        <DialogContent className="max-h-[92dvh] w-[94vw] max-w-4xl border-0 bg-black/90 p-2 text-white sm:p-3">
          <DialogTitle className="sr-only">
            Vista previa completa de imagen
          </DialogTitle>
          {previewImage ? (
            <div className="flex max-h-[86dvh] flex-col gap-2">
              <p className="px-2 text-center text-xs font-medium text-white/80">
                {previewImage.label}
              </p>
              <img
                src={previewImage.url}
                alt={previewImage.label}
                className="h-full max-h-[80dvh] w-full rounded-md object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

