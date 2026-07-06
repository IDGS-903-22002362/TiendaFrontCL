"use client";
import React, {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import {
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import Image, { ImageProps } from "next/image";
import Link from "next/link";
import { useOutsideClick } from "@/hooks/use-outside-click";

interface CarouselProps {
  items: React.ReactElement[];
  initialScroll?: number;
}

type Card = {
  src: string;
  title: string;
  category: string;
  content?: React.ReactNode;
};

export const CAROUSEL_CARD_WIDTH = {
  mobile: 280,
  desktop: 420,
} as const;

export const CAROUSEL_CARD_GAP = 20;

const CARD_CLIP_CLASSES =
  "apple-card-clip relative flex h-[360px] w-[280px] shrink-0 flex-col items-start justify-start overflow-hidden rounded-3xl bg-neutral-100 md:h-[480px] md:w-[420px] dark:bg-neutral-900";

const CARD_TOP_SCRIM_CLASSES =
  "pointer-events-none absolute inset-x-0 top-0 z-30 h-36 bg-gradient-to-b from-black/55 via-black/20 to-transparent md:h-44";

const CARD_BOTTOM_SCRIM_CLASSES =
  "pointer-events-none absolute inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t from-black/70 via-black/30 to-transparent md:h-32";

export const CarouselContext = createContext<{
  onCardClose: (index: number) => void;
  currentIndex: number;
}>({
  onCardClose: () => {},
  currentIndex: 0,
});

export const Carousel = ({ items, initialScroll = 0 }: CarouselProps) => {
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const getScrollStep = () => {
    const cardWidth = isMobile() ? CAROUSEL_CARD_WIDTH.mobile : CAROUSEL_CARD_WIDTH.desktop;
    return cardWidth + CAROUSEL_CARD_GAP;
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -getScrollStep(), behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: getScrollStep(), behavior: "smooth" });
    }
  };

  const handleCardClose = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = isMobile() ? CAROUSEL_CARD_WIDTH.mobile : CAROUSEL_CARD_WIDTH.desktop;
      const scrollPosition = (cardWidth + CAROUSEL_CARD_GAP) * (index + 1);
      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
      setCurrentIndex(index);
    }
  };

  const isMobile = () => {
    return window && window.innerWidth < 768;
  };

  return (
    <CarouselContext.Provider
      value={{ onCardClose: handleCardClose, currentIndex }}
    >
      <div className="relative w-full">
        <div
          className="flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-10 [scrollbar-width:none] md:py-20"
          ref={carouselRef}
          onScroll={checkScrollability}
        >
          <div
            className={cn(
              "absolute right-0 z-[1000] h-auto w-[5%] overflow-hidden bg-gradient-to-l",
            )}
          ></div>

          <div
            className={cn(
              "flex flex-row justify-start gap-5 pl-4 md:gap-6",
              "mx-auto max-w-7xl", // remove max-w-4xl if you want the carousel to span the full width of its container
            )}
          >
            {items.map((item, index) => (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    delay: 0.2 * index,
                    ease: "easeOut",
                  },
                }}
                key={"card" + index}
                className="apple-card-shell shrink-0 last:pr-[5%] md:last:pr-[33%]"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mr-10 flex justify-end gap-2">
          <button
            className="relative z-40 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 disabled:opacity-50"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
          >
            <IconArrowNarrowLeft className="h-6 w-6 text-gray-500" />
          </button>
          <button
            className="relative z-40 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 disabled:opacity-50"
            onClick={scrollRight}
            disabled={!canScrollRight}
          >
            <IconArrowNarrowRight className="h-6 w-6 text-gray-500" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
};

export type AppleCarouselCardVariant = "default" | "sale";

