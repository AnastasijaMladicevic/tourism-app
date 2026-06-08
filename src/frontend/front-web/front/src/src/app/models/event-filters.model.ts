import { EventQueryDto } from './event.model';

export interface EventFilterState {
  searchQuery: string;
  statusFilter: string;
  categoryFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  date?: Date | string | null;
  nextDays?: number | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

export interface EventQueryBuildOptions {
  page: number;
  pageSize: number;
  includeStatus?: boolean;
  includeCategoryAsType?: boolean;
  includeDateFilters?: boolean;
}

export function buildEventQueryDto(state: EventFilterState, options: EventQueryBuildOptions): EventQueryDto {
  const query: EventQueryDto = {
    page: options.page,
    pageSize: options.pageSize,
    search: state.searchQuery.trim() || undefined,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder
  };

  if (options.includeStatus && state.statusFilter && state.statusFilter !== 'all') {
    query.status = state.statusFilter;
  }

  if (options.includeCategoryAsType && state.categoryFilter && state.categoryFilter !== 'all') {
    query.type = state.categoryFilter;
  }

  if (options.includeDateFilters) {
    if (state.date) {
      query.date = state.date;
    } else if (state.nextDays) {
      query.nextDays = state.nextDays;
    } else if (state.startDate || state.endDate) {
      query.startDate = state.startDate ?? undefined;
      query.endDate = state.endDate ?? undefined;
    }
  }

  return query;
}
