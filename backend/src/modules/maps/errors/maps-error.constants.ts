// BSA Maps Error Constants

export const MAP_ERRORS = {
  // Geocoding errors
  GEOCODER_UNAVAILABLE: 'Geocoding service is temporarily unavailable',
  GEOCODER_TIMEOUT: 'Geocoding service timed out',
  GEOCODER_NO_RESULTS: 'No locations found for the search query',
  GEOCODER_INVALID_INPUT: 'Invalid location search parameters',

  // Reverse geocoding errors
  REVERSE_GEOCODER_UNAVAILABLE:
    'Reverse geocoding service is temporarily unavailable',
  REVERSE_GEOCODER_TIMEOUT: 'Reverse geocoding service timed out',
  REVERSE_GEOCODER_INVALID_COORDS: 'Invalid coordinates provided',

  // Routing errors
  ROUTING_SERVICE_UNAVAILABLE: 'Routing service is temporarily unavailable',
  ROUTING_SERVICE_TIMEOUT: 'Routing service timed out',
  ROUTING_NO_ROUTE_FOUND: 'No route found between these locations',
  ROUTING_INVALID_REQUEST: 'Invalid routing parameters',
  ROUTING_SERVICE_ERROR: 'An error occurred while calculating the route',

  // Validation errors
  VALIDATION_FAILED: 'Validation failed',
  INVALID_COORDINATES: 'Invalid coordinates',

  // System errors
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  TIMEOUT: 'Request timed out',
  NETWORK_ERROR: 'Network error occurred',

  // POI errors
  POI_SERVICE_UNAVAILABLE: 'POI search service is temporarily unavailable',
  POI_NO_RESULTS: 'No points of interest found in this area',
  POI_SERVICE_TIMEOUT: 'POI search service timed out',
};

export const MAP_ERROR_STATUS: Record<string, number> = {
  [MAP_ERRORS.GEOCODER_NO_RESULTS]: 404,
  [MAP_ERRORS.ROUTING_NO_ROUTE_FOUND]: 404,
  [MAP_ERRORS.GEOCODER_INVALID_INPUT]: 400,
  [MAP_ERRORS.REVERSE_GEOCODER_INVALID_COORDS]: 400,
  [MAP_ERRORS.ROUTING_INVALID_REQUEST]: 400,
  [MAP_ERRORS.VALIDATION_FAILED]: 400,
  [MAP_ERRORS.INVALID_COORDINATES]: 400,
  [MAP_ERRORS.GEOCODER_UNAVAILABLE]: 503,
  [MAP_ERRORS.GEOCODER_TIMEOUT]: 503,
  [MAP_ERRORS.REVERSE_GEOCODER_UNAVAILABLE]: 503,
  [MAP_ERRORS.REVERSE_GEOCODER_TIMEOUT]: 503,
  [MAP_ERRORS.ROUTING_SERVICE_UNAVAILABLE]: 503,
  [MAP_ERRORS.ROUTING_SERVICE_TIMEOUT]: 503,
  [MAP_ERRORS.ROUTING_SERVICE_ERROR]: 502,
  [MAP_ERRORS.SERVICE_UNAVAILABLE]: 503,
  [MAP_ERRORS.TIMEOUT]: 504,
  [MAP_ERRORS.NETWORK_ERROR]: 502,
  [MAP_ERRORS.POI_SERVICE_UNAVAILABLE]: 503,
  [MAP_ERRORS.POI_NO_RESULTS]: 404,
  [MAP_ERRORS.POI_SERVICE_TIMEOUT]: 504,
};

export class MapsError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'MapsError';
  }
}
