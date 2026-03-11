"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EntityOption = {
  id: string;
  label: string;
  subtitle?: string;
};

type EntityPickerProps = {
  label: string;
  searchLabel: string;
  selectLabel: string;
  query: string;
  value: string;
  options: EntityOption[];
  onQueryChange: (query: string) => void;
  onValueChange: (value: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function EntityPicker({
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
}: EntityPickerProps) {
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      normalize(`${option.label} ${option.subtitle ?? ""}`).includes(
        normalizedQuery,
      ),
    );
  }, [options, query]);

  const selectedOption = options.find((option) => option.id === value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        placeholder={searchLabel}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        disabled={disabled}
      />
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
      <p className="text-xs text-muted-foreground">
        {selectedOption ? `ID seleccionado: ${selectedOption.id}` : "Sin selección"}
      </p>
    </div>
  );
}

