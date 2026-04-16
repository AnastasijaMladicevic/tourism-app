export interface EventDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  longitude?: number;
  latitude?: number;
  isActive: boolean;
  startDate: Date | string;
  endDate?: Date | string;
  price?: number;
  maxVisitors?: number;
  status: string;
  eventTypeId: number;
  eventTypeName?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdByUserId?: number;
}

export interface CreateEventDto {
  name: string;
  description?: string;
  longitude?: number;
  latitude?: number;
  startDate: Date | string;
  endDate?: Date | string;
  price?: number;
  maxVisitors?: number;
  eventTypeId: number;
  localityId?: number;
  destinationId?: number;
  objectId?: number;
}

export interface UpdateEventDto {
  name: string;
  description?: string;
  longitude?: number;
  latitude?: number;
  startDate: Date | string;
  endDate?: Date | string;
  price?: number;
  maxVisitors?: number;
  eventTypeId: number;
  localityId?: number;
  destinationId?: number;
  objectId?: number;
}

export interface EventQueryDto {
  type?: string;
  destination?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  date?: Date | string;
  nextDays?: number;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface EventQueryResponse {
  items: EventDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface EventType {
  id: number;
  name: string;
}
