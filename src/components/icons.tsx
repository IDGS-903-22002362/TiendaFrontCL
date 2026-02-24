import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Club_Le%C3%B3n_logo.svg/1029px-Club_Le%C3%B3n_logo.svg.png"
      alt="La Dungeon"
      width={1029}
      height={1200}
      className={cn(className)}
    />
  );
}