export const Card = ({
  card,
  index,
  layout = false,
  variant = "default",
  href,
  onClick,
  badge,
  footer,
  imageClassName,
}: {
  card: Card;
  index: number;
  layout?: boolean;
  variant?: AppleCarouselCardVariant;
  href?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  imageClassName?: string;
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose } = useContext(CarouselContext);

  const isLinkCard = Boolean(href);

  useEffect(() => {
    if (isLinkCard) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isLinkCard]);

  useOutsideClick(containerRef, () => {
    if (!isLinkCard) {
      handleClose();
    }
  });

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    onCardClose(index);
  };

  const isSaleVariant = variant === "sale";

  const cardFace = isSaleVariant ? (
    <>
      <div className="apple-card-bg apple-card-bg--sale absolute inset-0 z-0" aria-hidden="true" />
      <div className="apple-card-image-zone relative z-10 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <BlurImage
          src={card.src}
          alt={card.title}
          fill
          className={cn(
            "apple-card-product-image absolute inset-0 z-10 h-full w-full object-contain object-center transition-transform duration-500 ease-out group-hover:scale-[1.03] group-active:scale-[1.01]",
            imageClassName,
          )}
        />
        {badge ? <div className="absolute right-4 top-4 z-20 md:right-5 md:top-5">{badge}</div> : null}
      </div>
      <div className="apple-card-info-panel relative z-20 w-full shrink-0">
        <div className="apple-card-accent-line" aria-hidden="true" />
        <div className="px-5 pb-5 pt-4 md:px-6 md:pb-6 md:pt-5">
          <motion.p
            layoutId={layout ? `category-${card.category}` : undefined}
            className="text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/72"
          >
            {card.category}
          </motion.p>
          <motion.p
            layoutId={layout ? `title-${card.title}` : undefined}
            className="mt-1.5 line-clamp-2 text-left text-[1.02rem] font-semibold leading-[1.22] tracking-[-0.02em] text-foreground [text-wrap:balance] md:text-[1.12rem]"
          >
            {card.title}
          </motion.p>
          {footer ? <div className="mt-3">{footer}</div> : null}
        </div>
      </div>
      <div
        className="apple-card-hover-scrim pointer-events-none absolute inset-0 z-30 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-active:opacity-100"
        aria-hidden="true"
      />
    </>
  ) : (
    <>
      <div className="apple-card-bg absolute inset-0 z-0" aria-hidden="true" />
      <BlurImage
        src={card.src}
        alt={card.title}
        fill
        className={cn(
          "absolute inset-0 z-10 h-full w-full object-cover object-center",
          imageClassName,
        )}
      />
      <div
        className="apple-card-hover-scrim pointer-events-none absolute inset-0 z-20 bg-white/[0.03] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-active:opacity-100"
        aria-hidden="true"
      />
      <div className={cn(CARD_TOP_SCRIM_CLASSES, "z-30")} aria-hidden="true" />
      {footer ? <div className={cn(CARD_BOTTOM_SCRIM_CLASSES, "z-30")} aria-hidden="true" /> : null}
      {badge ? <div className="absolute right-5 top-5 z-40 md:right-6 md:top-6">{badge}</div> : null}
      <div className="relative z-40 p-6 md:p-7">
        <motion.p
          layoutId={layout ? `category-${card.category}` : undefined}
          className="text-left font-sans text-sm font-medium text-white md:text-base"
        >
          {card.category}
        </motion.p>
        <motion.p
          layoutId={layout ? `title-${card.title}` : undefined}
          className="mt-2 max-w-[16rem] text-left font-sans text-xl font-semibold [text-wrap:balance] text-white md:max-w-xs md:text-2xl"
        >
          {card.title}
        </motion.p>
      </div>
      {footer ? (
        <div className="relative z-40 mt-auto w-full p-5 pt-0 md:p-7 md:pt-0">{footer}</div>
      ) : null}
    </>
  );

  const cardClipClasses = cn(
    CARD_CLIP_CLASSES,
    isSaleVariant && "apple-card-clip--sale bg-card",
  );

  if (isLinkCard && href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-label={`Ver ${card.title}`}
        className={cn(
          cardClipClasses,
          "group outline-none focus-visible:outline-none",
        )}
      >
        {cardFace}
      </Link>
    );
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 h-screen overflow-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-lg"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={containerRef}
              layoutId={layout ? `card-${card.title}` : undefined}
              className="relative z-[60] mx-auto my-10 h-fit max-w-5xl rounded-3xl bg-white p-4 font-sans md:p-10 dark:bg-neutral-900"
            >
              <button
                className="sticky top-4 right-0 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-black dark:bg-white"
                onClick={handleClose}
              >
                <IconX className="h-6 w-6 text-neutral-100 dark:text-neutral-900" />
              </button>
              <motion.p
                layoutId={layout ? `category-${card.title}` : undefined}
                className="text-base font-medium text-black dark:text-white"
              >
                {card.category}
              </motion.p>
              <motion.p
                layoutId={layout ? `title-${card.title}` : undefined}
                className="mt-4 text-2xl font-semibold text-neutral-700 md:text-5xl dark:text-white"
              >
                {card.title}
              </motion.p>
              <div className="py-10">{card.content}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <motion.button
        layoutId={layout ? `card-${card.title}` : undefined}
        onClick={handleOpen}
        className={cn(cardClipClasses, "outline-none focus-visible:outline-none")}
      >
        {cardFace}
      </motion.button>
    </>
  );
};

export const BlurImage = ({
  height,
  width,
  src,
  className,
  alt,
  ...rest
}: ImageProps) => {
  const [isLoading, setLoading] = useState(true);
  return (
    <img
      className={cn(
        "h-full w-full transition-opacity duration-300",
        isLoading ? "opacity-0" : "opacity-100",
        className,
      )}
      onLoad={() => setLoading(false)}
      src={src as string}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      alt={alt ? alt : "Background of a beautiful view"}
      {...rest}
    />
  );
};
