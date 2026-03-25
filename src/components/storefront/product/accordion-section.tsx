import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type AccordionSectionItem = {
  value: string;
  title: string;
  content: ReactNode;
};

export function AccordionSection({ items }: { items: AccordionSectionItem[] }) {
  return (
    <Accordion type="multiple" className="rounded-[1.5rem] border border-border bg-card px-5 shadow-[var(--shadow-card)]">
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value} className="border-border/80">
          <AccordionTrigger className="py-5 font-headline text-xl font-semibold uppercase tracking-[0.03em] hover:no-underline">
            {item.title}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-6 text-muted-foreground">
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
