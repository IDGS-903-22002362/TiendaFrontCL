"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DatePickerFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
};

function parseIsoDate(value: string): Date | null {
  if (!value.trim()) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

const DEFAULT_YEARS_BACK = 100;

function isPortaledPickerTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest("[data-radix-select-content]") ||
      target.closest("[data-radix-popper-content-wrapper]") ||
      target.closest("[role='listbox']"),
  );
}

export function DatePickerField({
  id,
  value,
  onChange,
  disabled = false,
  min,
  max,
  placeholder = "Selecciona una fecha",
  className,
  "aria-label": ariaLabel,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseIsoDate(value);
  const minDate = min ? parseIsoDate(min) : null;
  const maxDate = max ? parseIsoDate(max) : null;

  const displayValue = useMemo(() => {
    if (!selectedDate) return placeholder;

    return format(selectedDate, "PPP", { locale: es });
  }, [placeholder, selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange("");
      return;
    }

    if (minDate && date < startOfDay(minDate)) {
      onChange(toIsoDateString(minDate));
      setOpen(false);
      return;
    }

    if (maxDate && date > endOfDay(maxDate)) {
      onChange(toIsoDateString(maxDate));
      setOpen(false);
      return;
    }

    onChange(toIsoDateString(date));
    setOpen(false);
  };

  const isDayDisabled = (date: Date) => {
    if (minDate && date < startOfDay(minDate)) {
      return true;
    }

    if (maxDate && date > endOfDay(maxDate)) {
      return true;
    }

    return false;
  };

  const { startMonth, endMonth } = useMemo(() => {
    const currentYear = new Date().getFullYear();

    const candidateYears = [
      currentYear,
      selectedDate?.getFullYear(),
      minDate?.getFullYear(),
      maxDate?.getFullYear(),
    ].filter((year): year is number => typeof year === "number");

    const minYear = Math.min(...candidateYears, currentYear - DEFAULT_YEARS_BACK);
    const maxYear = Math.max(...candidateYears, currentYear);

    return {
      startMonth: new Date(minYear, 0, 1),
      endMonth: new Date(maxYear, 11, 31),
    };
  }, [maxDate, minDate, selectedDate]);

  const keepPopoverOpen = (event: Event) => {
    if (isPortaledPickerTarget(event.target)) {
      event.preventDefault();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "h-12 w-full justify-start rounded-[1rem] border border-input bg-card/92 px-4 py-3 text-left text-base font-normal shadow-[inset_0_1px_0_rgb(255_255_255_/_0.82)] transition-[border-color,box-shadow,background-color] duration-200 hover:bg-card/92 focus-visible:border-primary/65 focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:ring-offset-0 md:text-sm",
            !selectedDate && "text-text-muted",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{displayValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(21rem,calc(100vw-2rem))] min-w-[20rem] rounded-[1rem] border border-input bg-card p-0 shadow-lg"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={keepPopoverOpen}
        onPointerDownOutside={keepPopoverOpen}
        onFocusOutside={keepPopoverOpen}
      >
        <div className="p-4">
          <Calendar
            mode="single"
            locale={es}
            className="w-full [--cell-size:2.5rem]"
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
            defaultMonth={selectedDate ?? maxDate ?? undefined}
            selected={selectedDate ?? undefined}
            onSelect={handleDateSelect}
            disabled={isDayDisabled}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
