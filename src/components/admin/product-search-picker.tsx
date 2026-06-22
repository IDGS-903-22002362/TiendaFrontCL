"use client";

import { useEffect } from "react";
import {
  EntityPicker,
  type EntityOption,
} from "@/components/admin/entity-picker";
import { useAdminProductSearch } from "@/hooks/use-admin-product-search";

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

  useEffect(() => {
    onResultsChange?.(options);
  }, [onResultsChange, options]);

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
      options={options}
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