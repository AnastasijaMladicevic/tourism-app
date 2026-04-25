import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, catchError, of } from 'rxjs';
import { LocationTrackingService } from '../../services/location-tracking';
import { SmartSearchResultDto, SmartSearchService } from '../../services/smart-search';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  searchQuery = '';
  results: SmartSearchResultDto[] = [];
  isLoading = false;
  hasSearched = false;

  private readonly subscriptions = new Subscription();
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly smartSearchService: SmartSearchService,
    private readonly locationTrackingService: LocationTrackingService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        const query = (params.get('q') ?? '').trim();
        this.searchQuery = query;

        if (!query) {
          this.results = [];
          this.hasSearched = false;
          this.isLoading = false;
          return;
        }

        this.runSearch(query);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
  }

  onSearchInput(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.submitSearch();
    }, 260);
  }

  submitSearch(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      this.clearSearch();
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query },
      queryParamsHandling: 'merge',
    });
  }

  clearSearch(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }

    this.searchQuery = '';
    this.results = [];
    this.hasSearched = false;
    this.isLoading = false;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
    });
  }

  openResult(result: SmartSearchResultDto): void {
    switch (result.category) {
      case 'destination':
        this.router.navigate(['/map'], {
          state: {
            lat: result.latitude,
            lng: result.longitude,
            zoom: 14,
            selectedItem: { id: result.id },
            selectedType: 'destination',
          },
        });
        break;
      case 'object':
        this.router.navigate(['/object', result.id]);
        break;
      case 'event':
        this.router.navigate(['/event', result.id]);
        break;
    }
  }

  goBack(): void {
    window.history.back();
  }

  private runSearch(query: string): void {
    const currentLocation = this.locationTrackingService.getCurrentLocation();
    const includeLocation =
      this.locationTrackingService.isTrackingEnabled() && currentLocation != null;
    const source = this.route.snapshot.queryParamMap.get('source');
    const mode = source === 'map' ? 'strict' : 'mcp';

    this.isLoading = true;
    this.hasSearched = true;

    const request$ =
      mode === 'mcp'
        ? this.smartSearchService.searchMcp({
            query,
            pageSize: 40,
            latitude: includeLocation ? currentLocation?.latitude : undefined,
            longitude: includeLocation ? currentLocation?.longitude : undefined,
          })
        : this.smartSearchService.search({
            query,
            pageSize: 40,
            mode: 'strict',
            latitude: includeLocation ? currentLocation?.latitude : undefined,
            longitude: includeLocation ? currentLocation?.longitude : undefined,
          });

    request$
      .pipe(catchError(() => of([] as SmartSearchResultDto[])))
      .subscribe((results) => {
        if (this.searchQuery.trim() !== query) {
          return;
        }

        this.results = results;
        this.isLoading = false;
      });
  }
}
