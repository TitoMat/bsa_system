import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { SearchLocationDto } from './dto/search-location.dto';
import type { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import type { RouteRequestDto, TravelMode } from './dto/route-request.dto';
import { MAP_ERRORS, MapsError } from './errors/maps-error.constants';
import {
  decodePolyline,
  formatDistance,
  formatDuration,
} from './utils/route-utils';

export type MapsRouteResult = {
  route: {
    distanceMeters: number;
    durationSeconds: number;
    distanceLabel: string;
    durationLabel: string;
    provider?: string;
    geometry?: { type: string; coordinates: Array<[number, number]> };
  };
};

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly nominatimBaseUrl: string;
  private readonly osrmBaseUrl: string;
  private readonly valhallaEnabled: boolean;
  private isValhallaAvailable = true;
  private readonly valhallaBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.nominatimBaseUrl =
      configService.get<string>('NOMINATIM_BASE_URL') ||
      'https://nominatim.openstreetmap.org';
    this.valhallaBaseUrl =
      configService.get<string>('VALHALLA_BASE_URL') ||
      'https://valhalla.mapzen.com';
    this.valhallaEnabled = Boolean(
      configService.get<string>('VALHALLA_BASE_URL'),
    );
    this.osrmBaseUrl =
      configService.get<string>('OSRM_BASE_URL') ||
      'https://router.project-osrm.org';
    this.validateRequiredEnvVars();
  }

  async onModuleInit() {
    await this.checkServiceAvailability();
  }

  private validateRequiredEnvVars() {
    const missingVars: string[] = [];
    if (
      !this.configService.get<string>('NOMINATIM_BASE_URL') &&
      !this.nominatimBaseUrl.includes('openstreetmap.org')
    ) {
      missingVars.push('NOMINATIM_BASE_URL');
    }
    if (
      !this.configService.get<string>('OSRM_BASE_URL') &&
      !this.osrmBaseUrl.includes('project-osrm.org')
    ) {
      missingVars.push('OSRM_BASE_URL');
    }
    if (missingVars.length > 0) {
      this.logger.warn(
        `Missing environment variables: ${missingVars.join(', ')}`,
      );
    }
  }

  private async checkServiceAvailability() {
    const servicesToCheck = [
      {
        name: 'OSRM',
        url: `${this.osrmBaseUrl}/route/v1/driving/121.0501,14.5508;121.0331,14.4237?overview=full&geometries=polyline6`,
      },
      ...(this.valhallaEnabled
        ? [{ name: 'Valhalla', url: `${this.valhallaBaseUrl}/route` }]
        : []),
    ];

    for (const service of servicesToCheck) {
      try {
        const startTime = Date.now();
        await axios.post(
          service.url,
          service.name === 'OSRM'
            ? {}
            : {
                locations: [
                  { lat: 0, lng: 0 },
                  { lat: 1, lng: 1 },
                ],
                costing: 'auto',
                units: 'metric',
                shapes: true,
                shape_precision: 6,
              },
          { timeout: 5000 },
        );
        const responseTime = Date.now() - startTime;
        this.logger.log(
          `${service.name} is available (response time: ${responseTime}ms)`,
        );
        if (service.name === 'Valhalla') {
          this.isValhallaAvailable = true;
        }
      } catch (error) {
        this.logger.error(
          `${service.name} is not available: ${(error as Error).message}`,
        );
        if (service.name === 'Valhalla') {
          this.isValhallaAvailable = false;
        }
      }
    }
  }

  async searchLocation(q: string, limit = 5) {
    try {
      const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
        params: {
          q,
          limit,
          format: 'json',
          addressdetails: 1,
          countrycodes: 'ph',
          viewbox: '116.93,21.12,126.80,4.62',
          bounded: 1,
        },
        timeout: 10000,
        headers: { 'User-Agent': 'BSA-System/1.0' },
      });

      const results = response.data as Array<{
        place_id: number;
        display_name: string;
        lat: string;
        lon: string;
        type: string;
        name: string;
      }>;

      if (results.length === 0) {
        throw new MapsError(
          MAP_ERRORS.GEOCODER_NO_RESULTS,
          `No locations found for query "${q}"`,
        );
      }

      return results.map((r) => ({
        id: `location-${r.place_id}`,
        name: r.name || r.display_name,
        displayName: r.display_name,
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        type: r.type,
      }));
    } catch (error) {
      if (error instanceof MapsError) {
        throw error;
      }
      this.logger.error(
        `Nominatim search failed for query \"${q}\"`,
        error instanceof Error ? error.message : String(error),
      );
      throw new MapsError(
        MAP_ERRORS.GEOCODER_UNAVAILABLE,
        'Location search service is temporarily unavailable.',
      );
    }
  }

  async reverseGeocode(latitude: number, longitude: number) {
    try {
      const response = await axios.get(`${this.nominatimBaseUrl}/reverse`, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
        },
        timeout: 10000,
        headers: { 'User-Agent': 'BSA-System/1.0' },
      });

      const data = response.data as {
        display_name: string;
        lat: string;
        lon: string;
      };
      return {
        displayName: data.display_name,
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon),
      };
    } catch (error) {
      this.logger.warn(
        `Nominatim reverse geocode failed for ${latitude}, ${longitude}`,
        error instanceof Error ? error.message : String(error),
      );
      return {
        displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        latitude,
        longitude,
      };
    }
  }

  async calculateRoute(body: RouteRequestDto): Promise<MapsRouteResult> {
    const travelMode: TravelMode = body.travelMode || 'car';
    const coordinates = `${body.originLongitude},${body.originLatitude};${body.destinationLongitude},${body.destinationLatitude}`;
    const mode = this.mapToOSRMMode(travelMode);

    const osrmResult = await this.tryRouteViaOSRM(coordinates, mode);
    if (osrmResult.data) {
      return this.formatOSRMRoute(osrmResult.data);
    }

    if (this.valhallaEnabled && this.isValhallaAvailable) {
      const valhallaResult = await this.tryRouteViaValhalla(body);
      if (valhallaResult.data) {
        return this.formatValhallaRoute(valhallaResult.data);
      }
      this.logger.error(
        'Valhalla route calculation failed',
        valhallaResult.error,
      );
    }

    this.logger.error('All routing services failed', osrmResult.error);
    throw new MapsError(
      MAP_ERRORS.ROUTING_SERVICE_UNAVAILABLE,
      MAP_ERRORS.ROUTING_SERVICE_UNAVAILABLE,
    );
  }

  private mapToOSRMMode(mode: TravelMode): string {
    switch (mode) {
      case 'car':
        return 'driving';
      case 'pedestrian':
        return 'walking';
      case 'bicycle':
        return 'cycling';
      default:
        return 'driving';
    }
  }

  private async tryRouteViaOSRM(coordinates: string, mode: string) {
    try {
      const response = await axios.post(
        `${this.osrmBaseUrl}/route/v1/${mode}/${coordinates}?overview=full&geometries=polyline6&steps=false`,
        {},
        { timeout: 30000 },
      );
      return { data: response.data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async tryRouteViaValhalla(body: RouteRequestDto) {
    try {
      const response = await axios.get(`${this.valhallaBaseUrl}/route`, {
        params: {
          json: JSON.stringify({
            locations: [
              { lat: body.originLatitude, lng: body.originLongitude },
              { lat: body.destinationLatitude, lng: body.destinationLongitude },
            ],
            costing:
              body.travelMode === 'car'
                ? 'auto'
                : body.travelMode === 'pedestrian'
                  ? 'pedestrian'
                  : 'bicycle',
            units: 'metric',
            shapes: true,
            shape_precision: 6,
          }),
        },
        timeout: 30000,
      });
      return { data: response.data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private formatOSRMRoute(data: any): MapsRouteResult {
    const route = data.routes?.[0];
    if (!route) {
      throw new MapsError(
        MAP_ERRORS.ROUTING_NO_ROUTE_FOUND,
        MAP_ERRORS.ROUTING_NO_ROUTE_FOUND,
      );
    }

    return {
      route: {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        distanceLabel: formatDistance(route.distance),
        durationLabel: formatDuration(route.duration),
        provider: 'OSRM',
        geometry: {
          type: 'LineString',
          coordinates: route.geometry ? decodePolyline(route.geometry) : [],
        },
      },
    };
  }

  private formatValhallaRoute(data: any): MapsRouteResult {
    const trip = data.trip;
    if (!trip?.summary) {
      throw new MapsError(
        MAP_ERRORS.ROUTING_NO_ROUTE_FOUND,
        MAP_ERRORS.ROUTING_NO_ROUTE_FOUND,
      );
    }

    const shape = trip.shape || '';
    const coordinates = shape ? decodePolyline(shape) : [];

    return {
      route: {
        distanceMeters: trip.summary.length,
        durationSeconds: trip.summary.time,
        distanceLabel: formatDistance(trip.summary.length),
        durationLabel: formatDuration(trip.summary.time),
        provider: 'Valhalla',
        geometry: {
          type: 'LineString',
          coordinates,
        },
      },
    };
  }

  private readonly POI_CATEGORIES: Record<string, string> = {
    fuel: '"amenity"="fuel"',
    restaurant: '"amenity"="restaurant"',
    cafe: '"amenity"="cafe"',
    hospital: '"amenity"="hospital"',
    pharmacy: '"amenity"="pharmacy"',
    school: '"amenity"="school"',
    police: '"amenity"="police"',
    atm: '(("amenity"="atm") or ("amenity"="bank"))',
    place_of_worship: '"amenity"="place_of_worship"',
    parking: '"amenity"="parking"',
    toilets: '"amenity"="toilets"',
    hotel: '"tourism"="hotel"',
    fire_station: '"amenity"="fire_station"',
  };

  async searchPOI(
    latitude: number,
    longitude: number,
    radius: number,
    categories: string[],
  ) {
    try {
      const kmPerDegLat = 111.32;
      const kmPerDegLng = 111.32 * Math.cos((latitude * Math.PI) / 180);
      const deltaLat = radius / 1000 / kmPerDegLat;
      const deltaLng = radius / 1000 / kmPerDegLng;

      const south = latitude - deltaLat;
      const west = longitude - deltaLng;
      const north = latitude + deltaLat;
      const east = longitude + deltaLng;

      const bbox = `${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)}`;

      const tagQueries = categories
        .filter((c) => this.POI_CATEGORIES[c])
        .map((c) => `node${this.POI_CATEGORIES[c]}(${bbox});`)
        .join('\n');

      if (!tagQueries) {
        throw new MapsError(
          MAP_ERRORS.POI_NO_RESULTS,
          MAP_ERRORS.POI_NO_RESULTS,
        );
      }

      const query = `[out:json][timeout:15];\n(\n${tagQueries}\n);\nout body;`;

      const response = await axios.post(
        'https://overpass-api.de/api/interpreter',
        query,
        {
          headers: {
            'Content-Type': 'text/plain',
            'User-Agent': 'BSA-System/1.0',
          },
          timeout: 20000,
        },
      );

      const elements = response.data?.elements as Array<{
        id: number;
        lat: number;
        lon: number;
        tags?: Record<string, string>;
      }>;

      if (!elements || elements.length === 0) {
        return [];
      }

      return elements.map((el) => ({
        id: `poi-${el.id}`,
        name: el.tags?.name || 'Unnamed',
        category: el.tags?.amenity || el.tags?.tourism || 'unknown',
        latitude: el.lat,
        longitude: el.lon,
      }));
    } catch (error) {
      if (error instanceof MapsError) {
        throw error;
      }
      this.logger.error(
        `POI search failed for ${latitude}, ${longitude}`,
        error instanceof Error ? error.message : String(error),
      );
      throw new MapsError(
        MAP_ERRORS.POI_SERVICE_UNAVAILABLE,
        MAP_ERRORS.POI_SERVICE_UNAVAILABLE,
      );
    }
  }
}
