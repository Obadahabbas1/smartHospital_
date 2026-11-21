import axios from 'axios';
import { geocodeLocation, reverseGeocodeLocation } from '../config/geocoder.js';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let currentMirrorIndex = 0;

/**
 * Ultra-fast Overpass racing mechanism
 * Hits the top 2 mirrors simultaneously and takes the first successful response.
 */
const postOverpass = async (query, timeoutMs = 15000) => {
  // Use ALL 5 mirrors for racing for maximum success chance
  const mirrors = OVERPASS_ENDPOINTS;

  const controller = new AbortController();
  const makeRequest = async (endpoint, index) => {
    try {
      const resp = await axios.post(endpoint, query, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SmartHospital/2.0 (Hospital Search Agent)',
        },
        timeout: timeoutMs,
        signal: controller.signal,
      });
      // If we win the race, update the global mirror index for next time
      currentMirrorIndex = (currentMirrorIndex + index) % OVERPASS_ENDPOINTS.length;
      controller.abort(); // Cancel other mirrors to save server resources
      return resp;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  };

  try {
    // Race mirrors - return the first one that succeeds
    const results = await Promise.any(mirrors.map((url, idx) => makeRequest(url, idx)));
    if (!results) throw new Error('OSM request aborted without results.');
    return results;
  } catch (err) {
    // If all mirrors in the race fail
    throw new Error(`OSM mirrors failed. Timeout: ${timeoutMs}ms. Error: ${err.message}`);
  }
};

/**
 * Heuristic: if a search term has many words or contains typical hospital keywords
 */
const looksLikeHospitalName = (term) => {
  if (!term) return false;
  const words = term.trim().split(/\s+/);
  if (words.length >= 3) return true;
  const hospitalKeywords = /hospital|clinic|medical|centre|center|health|care|super|speciality|specialty/i;
  return hospitalKeywords.test(term);
};

/**
 * Fetch hospitals dynamically from OpenStreetMap (Overpass API)
 */
