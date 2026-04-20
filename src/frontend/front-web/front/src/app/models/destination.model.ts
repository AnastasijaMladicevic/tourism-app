export interface DestinationDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  longitude?: number;
  latitude?: number;
  isActive: boolean;
  status: string;
  destinationTypeId: number;
  destinationTypeName: string;
  createdByUserId: number;
  managedByUserId?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DestinationQueryDto {
  type?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface DestinationQueryResponse {
  items: DestinationDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}