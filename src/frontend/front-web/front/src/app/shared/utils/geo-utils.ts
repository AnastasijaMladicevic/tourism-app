// Minimalan point-in-polygon helper za GeoJSON Polygon/MultiPolygon (bez dodatne zavisnosti poput turf-a).

type Position = [number, number];
type LinearRing = Position[];

interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: LinearRing[];
}

interface GeoJsonMultiPolygon {
  type: 'MultiPolygon';
  coordinates: LinearRing[][];
}

export type GeoJsonGeometry = GeoJsonPolygon | GeoJsonMultiPolygon | { type: string; coordinates: unknown };

export function parseGeoJsonGeometry(geoJson?: string | null): GeoJsonGeometry | null {
  if (!geoJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(geoJson);
    if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string' && parsed.coordinates) {
      return parsed as GeoJsonGeometry;
    }
  } catch {
    // Ignorisi nevalidan GeoJSON - tretiramo kao da granica nije definisana.
  }

  return null;
}

// Ray-casting algoritam: tačka je unutar prstena ako neparan broj puta seče ivice.
function isPointInRing(longitude: number, latitude: number, ring: LinearRing): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersects =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

// Prvi prsten je spoljna granica, ostali su rupe.
function isPointInPolygonCoordinates(longitude: number, latitude: number, rings: LinearRing[]): boolean {
  if (rings.length === 0) {
    return false;
  }

  if (!isPointInRing(longitude, latitude, rings[0])) {
    return false;
  }

  for (let i = 1; i < rings.length; i++) {
    if (isPointInRing(longitude, latitude, rings[i])) {
      return false;
    }
  }

  return true;
}

export function isPointInGeometry(longitude: number, latitude: number, geometry?: GeoJsonGeometry | null): boolean {
  if (!geometry) {
    return false;
  }

  if (geometry.type === 'Polygon') {
    return isPointInPolygonCoordinates(longitude, latitude, (geometry as GeoJsonPolygon).coordinates);
  }

  if (geometry.type === 'MultiPolygon') {
    return (geometry as GeoJsonMultiPolygon).coordinates.some((polygon) =>
      isPointInPolygonCoordinates(longitude, latitude, polygon)
    );
  }

  return false;
}

export function isPointInGeoJson(longitude: number, latitude: number, geoJson?: string | null): boolean {
  return isPointInGeometry(longitude, latitude, parseGeoJsonGeometry(geoJson));
}