export const fetchDynamicHospitalsFromOSM = async (searchName, lat = null, lon = null, radius = 10, limit = 20) => {
  try {
    let overpassQuery = ``;
    const escapedName = searchName ? searchName.replace(/"/g, '\\"') : '';
    const uiLimit = Number(limit) || 20;
    const overpassLimit = Math.min(uiLimit * 4, 100);

    let latToUse = lat;
    let lonToUse = lon;
    let countryDetected = 'India'; 
    let cityDetected = '';

    // 1. Resolve Search Anchor: Priorities the searchName if it looks like a city/area search
    if (searchName && searchName.length >= 3) {
      try {
        const geoResult = await geocodeLocation(searchName);
        if (geoResult) {
          latToUse = geoResult.latitude;
          lonToUse = geoResult.longitude;
          cityDetected = geoResult.city || (searchName.split(',')[0]);
        }
      } catch (err) {
        console.warn('Geocoding for OSM search failed:', err.message);
        // Fallback to passed lat/lng if geocoding fails
        if (!latToUse || !lonToUse) {
            latToUse = lat;
            lonToUse = lon;
        }
      }
    } else {
        latToUse = lat;
        lonToUse = lon;
    }

    // 3. Build Query
    if (latToUse && lonToUse) {
      // Radius safeguard: cap at 30km for list view to keep it fast
      const radiusMeters = Math.min(radius * 1000, 30000); 
      overpassQuery = `
        [out:json][timeout:15];
        (
          node["amenity"~"hospital|clinic|medical_centre|medical_center"](around:${radiusMeters},${latToUse},${lonToUse});
          way["amenity"~"hospital|clinic|medical_centre|medical_center"](around:${radiusMeters},${latToUse},${lonToUse});
          relation["amenity"~"hospital|clinic|medical_centre|medical_center"](around:${radiusMeters},${latToUse},${lonToUse});
          node["healthcare"]["name"~"${escapedName}",i](around:${radiusMeters * 1.5},${latToUse},${lonToUse});
        );
        out center ${overpassLimit};
        >;
        out skel qt;
      `;
    } else if (searchName && searchName.length >= 3) {
      if (looksLikeHospitalName(searchName)) {
        overpassQuery = `
          [out:json][timeout:25];
          (
            node["amenity"~"hospital|clinic|medical_centre|medical_center"]["name"~"${escapedName}",i];
            way["amenity"~"hospital|clinic|medical_centre|medical_center"]["name"~"${escapedName}",i];
            relation["amenity"~"hospital|clinic|medical_centre|medical_center"]["name"~"${escapedName}",i];
            node["healthcare"]["name"~"${escapedName}",i];
            way["healthcare"]["name"~"${escapedName}",i];
          );
          out center ${overpassLimit};
          >;
          out skel qt;
        `;
      } else {
        overpassQuery = `
          [out:json][timeout:25];
          area["name"="${escapedName}"]->.searchArea;
          (
            node["amenity"~"hospital|clinic|medical_centre|medical_center"](area.searchArea);
            way["amenity"~"hospital|clinic|medical_centre|medical_center"](area.searchArea);
            relation["amenity"~"hospital|clinic|medical_centre|medical_center"](area.searchArea);
          );
          out center ${overpassLimit};
          >;
          out skel qt;
        `;
      }
    } else {
      return [];
    }

    const response = await postOverpass(overpassQuery, 15000); 
    const elements = response.data?.elements || [];

    return elements
      .filter((el) => el.tags)
      .map((el) => {
        const hLat = el.lat || el.center?.lat;
        const hLon = el.lon || el.center?.lon;
        if (!hLat || !hLon) return null;

        return {
          _id: `osm-${el.id}`,
          name: el.tags.name || el.tags.operator || 'Medical Center / Clinic',
          slug: `osm-dynamic-${el.id}`,
          description: `Automatically found dynamic listing via OSM. Features and reviews are aggregated placeholders.`,
          email: el.tags.email || el.tags['contact:email'] || '',
          phone: el.tags.phone || el.tags['contact:phone'] || '',
          website: el.tags.website || el.tags['contact:website'] || '',
          address: {
            street: el.tags['addr:street'] || '',
            city: el.tags['addr:city'] || cityDetected || (searchName && !looksLikeHospitalName(searchName) ? searchName : ''),
            state: el.tags['addr:state'] || '',
            zipCode: el.tags['addr:postcode'] || '',
            country: el.tags['addr:country'] || countryDetected,
          },
          location: {
            type: 'Point',
            coordinates: [hLon, hLat],
          },
          facilities: ['Emergency', 'OPD', 'General Care'],
          rating: {
            average: 4.1,
            totalReviews: Math.floor(Math.random() * 50) + 5,
          },
          operatingHours: {
            is24Hours: el.tags.emergency === 'yes' || el.tags.opening_hours === '24/7',
          },
          isDynamic: true,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.warn(`Overpass Dynamic Fetch Failed for "${searchName}":`, error.message);
    return [];
  }
};

/**
 * Fetch a single dynamic hospital from OpenStreetMap (Overpass API) by OSM ID
 */
export const fetchHospitalDetailsFromOSM = async (osmId) => {
  try {
    const overpassQuery = `
      [out:json][timeout:15];
      (
        node(${osmId});
        way(${osmId});
        relation(${osmId});
      );
      out center;
      >;
      out skel qt;
    `;

    const response = await postOverpass(overpassQuery, 15000);
    const elements = response.data?.elements || [];
    const el = elements.find(e => e.id.toString() === osmId && e.tags);

    if (!el) return null;

    const lat = el.lat || el.center?.lat;
    const lon = el.lon || el.center?.lon;
    if (!lat || !lon) return null;

    // Detect country for details too
    let country = 'India';
    try {
      const rev = await reverseGeocodeLocation(lat, lon);
      if (rev?.country) country = rev.country;
    } catch (e) {}

    return {
      _id: `osm-${el.id}`,
      name: el.tags.name || 'Medical Center / Clinic',
      slug: `osm-dynamic-${el.id}`,
      description: `Automatically found dynamic listing via OSM. Features and reviews are aggregated placeholders.`,
      email: el.tags.email || '',
      phone: el.tags.phone || el.tags['contact:phone'] || '',
      website: el.tags.website || el.tags['contact:website'] || '',
      address: {
        street: el.tags['addr:street'] || '',
        city: el.tags['addr:city'] || '',
        state: el.tags['addr:state'] || '',
        zipCode: el.tags['addr:postcode'] || '',
        country: el.tags['addr:country'] || country,
      },
      location: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      facilities: ['Emergency', 'OPD', 'General Care'],
      rating: {
        average: 4.1,
        totalReviews: 24,
      },
      operatingHours: {
        is24Hours: el.tags.emergency === 'yes' || el.tags.opening_hours === '24/7',
      },
      isDynamic: true,
      isActive: true,
    };
  } catch (error) {
    console.error('Overpass API Details Fetch Error:', error.message);
    return null;
  }
};
