import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/LOGOGRD.png"
      alt="Tienda Oficial del Club León La Guarida del León"
      width={500}
      height={500}
      className={cn(className)}
    />
  );
}
