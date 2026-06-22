"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type EntityOption = {
  id: string;
  label: string;
  subtitle?: string;
  searchKey?: string;
};

type EntityPickerProps = {
  className?: string;
  label: string;
  searchLabel?: string;
  selectLabel: string;
  query?: string;
  value: string;
  options: EntityOption[];
  onQueryChange?: (query: string) => void;
  onValueChange: (value: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  showSelectedId?: boolean;
  isSearching?: boolean;
  helperText?: string | null;
  minQueryLength?: number;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function EntityPicker({
  className,
  label,
  searchLabel,
  selectLabel,
  query,
  value,
  options,
  onQueryChange,
  onValueChange,
  allowEmpty = true,
  emptyLabel = "Sin selección",
  disabled = false,
  showSelectedId = true,
  isSearching = false,
  helperText = null,
  minQueryLength = 0,
}: EntityPickerProps) {
  const [resultsOpen, setResultsOpen] = useState(false);
  const normalizedQuery = normalize(query || "");
  const hasRemoteSearch = Boolean(onQueryChange && minQueryLength > 0);

  const filteredOptions = useMemo(() => {
    if (hasRemoteSearch) {
      return options;
    }

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      normalize(
        `${option.label} ${option.subtitle ?? ""} ${option.searchKey ?? ""} ${option.id}`,
      ).includes(normalizedQuery),
    );
  }, [hasRemoteSearch, normalizedQuery, options]);

  const selectedOption = options.find((option) => option.id === value);
  const showInlineResults =
    Boolean(onQueryChange) &&
    resultsOpen &&
    (normalizedQuery.length > 0 || isSearching || filteredOptions.length > 0);

  const handleSelect = (optionId: string) => {
    onValueChange(optionId);
    setResultsOpen(false);
  };

  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      {label ? <Label>{label}</Label> : null}
      {onQueryChange ? (
        <div className="relative">
          <Input
            placeholder={searchLabel}
            value={query || ""}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setResultsOpen(true);
            }}
            onFocus={() => setResultsOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setResultsOpen(false), 120);
            }}
            disabled={disabled}
            aria-autocomplete="list"
            aria-expanded={showInlineResults}
          />

          {showInlineResults ? (
            <div
              className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md"
              role="listbox"
            >
              {isSearching ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Buscando...
                </p>
              ) : filteredOptions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  {normalizedQuery.length < minQueryLength
                    ? `Escribe al menos ${minQueryLength} caracteres.`
                    : "Sin resultados"}
                </p>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={value === option.id}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                      value === option.id && "bg-muted",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(option.id)}
                  >
                    <span className="font-medium">{option.label}</span>
                    {option.subtitle ? (
                      <span className="text-xs text-muted-foreground">
                        {option.subtitle}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      <Select
        value={value || "__none__"}
        onValueChange={(nextValue) =>
          onValueChange(nextValue === "__none__" ? "" : nextValue)
        }
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={selectLabel} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value="__none__">{emptyLabel}</SelectItem>}
          {filteredOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.subtitle
                ? `${option.label} (${option.subtitle})`
                : option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
      {showSelectedId ? (
        <p className="text-xs text-text-muted">
          {selectedOption ? `ID seleccionado: ${selectedOption.id}` : "Sin selección"}
        </p>
      ) : null}
    </div>
  );
}
