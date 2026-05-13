import { Injectable } from '@angular/core';

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

  getRoutePoints(): RouteBuilderPoint[] {
    return this.routePoints.map((point) => ({ ...point }));
  }

  hasPlannerState(): boolean {
    return this.plannerOpen && this.routePoints.length > 0;
  }

  openPlanner(points: RouteBuilderPoint[]): void {
    this.routePoints = points.map((point) => ({ ...point }));
    this.plannerOpen = true;
  }

  updateRoutePoints(points: RouteBuilderPoint[]): void {
    this.routePoints = points.map((point) => ({ ...point }));
    this.plannerOpen = this.routePoints.length > 0;
  }

  addRoutePoint(point: RouteBuilderPoint): void {
    this.routePoints = [...this.routePoints, { ...point }];
    this.plannerOpen = true;
  }

  clearPlanner(): void {
    this.routePoints = [];
    this.plannerOpen = false;
    this.mapPickingRequested = false;
  }

  requestMapPicking(): void {
    this.mapPickingRequested = true;
  }

  consumeMapPickingRequest(): boolean {
    const requested = this.mapPickingRequested;
    this.mapPickingRequested = false;
    return requested;
  }
}
