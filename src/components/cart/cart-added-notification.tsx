"use client";

import type { SyntheticEvent } from "react";
import { AppNotificationLayout } from "@/components/ui/app-notification";

type CartAddedNotificationProps = {
  title: string;
  description?: string;
  onDismiss: () => void;
};

export function CartAddedNotification({
  title,
  description,
  onDismiss,
}: CartAddedNotificationProps) {
  const stop = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className="pointer-events-auto fixed bottom-4 right-4 z-[80] w-[min(100vw-2rem,22rem)]"
      onClick={stop}
      onMouseDown={stop}
      onPointerDown={stop}
    >
      <AppNotificationLayout
        variant="success"
        title={title}
        description={description}
        onDismiss={onDismiss}
      />
    </div>
  );
}
