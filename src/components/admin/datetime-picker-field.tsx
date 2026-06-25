"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DateTimePickerFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
};

function parseDateTimeLocal(value: string): Date | null {
  if (!value.trim()) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateTimeLocalString(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 16);
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

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => minute);

// Rango de años navegable por dropdown en el calendario. Se permite retroceder
// algunos años (para editar ofertas antiguas) y avanzar varios hacia el futuro.
const CALENDAR_YEARS_BACK = 5;
const CALENDAR_YEARS_FORWARD = 5;

function isPortaledPickerTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest("[data-radix-select-content]") ||
      target.closest("[data-radix-popper-content-wrapper]") ||
      target.closest("[role='listbox']"),
  );
}

export function DateTimePickerField({
  id,
  value,
  onChange,
  disabled = false,
  min,
  max,
  placeholder = "Selecciona fecha y hora",
  className,
}: DateTimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateTimeLocal(value);
  const minDate = min ? parseDateTimeLocal(min) : null;
  const maxDate = max ? parseDateTimeLocal(max) : null;

  const displayValue = useMemo(() => {
    if (!selectedDate) return placeholder;

    return format(selectedDate, "PPP 'a las' HH:mm", { locale: es });
  }, [placeholder, selectedDate]);

  const updateDateTime = (nextDate: Date) => {
    onChange(toDateTimeLocalString(nextDate));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const base = selectedDate ?? new Date();
    const next = new Date(base);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());

    if (minDate && next.getTime() < minDate.getTime()) {
      updateDateTime(new Date(minDate));
      return;
    }

    if (maxDate && next.getTime() > maxDate.getTime()) {
      updateDateTime(new Date(maxDate));
      return;
    }

    updateDateTime(next);
  };

  const handleHourChange = (hourValue: string) => {
    const hours = Number(hourValue);
    const base = selectedDate ?? new Date();
    const next = new Date(base);
    next.setHours(hours, base.getMinutes(), 0, 0);
    updateDateTime(next);
  };

  const handleMinuteChange = (minuteValue: string) => {
    const minutes = Number(minuteValue);
    const base = selectedDate ?? new Date();
    const next = new Date(base);
    next.setMinutes(minutes, 0, 0);
    updateDateTime(next);
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

  const selectedHour = String(selectedDate?.getHours() ?? 0).padStart(2, "0");
  const selectedMinute = String(selectedDate?.getMinutes() ?? 0).padStart(
    2,
    "0",
  );

  const { startMonth, endMonth } = useMemo(() => {
    const currentYear = new Date().getFullYear();

    const candidateYears = [
      currentYear,
      selectedDate?.getFullYear(),
      minDate?.getFullYear(),
      maxDate?.getFullYear(),
    ].filter((year): year is number => typeof year === "number");

    const minYear =
      Math.min(...candidateYears, currentYear - CALENDAR_YEARS_BACK);
    const maxYear =
      Math.max(...candidateYears, currentYear + CALENDAR_YEARS_FORWARD);

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
        <div className="flex flex-col gap-4 p-4">
          <Calendar
            mode="single"
            required
            locale={es}
            className="w-full [--cell-size:2.5rem]"
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
            defaultMonth={selectedDate ?? undefined}
            selected={selectedDate ?? undefined}
            onSelect={handleDateSelect}
            disabled={isDayDisabled}
          />

          <div className="flex items-center gap-2 border-t border-border/70 pt-4">
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            <Select
              value={selectedHour}
              onValueChange={handleHourChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-10 flex-1 rounded-[0.75rem]">
                <SelectValue placeholder="Hora" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {HOUR_OPTIONS.map((hour) => (
                    <SelectItem
                      key={hour}
                      value={String(hour).padStart(2, "0")}
                    >
                      {String(hour).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <span className="text-sm font-medium text-muted-foreground">:</span>
            <Select
              value={selectedMinute}
              onValueChange={handleMinuteChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-10 flex-1 rounded-[0.75rem]">
                <SelectValue placeholder="Min" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {MINUTE_OPTIONS.map((minute) => (
                    <SelectItem
                      key={minute}
                      value={String(minute).padStart(2, "0")}
                    >
                      {String(minute).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}