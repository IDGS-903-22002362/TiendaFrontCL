"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type AiBotAvatarProps = {
  className?: string;
  imageClassName?: string;
};

export function AiBotAvatar({
  className,
  imageClassName,
}: AiBotAvatarProps) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[inherit]",
        className,
      )}
    >
      <Image
        src="/images/boticon.gif"
        alt="Asistente León"
        fill
        unoptimized
        className={cn("object-cover", imageClassName)}
        sizes="40px"
      />
    </div>
  );
}
