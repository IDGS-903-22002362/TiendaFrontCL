"use client";

import { AiMessageThread } from "@/components/ai/ai-message-thread";
import type { AiMessageThreadProps } from "@/components/ai/ai-message-thread";

export function AssistantMessages(props: AiMessageThreadProps) {
  return <AiMessageThread {...props} />;
}
