import {
  AfterViewInit,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, map, of, Subject, switchMap } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  DestinationDto,
  DestinationService,
} from '../../../services/destination.service';
import { MapService } from '../../../services/map.service';
import { RegionService } from '../../../services/region';
import { ActiveRegionService } from '../../../services/active-region';

export interface AdminPlatformMapMarkersSummary {
  withCoords: number;
  total: number;
}

interface PagedDestinationResponse {
  items: DestinationDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Component({
  selector: 'app-admin-platform-map',
  standalone: true,
  imports: [CommonModule],
  template: `<div [id]="mapId" class="admin-platform-map"></div>`,
  styleUrls: ['./admin-platform-map.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class AdminPlatformMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly mapService = inject(MapService);
  private readonly destinationService = inject(DestinationService);
  private readonly regionService = inject(RegionService);
  private readonly activeRegionService = inject(ActiveRegionService);

  @Input() mapId = 'admin-platform-map';
  @Input() compact = false;
  @Input() initialLat = 42.424;
  @Input() initialLng = 18.771;
  @Input() initialZoom = 13;
  @Input() enableClustering = true;
  @Input() focusRegion = true;
  /** When null, destinations are fetched. When an array, the parent supplies marker data. */
  @Input() destinations: DestinationDto[] | null = null;

  @Output() mapReady = new EventEmitter<void>();
  @Output() destinationsLoaded = new EventEmitter<DestinationDto[]>();
  @Output() markersSummary = new EventEmitter<AdminPlatformMapMarkersSummary>();
  @Output() markerSelected = new EventEmitter<DestinationDto>();

  @HostBinding('class.admin-platform-map--compact')
  get hostCompactClass(): boolean {
    return this.compact;
  }

  @HostBinding('class.admin-platform-map--full')
  get hostFullClass(): boolean {
    return !this.compact;
  }

  private mapBootstrapped = false;
  private resizeObserver: ResizeObserver | null = null;
  private readonly destroy$ = new Subject<void>();

  ngAfterViewInit(): void {
    this.bootstrapMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mapId'] && !changes['mapId'].firstChange && this.mapBootstrapped) {
      this.reloadMarkers(this.destinations ?? []);
      return;
    }

    if (changes['destinations'] && !changes['destinations'].firstChange && this.mapBootstrapped) {
      this.reloadMarkers(this.destinations ?? []);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.mapService.destroyMap();
    this.mapBootstrapped = false;
  }

  private bootstrapMap(): void {
    if (!document.getElementById(this.mapId)) {
      return;
    }

    const zoom = this.initialZoom ?? (this.compact ? 8 : 13);
    this.mapService.initMap(this.mapId, this.initialLat, this.initialLng, zoom, {
      enableClustering: this.enableClustering,
    });

    if (this.focusRegion) {
      this.focusActiveRegion();
    }

    if (this.destinations !== null) {
      this.placeMarkers(this.destinations);
    } else {
      this.loadAllDestinations().pipe(takeUntil(this.destroy$)).subscribe({
        next: (items) => this.placeMarkers(items),
        error: (err) => console.error('Failed to load map destinations:', err),
      });
    }

    setTimeout(() => {
      this.mapService.getMap()?.invalidateSize();
      this.mapBootstrapped = true;
      this.observeCompactResize();
      this.mapReady.emit();
    }, 120);
  }

  private observeCompactResize(): void {
    if (!this.compact) return;
    const el = document.getElementById(this.mapId);
    if (!el) return;

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      this.mapService.getMap()?.invalidateSize();
    });
    this.resizeObserver.observe(el);
  }

  private reloadMarkers(destinations: DestinationDto[]): void {
    this.mapService.destroyMap();

    const zoom = this.initialZoom ?? (this.compact ? 8 : 13);
    this.mapService.initMap(this.mapId, this.initialLat, this.initialLng, zoom, {
      enableClustering: this.enableClustering,
    });

    if (this.focusRegion) {
      this.focusActiveRegion();
    }

    this.placeMarkers(destinations);

    setTimeout(() => this.mapService.getMap()?.invalidateSize(), 80);
  }

  private placeMarkers(destinations: DestinationDto[]): void {
    const withCoords = destinations.filter(
      (d) =>
        d.latitude != null &&
        d.longitude != null &&
        Number.isFinite(d.latitude) &&
        Number.isFinite(d.longitude),
    );

    withCoords.forEach((destination) => {
      const markerData = this.compact
        ? { ...destination, mapPopupVariant: 'label' }
        : destination;
      this.mapService.addMarkerWithType(
        destination.latitude!,
        destination.longitude!,
        'destination',
        markerData,
        () => this.markerSelected.emit(destination),
      );
    });

    this.destinationsLoaded.emit(destinations);
    this.markersSummary.emit({
      withCoords: withCoords.length,
      total: destinations.length,
    });
  }

  private focusActiveRegion(): void {
    const activeRegionId = this.activeRegionService.getActiveRegionId();
    const regionRequest = activeRegionId
      ? this.regionService.getById(activeRegionId)
      : this.regionService.getDefault();

    regionRequest.pipe(takeUntil(this.destroy$)).subscribe({
      next: (region) => {
        if (region.centerLatitude == null || region.centerLongitude == null) {
          return;
        }

        this.mapService.flyTo(
          region.centerLatitude,
          region.centerLongitude,
          Math.round(region.defaultMapZoom ?? 8),
        );
      },
      error: () => {
        // keep fallback center
      },
    });
  }

  private loadAllDestinations() {
    const pageSize = 100;

    return this.destinationService.getAll({ page: 1, pageSize }, { bypassRegion: true }).pipe(
      map((response) => this.toPagedResponse(response)),
      switchMap((firstPage) => {
        if (firstPage.totalPages <= 1) {
          return of(firstPage.items);
        }

        const nextPageRequests = Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
          this.destinationService
            .getAll({ page: index + 2, pageSize }, { bypassRegion: true })
            .pipe(map((response) => this.toPagedResponse(response).items)),
        );

        return forkJoin([of(firstPage.items), ...nextPageRequests]).pipe(
          map((pages) => pages.flat()),
        );
      }),
    );
  }

  private toPagedResponse(response: unknown): PagedDestinationResponse {
    if (Array.isArray(response)) {
      return {
        items: response,
        page: 1,
        pageSize: response.length,
        totalCount: response.length,
        totalPages: 1,
      };
    }

    const paged = response as Partial<PagedDestinationResponse> & { items?: DestinationDto[] };
    if (Array.isArray(paged?.items)) {
      return {
        items: paged.items,
        page: paged.page ?? 1,
        pageSize: paged.pageSize ?? paged.items.length,
        totalCount: paged.totalCount ?? paged.items.length,
        totalPages: paged.totalPages ?? 1,
      };
    }

    return {
      items: [],
      page: 1,
      pageSize: 0,
      totalCount: 0,
      totalPages: 0,
    };
  }
}
