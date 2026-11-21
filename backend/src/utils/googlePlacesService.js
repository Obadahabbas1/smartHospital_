import axios from 'axios';

const GOOGLE_PLACES_TEXT_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const GOOGLE_PLACES_NEARBY_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

import { reverseGeocodeLocation } from '../config/geocoder.js';

// Circuit Breaker State
let isGoogleApiDisabled = false;
let disableReason = '';
let reEnableTime = 0;

/**
 * Check if the Google API is currently in a "cooling off" period due to errors
 */
const checkGoogleApiStatus = () => {
  if (isGoogleApiDisabled) {
    if (Date.now() < reEnableTime) {
      return { disabled: true, reason: disableReason };
    }
    // Time expired, reset
    isGoogleApiDisabled = false;
    disableReason = '';
    reEnableTime = 0;
  }
  return { disabled: false };
};

/**
 * Disable Google API for a duration (default 5 mins)
 */
const disableGoogleApi = (reason, durationMs = 5 * 60 * 1000) => {
  isGoogleApiDisabled = true;
  disableReason = reason;
  reEnableTime = Date.now() + durationMs;
  console.error(`[CIRCUIT BREAKER] Google API disabled until ${new Date(reEnableTime).toLocaleTimeString()}. Reason: ${reason}`);
};

/**
 * Resolve the Google API Key from environment
 */
const getGoogleApiKey = () => {
  const envKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!envKey || envKey.startsWith('pk.') || envKey.length < 10) {
    return null;
  }
  return envKey;
};

/**
 * Maps a single Google Place result to our internal Hospital schema
 */
