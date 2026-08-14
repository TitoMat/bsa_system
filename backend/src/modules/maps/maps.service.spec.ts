import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { MapsService } from './maps.service';
import { MapsError, MAP_ERRORS } from './errors/maps-error.constants';
import { ConfigService } from '@nestjs/config';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockConfig = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org',
      VALHALLA_BASE_URL: 'https://valhalla.example.com',
      OSRM_BASE_URL: 'https://router.example.com',
    };
    return config[key];
  }),
};

describe('MapsService', () => {
  let service: MapsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapsService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<MapsService>(MapsService);
  });

  describe('searchLocation', () => {
    it('normalizes Nominatim results', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            place_id: 123,
            display_name: 'Manila, Philippines',
            lat: '14.5995',
            lon: '120.9842',
            type: 'city',
            name: 'Manila',
          },
        ],
      });

      const result = await service.searchLocation('Manila');
      expect(result).toEqual([
        {
          id: 'location-123',
          name: 'Manila',
          displayName: 'Manila, Philippines',
          latitude: 14.5995,
          longitude: 120.9842,
          type: 'city',
        },
      ]);
    });

    it('throws MapsError GEOCODER_NO_RESULTS on empty results', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] });

      await expect(service.searchLocation('UnknownCity')).rejects.toMatchObject(
        {
          name: 'MapsError',
          code: MAP_ERRORS.GEOCODER_NO_RESULTS,
        },
      );
    });

    it('throws MapsError GEOCODER_UNAVAILABLE on upstream failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(service.searchLocation('Manila')).rejects.toMatchObject({
        name: 'MapsError',
        code: MAP_ERRORS.GEOCODER_UNAVAILABLE,
      });
    });
  });

  describe('reverseGeocode', () => {
    it('returns normalized address', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          display_name: 'Bonifacio Global City, Taguig, Philippines',
          lat: '14.5508',
          lon: '121.0501',
        },
      });

      const result = await service.reverseGeocode(14.5508, 121.0501);
      expect(result).toEqual({
        displayName: 'Bonifacio Global City, Taguig, Philippines',
        latitude: 14.5508,
        longitude: 121.0501,
      });
    });

    it('falls back to coordinates on upstream failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('timeout'));

      const result = await service.reverseGeocode(14.5508, 121.0501);
      expect(result.displayName).toBe('14.5508, 121.0501');
      expect(result.latitude).toBe(14.5508);
      expect(result.longitude).toBe(121.0501);
    });
  });

  describe('calculateRoute', () => {
    const routeBody = {
      originLatitude: 14.5508,
      originLongitude: 121.0501,
      destinationLatitude: 14.4237,
      destinationLongitude: 121.0331,
      travelMode: 'car' as const,
    };

    it('normalizes an OSRM response', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          routes: [
            {
              distance: 12650,
              duration: 1620,
              geometry: 'wddjF|}wR?a@_A@',
            },
          ],
        },
      });

      const result = await service.calculateRoute(routeBody);
      expect(result.route.distanceMeters).toBe(12650);
      expect(result.route.durationSeconds).toBe(1620);
      expect(result.route.distanceLabel).toBe('12.7 km');
      expect(result.route.geometry.type).toBe('LineString');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/route/v1/driving/'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('throws MapsError ROUTING_SERVICE_UNAVAILABLE when all providers fail', async () => {
      mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));
      mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.calculateRoute(routeBody)).rejects.toMatchObject({
        name: 'MapsError',
        code: MAP_ERRORS.ROUTING_SERVICE_UNAVAILABLE,
      });
    });

    it('throws MapsError ROUTING_NO_ROUTE_FOUND when no route is returned', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { code: 'NoRoute', routes: [] },
      });

      await expect(service.calculateRoute(routeBody)).rejects.toMatchObject({
        name: 'MapsError',
        code: MAP_ERRORS.ROUTING_NO_ROUTE_FOUND,
      });
    });
  });
});
