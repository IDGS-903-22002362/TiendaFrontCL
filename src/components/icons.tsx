import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/images/leon.png"
      alt="La Dungeon"
      width={500}
      height={500}
      className={cn(className)}
    />
  );
}