const mapGooglePlaceToHospital = (place) => {
  if (!place || !place.geometry || !place.geometry.location) return null;

  const lat = place.geometry.location.lat;
  const lon = place.geometry.location.lng;

  const fullAddress = place.formatted_address || place.vicinity || '';
  const addressParts = fullAddress.split(',').map((part) => part.trim());
  const city = addressParts.length > 1 ? addressParts[addressParts.length - 2] : '';
  const street = addressParts.length > 0 ? addressParts[0] : fullAddress;

  return {
    _id: `google-${place.place_id}`, 
    name: place.name || 'Medical Center / Clinic',
    slug: `google-dynamic-${place.place_id}`,
    description: `This hospital listing was dynamically fetched from Google Places. Reviews and some details might be limited or aggregated.`,
    email: '',
    phone: '', 
    website: '',
    address: {
      street: street,
      city: city || 'Unknown City',
      state: '',
      zipCode: '',
      country: '',
    },
    location: {
      type: 'Point',
      coordinates: [lon, lat], 
    },
    facilities: ['Emergency', 'OPD', 'General Care'],
    rating: {
      average: place.rating || 4.0,
      totalReviews: place.user_ratings_total || 0,
    },
    operatingHours: {
      is24Hours: place.opening_hours ? place.opening_hours.open_now : false,
    },
    imageUrl: place.photos && place.photos.length > 0
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${getGoogleApiKey()}`
      : '', 
    isDynamic: true,
    isVerified: false,
    isActive: true, 
  };
};

/**
 * Fetch hospitals dynamically using Google Places Text Search
 */
export const fetchHospitalsByTextGoogle = async (query, lat = null, lon = null, limit = 20) => {
  const status = checkGoogleApiStatus();
  if (status.disabled) return [];

  const apiKey = getGoogleApiKey();
  if (!apiKey) return [];

  try {
    const searchQuery = query.toLowerCase().includes('hospital') || query.toLowerCase().includes('clinic')
      ? query
      : `${query} hospitals`;

    const params = {
      query: searchQuery,
      key: apiKey,
      region: 'IN'
    };

    const response = await axios.get(GOOGLE_PLACES_TEXT_SEARCH_URL, { params, timeout: 8000 });

    if (response.data.status !== 'OK') {
      const apiStatus = response.data.status;
      const errorMsg = response.data.error_message || 'No additional info';
      
      console.error(`[GOOGLE_PLACES_ERROR] Status: ${apiStatus} - Message: ${errorMsg}`);
      
      if (apiStatus === 'REQUEST_DENIED') {
        console.warn('⚠️ ACTION REQUIRED: Ensure "Places API" is ENABLED in Google Cloud Console.');
        disableGoogleApi(`${apiStatus}: ${errorMsg}`, 1 * 60 * 1000); // 1 min ignore
      } else if (apiStatus === 'OVER_QUERY_LIMIT' || apiStatus === 'INVALID_REQUEST') {
        disableGoogleApi(apiStatus);
      }
      return [];
    }

    return response.data.results
      .map(mapGooglePlaceToHospital)
      .filter((h) => h !== null)
      .slice(0, limit);
  } catch (error) {
    console.error('Google Places Dynamic Text Fetching Error:', error.message);
    return [];
  }
};

/**
 * Fetch hospitals dynamically using Google Places Nearby Search
 */
export const fetchHospitalsNearbyGoogle = async (lat, lon, radius = 10, limit = 20) => {
  const status = checkGoogleApiStatus();
  if (status.disabled) return [];

  const apiKey = getGoogleApiKey();
  if (!apiKey) return [];

  /*
  let cityDetected = '';
  try {
    const rev = await reverseGeocodeLocation(lat, lon);
    if (rev && rev.city) cityDetected = rev.city;
  } catch (e) {}
  */

  try {
    const params = {
      location: `${lat},${lon}`,
      radius: Math.min(radius * 1000, 50000), // Max 50km for Google
      type: 'hospital',
      key: apiKey,
    };

    const response = await axios.get(GOOGLE_PLACES_NEARBY_SEARCH_URL, { params, timeout: 8000 });

    if (response.data.status !== 'OK') {
      const apiStatus = response.data.status;
      const errorMsg = response.data.error_message || 'No additional info';
      
      console.error(`[GOOGLE_NEARBY_ERROR] Status: ${apiStatus} - Message: ${errorMsg}`);
      
      if (apiStatus === 'REQUEST_DENIED') {
        console.warn('⚠️ ACTION REQUIRED: Ensure "Places API" is ENABLED in Google Cloud Console.');
        disableGoogleApi(`${apiStatus}: ${errorMsg}`, 1 * 60 * 1000);
      } else if (apiStatus === 'OVER_QUERY_LIMIT') {
        disableGoogleApi(apiStatus);
      }
      return [];
    }

    const hospitals = response.data.results
      .map(mapGooglePlaceToHospital)
      .filter((h) => h !== null)
      .map(h => {
        /*
        if (!h.address.city || h.address.city === 'Unknown City') {
          h.address.city = cityDetected || 'Unknown City';
        }
        */
        return h;
      })
      .slice(0, limit);

    // Haversine distance
    const R = 6371;
    hospitals.forEach((h) => {
      const hLat = h.location.coordinates[1];
      const hLon = h.location.coordinates[0];
      const rad1 = (lat * Math.PI) / 180;
      const rad2 = (hLat * Math.PI) / 180;
      const deltaLat = ((hLat - lat) * Math.PI) / 180;
      const deltaLon = ((hLon - lon) * Math.PI) / 180;

      const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(rad1) * Math.cos(rad2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      h.distance = Math.round(R * c * 100) / 100;
    });

    return hospitals.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Google Places Dynamic Nearby Fetching Error:', error.message);
    return [];
  }
};

/**
 * Fetch a single hospital's details dynamically using Google Places Details API
 */
export const fetchHospitalDetailsFromGoogle = async (placeId) => {
  const status = checkGoogleApiStatus();
  if (status.disabled) return null;

  const apiKey = getGoogleApiKey();
  if (!apiKey) return null;

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        key: apiKey,
        fields: 'name,rating,formatted_phone_number,formatted_address,geometry,opening_hours,website,photos,user_ratings_total'
      },
      timeout: 8000
    });

    if (response.data.status !== 'OK') {
      const apiStatus = response.data.status;
      if (apiStatus === 'REQUEST_DENIED' || apiStatus === 'OVER_QUERY_LIMIT') {
        disableGoogleApi(apiStatus);
      }
      return null;
    }

    const place = response.data.result;
    const fullAddress = place.formatted_address || '';
    const addressParts = fullAddress.split(',').map((part) => part.trim());
    const city = addressParts.length > 1 ? addressParts[addressParts.length - 2] : '';
    const street = addressParts.length > 0 ? addressParts[0] : fullAddress;

    return {
      _id: `google-${placeId}`,
      name: place.name || 'Medical Center / Clinic',
      slug: `google-dynamic-${placeId}`,
      description: `This hospital listing was dynamically fetched from Google Places. Reviews and some details might be limited or aggregated.`,
      email: '',
      phone: place.formatted_phone_number || '',
      website: place.website || '',
      address: {
        street: street,
        city: city || 'Unknown City',
        state: '',
        zipCode: '',
        country: '',
      },
      location: {
        type: 'Point',
        coordinates: [place.geometry?.location?.lng || 0, place.geometry?.location?.lat || 0],
      },
      facilities: ['Emergency', 'OPD', 'General Care'],
      rating: {
        average: place.rating || 4.0,
        totalReviews: place.user_ratings_total || 0,
      },
      operatingHours: {
        is24Hours: place.opening_hours ? place.opening_hours.open_now : false,
      },
      imageUrl: place.photos && place.photos.length > 0
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`
        : '',
      isDynamic: true,
      isVerified: false,
      isActive: true,
    };
  } catch (error) {
    console.error('Google Places Dynamic Details Fetching Error:', error.message);
    return null;
  }
};
