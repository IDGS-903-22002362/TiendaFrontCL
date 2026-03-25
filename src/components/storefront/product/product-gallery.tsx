"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductGallery({ product }: { product: Product }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const images = useMemo(
    () => (product.images.length > 0 ? product.images : ["/images/leon.png"]),
    [product.images],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[88px_minmax(0,1fr)]">
      <div className="order-2 flex gap-2 overflow-x-auto lg:order-1 lg:flex-col">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className={cn(
              "relative aspect-square h-20 min-w-20 overflow-hidden rounded-[1.1rem] border bg-card transition-all",
              selectedIndex === index
                ? "border-primary shadow-[var(--shadow-card)]"
                : "border-border hover:border-primary/35",
            )}
          >
            <Image src={image} alt={`${product.name} miniatura ${index + 1}`} fill className="object-cover" />
          </button>
        ))}
      </div>

      <div className="order-1 overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--shadow-elevated)] lg:order-2">
        <motion.div
          key={images[selectedIndex]}
          initial={{ opacity: 0.18, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative aspect-[4/5] w-full md:aspect-square lg:min-h-[620px]"
        >
          <Image
            src={images[selectedIndex]}
            alt={`${product.name} imagen ${selectedIndex + 1}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover"
          />
        </motion.div>
      </div>
    </div>
  );
}
