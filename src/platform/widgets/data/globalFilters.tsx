/**
 * Noska Widget Platform — Global Dashboard Filter Context & Toolbar State.
 * Allows workspace dashboards to broadcast active filters across all widgets simultaneously.
 */
import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { GlobalDashboardFilterState } from "./types";

interface GlobalFilterContextValue {
  filters: GlobalDashboardFilterState;
  setFilter: (key: keyof GlobalDashboardFilterState, value: any) => void;
  setFilters: (patch: Partial<GlobalDashboardFilterState>) => void;
  resetFilters: () => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  isFiltering: boolean;
}

const DEFAULT_FILTERS: GlobalDashboardFilterState = {
  projectId: null,
  assigneeId: null,
  timeframe: "all",
  status: null,
  searchQuery: "",
};

const GlobalFilterContext = createContext<GlobalFilterContextValue>({
  filters: DEFAULT_FILTERS,
  setFilter: () => {},
  setFilters: () => {},
  resetFilters: () => {},
  clearFilters: () => {},
  hasActiveFilters: false,
  isFiltering: false,
});

export function GlobalFilterProvider({
  children,
  initialFilters = DEFAULT_FILTERS,
}: {
  children: React.ReactNode;
  initialFilters?: Partial<GlobalDashboardFilterState>;
}) {
  const [filters, setFiltersState] = useState<GlobalDashboardFilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const setFilter = useCallback((key: keyof GlobalDashboardFilterState, value: any) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((patch: Partial<GlobalDashboardFilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(filters.projectId) ||
      Boolean(filters.assigneeId) ||
      (filters.timeframe !== "all" && Boolean(filters.timeframe)) ||
      Boolean(filters.status) ||
      Boolean(filters.searchQuery?.trim())
    );
  }, [filters]);

  const value = useMemo(
    () => ({
      filters,
      setFilter,
      setFilters,
      resetFilters,
      clearFilters: resetFilters,
      hasActiveFilters,
      isFiltering: hasActiveFilters,
    }),
    [filters, setFilter, setFilters, resetFilters, hasActiveFilters]
  );

  return <GlobalFilterContext.Provider value={value}>{children}</GlobalFilterContext.Provider>;
}

export function useGlobalDashboardFilters(): GlobalFilterContextValue {
  return useContext(GlobalFilterContext);
}

export const useGlobalFilters = useGlobalDashboardFilters;

