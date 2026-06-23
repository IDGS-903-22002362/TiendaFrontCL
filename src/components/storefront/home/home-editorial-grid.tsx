import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  HOME_EDITORIAL_GRID_TILES,
  type HomeEditorialGridTile,
} from "./home-editorial-grid.config";

function EditorialGridTile({ tile }: { tile: HomeEditorialGridTile }) {
  return (
    <Link
      href={tile.href}
      className="group relative isolate flex min-h-[50vh] flex-col justify-end overflow-hidden sm:min-h-0 sm:h-full"
    >
      <Image
        src={tile.imageSrc}
        alt={tile.imageAlt}
        fill
        sizes="(max-width: 640px) 100vw, 50vw"
        className="object-cover object-center transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.03] group-hover:brightness-[1.06]"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.12)_42%,rgba(0,0,0,0.62)_78%,rgba(0,0,0,0.82)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_88%,rgba(10,77,52,0.22),transparent_42%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative z-10 px-5 pb-6 pt-16 sm:px-7 sm:pb-8 lg:px-10 lg:pb-10">
        <p className="home-kicker text-white/62">{tile.eyebrow}</p>
        <h2 className="mt-3 max-w-[12ch] font-headline text-[2rem] font-semibold uppercase leading-[0.9] tracking-[0.03em] text-white sm:text-[2.35rem] lg:text-[2.75rem]">
          {tile.title}
        </h2>
        <span className="mt-5 inline-flex h-11 min-h-[44px] items-center gap-2 rounded-full border border-white/14 bg-white px-5 text-sm font-semibold text-foreground transition-[background-color,transform] duration-300 group-hover:-translate-y-px group-hover:bg-white/92">
          {tile.ctaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function HomeEditorialGrid() {
  return (
    <section
      className="w-full overflow-hidden"
      aria-label="Explora por colección"
    >
      <div className="grid grid-cols-1 gap-px bg-black/10 sm:min-h-screen sm:grid-cols-2 sm:grid-rows-2">
        {HOME_EDITORIAL_GRID_TILES.map((tile) => (
          <EditorialGridTile key={tile.id} tile={tile} />
        ))}
      </div>
    </section>
  );
}
