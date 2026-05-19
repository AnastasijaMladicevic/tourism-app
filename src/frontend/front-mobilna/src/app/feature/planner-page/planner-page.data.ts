export interface PlannerEvent {
  id: number;
  eventId: number;
  category: string;
  imageUrl: string;
  title: string;
  description: string;
  location: string;
  time: string;
  badge?: string;
}

export interface PlannerDay {
  id: string;
  label: string;
  date: string;
  month: string;
  active?: boolean;
}

export interface VaultStat {
  value: string;
  label: string;
}

export type VaultCategoryIcon = 'activity' | 'hotel' | 'restaurant' | 'bar' | 'city';

export interface VaultCategory {
  id: number;
  name: string;
  count: number;
  icon: VaultCategoryIcon;
}

export interface PlannerHighlight {
  id: number;
  eventId: number;
  title: string;
  subtitle: string;
  imageUrl: string;
}
