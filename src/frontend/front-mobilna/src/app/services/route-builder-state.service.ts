import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface RouteBuilderPoint {
  id: number | string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  markerType?: string;
  markerId?: number;
}

@Injectable({ providedIn: 'root' })
export class RouteBuilderStateService {
  private routePoints: RouteBuilderPoint[] = [];
  private plannerOpen = false;
  private mapPickingRequested = false;

  private readonly routePointsChangedSubject = new Subject<void>();
  readonly routePointsChanged$ = this.routePointsChangedSubject.asObservable();

  getRoutePoints(): RouteBuilderPoint[] {
    return this.routePoints.map((point) => ({ ...point }));
  }

  hasPlannerState(): boolean {
    return this.plannerOpen && this.routePoints.length > 0;
  }

  openPlanner(points: RouteBuilderPoint[]): void {
    this.routePoints = points.map((point) => ({ ...point }));
    this.plannerOpen = true;
    this.notifyRoutePointsChanged();
  }

  updateRoutePoints(points: RouteBuilderPoint[]): void {
    this.routePoints = points.map((point) => ({ ...point }));
    this.plannerOpen = this.routePoints.length > 0;
    this.notifyRoutePointsChanged();
  }

  addRoutePoint(point: RouteBuilderPoint): void {
    const alreadyInRoute = this.routePoints.some(
      (p) => p.id === point.id && p.type === point.type,
    );
    if (alreadyInRoute) return;

    this.routePoints = [...this.routePoints, { ...point }];
    this.plannerOpen = true;
    this.notifyRoutePointsChanged();
  }

  prependRoutePoint(point: RouteBuilderPoint): void {
    this.routePoints = [{ ...point }, ...this.routePoints];
    this.plannerOpen = true;
    this.notifyRoutePointsChanged();
  }

  clearPlanner(): void {
    this.routePoints = [];
    this.plannerOpen = false;
    this.mapPickingRequested = false;
    this.notifyRoutePointsChanged();
  }

  requestMapPicking(): void {
    this.mapPickingRequested = true;
  }

  consumeMapPickingRequest(): boolean {
    const requested = this.mapPickingRequested;
    this.mapPickingRequested = false;
    return requested;
  }
  
  private notifyRoutePointsChanged(): void {
    this.routePointsChangedSubject.next();
  }
}