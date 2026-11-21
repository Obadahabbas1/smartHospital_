import axios from 'axios';

/**
 * Geocoder Configuration
 * Supports both Mapbox and Google Maps Geocoding APIs
 * Falls back to the other provider if one fails
 */

const MAPBOX_API_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

// Helper to resolve Mapbox token from various potential environment variables
const getMapboxToken = () => {
  const { MAP_TOKEN, MAPBOX_TOKEN, GOOGLE_MAPS_API_KEY } = process.env;
  if (MAP_TOKEN) return MAP_TOKEN;
  if (MAPBOX_TOKEN) return MAPBOX_TOKEN;
  // Handle case where user put a Mapbox token in the Google slot
  if (GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.startsWith('pk.')) return GOOGLE_MAPS_API_KEY;
  return null;
};

/**
 * Geocode an address/location string to lat/lng coordinates
 * Tries Mapbox first, falls back to Google Maps if needed
 * 
 * @param {string} location - Address, city, or area to geocode
 * @param {string} countryBias - Optional country code (e.g., 'IN' for India)
 * @returns {Promise<{latitude: number, longitude: number, formatted_address: string, place_name: string}>}
 */
export const geocodeLocation = async (location, countryBias = null) => {
  if (!location || typeof location !== 'string' || location.trim().length === 0) {
    throw new Error('Location parameter is required and must be a non-empty string');
  }

  const trimmedLocation = location.trim();

  // Try Google Maps first (prioritized as requested)
  if (process.env.GOOGLE_MAPS_API_KEY) {
    try {
      return await geocodeGoogle(trimmedLocation, countryBias);
    } catch (error) {
      console.warn('Google Maps geocoding failed, trying Mapbox:', error.message);
      // Fall through to Mapbox
    }
  }

  // Try Mapbox as fallback
  const mapboxToken = getMapboxToken();
  if (mapboxToken) {
    try {
      return await geocodeMapbox(trimmedLocation, countryBias, mapboxToken);
    } catch (error) {
      console.warn('Mapbox geocoding failed:', error.message);
      throw new Error(
        `Unable to geocode location "${trimmedLocation}". ` +
        'Make sure the location is a valid city, area, or address.'
      );
    }
  }



  // No geocoding service configured
  throw new Error('Geocoding service not configured. Please set MAPBOX_TOKEN or GOOGLE_MAPS_API_KEY in environment variables');
};

/**
 * Geocode using Mapbox Geocoding API
 * @private
 */
const geocodeMapbox = async (location, countryBias, token) => {
  try {
    // Prepare query parameters
    const params = {
      access_token: token || getMapboxToken(),
      limit: 1,
      types: 'place,region,address', // Focus on places, regions, and addresses
    };

    // Add country bias if provided (Mapbox uses country code)
    if (countryBias) {
      params.country = countryBias;
    }

    // Make request to Mapbox Geocoding API
    const response = await axios.get(
      `${MAPBOX_API_URL}/${encodeURIComponent(location)}.json`,
      { params, timeout: 10000 } // Increased to 10s
    );

    // Handle no results
    if (!response.data.features || response.data.features.length === 0) {
      console.warn(`Mapbox found NO results for: ${location}`);
      throw new Error(`No results found for location: ${location}`);
    }

    // Extract first result
    const feature = response.data.features[0];
    const [longitude, latitude] = feature.geometry.coordinates;
    console.log(`✓ Mapbox resolved "${location}" to [${latitude}, ${longitude}]`);

    // Return standardized format
    return {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      formatted_address: feature.place_name || location,
      place_name: feature.text || feature.place_name,
      provider: 'mapbox',
      confidence: feature.relevance || 0.5, // Mapbox uses relevance score
    };
  } catch (error) {
    if (error.message.includes('No results found')) {
      throw error;
    }
    throw new Error(`Mapbox geocoding error: ${error.message}`);
  }
};

/**
 * Geocode using Google Maps Geocoding API
 * @private
 */
