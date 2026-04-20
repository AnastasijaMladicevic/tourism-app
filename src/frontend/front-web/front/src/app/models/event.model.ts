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
  localityId?: number;
  localityName?: string;
  destinationId?: number;
  destinationName?: string;
  objectId?: number;
  objectName?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdByUserId?: number;
  rejectionReason?: string;
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
  imageUrl?: string;
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
  imageUrl?: string;
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
  totalPages: number;
}

export interface EventType {
  id: number;
  name: string;
}

export interface TouristObjectDto {
  id: number;
  name: string;
  address?: string;
  destinationId: number;
  destinationName?: string;
}

export interface TouristObjectQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface TouristObjectQueryResponse {
  items: TouristObjectDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApproveContentDto {
  approve: boolean;
  rejectionReason?: string;
}
