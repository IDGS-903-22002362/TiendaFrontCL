"use client";

import { useEffect, useMemo } from "react";
import {
  EntityPicker,
  type EntityOption,
} from "@/components/admin/entity-picker";
import { useAdminProductSearch } from "@/hooks/use-admin-product-search";

const EMPTY_SEED_OPTIONS: EntityOption[] = [];

type ProductSearchPickerProps = {
  className?: string;
  label: string;
  searchLabel?: string;
  selectLabel: string;
  value: string;
  onValueChange: (value: string) => void;
  token?: string | null;
  onResultsChange?: (options: EntityOption[]) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  showSelectedId?: boolean;
  seedOptions?: EntityOption[];
};

export function ProductSearchPicker({
  className,
  label,
  searchLabel = "Buscar producto...",
  selectLabel,
  value,
  onValueChange,
  token,
  onResultsChange,
  allowEmpty = true,
  emptyLabel = "Sin seleccion",
  disabled = false,
  showSelectedId = true,
  seedOptions = EMPTY_SEED_OPTIONS,
}: ProductSearchPickerProps) {
  const {
    query,
    setQuery,
    options,
    isSearching,
    error,
    minQueryLength,
    resetSearch,
  } = useAdminProductSearch(token);

  const mergedOptions = useMemo(() => {
    const byId = new Map<string, EntityOption>();
    seedOptions.forEach((option) => {
      if (option.id) byId.set(option.id, option);
    });
    options.forEach((option) => {
      if (option.id) byId.set(option.id, option);
    });
    return Array.from(byId.values());
  }, [options, seedOptions]);

  useEffect(() => {
    if (!onResultsChange) return;
    onResultsChange(mergedOptions);
  }, [mergedOptions, onResultsChange]);

  useEffect(() => {
    if (!value) return;

    const selected = mergedOptions.find((option) => option.id === value);
    if (!selected?.label || selected.label === "Cargando producto...") {
      return;
    }

    setQuery((current) => (current === selected.label ? current : selected.label));
  }, [mergedOptions, setQuery, value]);

  useEffect(() => {
    if (!value) {
      resetSearch();
    }
  }, [resetSearch, value]);

  const helperText =
    error ??
    (query.trim().length > 0 && query.trim().length < minQueryLength
      ? `Escribe al menos ${minQueryLength} caracteres para buscar.`
      : null);

  return (
    <EntityPicker
      className={className}
      label={label}
      searchLabel={searchLabel}
      selectLabel={selectLabel}
      query={query}
      value={value}
      options={mergedOptions}
      onQueryChange={setQuery}
      onValueChange={onValueChange}
      allowEmpty={allowEmpty}
      emptyLabel={emptyLabel}
      disabled={disabled}
      showSelectedId={showSelectedId}
      isSearching={isSearching}
      helperText={helperText}
      minQueryLength={minQueryLength}
    />
  );
}