const geocodeGoogle = async (location, countryBias) => {
  try {
    // Prepare query parameters
    const params = {
      address: location,
      key: process.env.GOOGLE_MAPS_API_KEY,
    };

    // Add country bias if provided (Google uses country code)
    if (countryBias) {
      params.components = `country:${countryBias}`;
    }

    // Make request to Google Geocoding API
    const response = await axios.get(GOOGLE_MAPS_API_URL, { params, timeout: 5000 });

    // Handle API errors
    if (response.data.status === 'ZERO_RESULTS') {
      throw new Error(`No results found for location: ${location}`);
    }

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status} - ${response.data.error_message || ''}`);
    }

    // Extract first result
    const result = response.data.results[0];
    const { lat, lng } = result.geometry.location;

    // Return standardized format
    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      formatted_address: result.formatted_address,
      place_name: result.address_components[0]?.long_name || location,
      provider: 'google',
      confidence: result.geometry.location_type === 'ROOFTOP' ? 1.0 : 0.5,
    };
  } catch (error) {
    if (error.message.includes('No results found')) {
      throw error;
    }
    throw new Error(`Google Maps geocoding error: ${error.message}`);
  }
};

/**
 * Reverse geocode (lat/lng to address)
 * Converts coordinates back to a human-readable address
 * 
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<{address: string, city: string, country: string}>}
 */
export const reverseGeocodeLocation = async (latitude, longitude) => {
  // Validate coordinates
  if (
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Invalid latitude or longitude values');
  }

  // Try Google Maps first (prioritized)
  if (process.env.GOOGLE_MAPS_API_KEY) {
    try {
      return await reverseGeocodeGoogle(latitude, longitude);
    } catch (error) {
      console.warn('Google Maps reverse geocoding failed, trying Mapbox:', error.message);
    }
  }

  // Try Mapbox
  const mapboxToken = getMapboxToken();
  if (mapboxToken) {
    try {
      return await reverseGeocodeMapbox(latitude, longitude, mapboxToken);
    } catch (error) {
      console.warn('Mapbox reverse geocoding failed:', error.message);
      throw error;
    }
  }



  throw new Error('Reverse geocoding service not configured');
};

/**
 * Reverse geocode using Mapbox
 * @private
 */
const reverseGeocodeMapbox = async (latitude, longitude, token) => {
  try {
    const params = {
      access_token: token || getMapboxToken(),
      limit: 1,
      types: 'place,region,address',
    };

    const response = await axios.get(
      `${MAPBOX_API_URL}/${longitude},${latitude}.json`,
      { params, timeout: 5000 }
    );

    if (!response.data.features || response.data.features.length === 0) {
      throw new Error('No address found for these coordinates');
    }

    const feature = response.data.features[0];
    return {
      address: feature.place_name,
      city: feature.context?.find((c) => c.id.includes('place'))?.text || '',
      country: feature.context?.find((c) => c.id.includes('country'))?.text || '',
      provider: 'mapbox',
    };
  } catch (error) {
    throw new Error(`Mapbox reverse geocoding error: ${error.message}`);
  }
};

/**
 * Reverse geocode using Google Maps
 * @private
 */
const reverseGeocodeGoogle = async (latitude, longitude) => {
  try {
    const params = {
      latlng: `${latitude},${longitude}`,
      key: process.env.GOOGLE_MAPS_API_KEY,
    };

    const response = await axios.get(GOOGLE_MAPS_API_URL, { params, timeout: 5000 });

    if (response.data.status === 'ZERO_RESULTS') {
      throw new Error('No address found for these coordinates');
    }

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const result = response.data.results[0];
    return {
      address: result.formatted_address,
      city: result.address_components.find((c) => c.types.includes('locality'))?.long_name || '',
      country: result.address_components.find((c) => c.types.includes('country'))?.long_name || '',
      provider: 'google',
    };
  } catch (error) {
    throw new Error(`Google Maps reverse geocoding error: ${error.message}`);
  }
};

/**
 * Validate if a location is in a specific country (optional)
 * 
 * @param {string} location - Location to validate
 * @param {string} countryCode - Expected country code
 * @returns {Promise<boolean>}
 */
export const isLocationInCountry = async (location, countryCode) => {
  try {
    const result = await geocodeLocation(location, countryCode);
    return !!result;
  } catch (error) {
    return false;
  }
};

export default {
  geocodeLocation,
  reverseGeocodeLocation,
  isLocationInCountry,
};
