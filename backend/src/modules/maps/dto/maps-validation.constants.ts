// backend/src/modules/maps/dto/maps-validation.constants.ts

export const MAPS_VALIDATION_ERRORS = {
  // Search DTO errors
  SEARCH_QUERY_EMPTY: 'Search query cannot be empty',
  SEARCH_QUERY_TOO_LONG: 'Search query cannot exceed 200 characters',
  SEARCH_LIMIT_TOO_LOW: 'Search limit must be at least 1',
  SEARCH_LIMIT_TOO_HIGH: 'Search limit cannot exceed 20',

  // Reverse geocoding DTO errors
  INVALID_LATITUDE: 'Latitude must be between -90 and 90',
  INVALID_LONGITUDE: 'Longitude must be between -180 and 180',

  // Route DTO errors
  INVALID_ORIGIN_LATITUDE: 'Origin latitude must be between -90 and 90',
  INVALID_ORIGIN_LONGITUDE: 'Origin longitude must be between -180 and 180',
  INVALID_DESTINATION_LATITUDE:
    'Destination latitude must be between -90 and 90',
  INVALID_DESTINATION_LONGITUDE:
    'Destination longitude must be between -180 and 180',
  COORDINATES_TOO_CLOSE: 'Origin and destination coordinates are too close',
  INVALID_TRAVEL_MODE: 'Travel mode must be one of: car, pedestrian, bicycle',

  // General validation errors
  MISSING_COORDINATES: 'Both origin and destination coordinates are required',
  DUPLICATE_COORDINATES: 'Origin and destination cannot be the same point',

  // POI DTO errors
  POI_RADIUS_TOO_LOW: 'POI search radius must be at least 100 meters',
  POI_RADIUS_TOO_HIGH: 'POI search radius cannot exceed 50000 meters',
  POI_INVALID_CATEGORY: 'One or more POI categories are invalid',
};
