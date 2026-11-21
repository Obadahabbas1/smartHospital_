import Hospital from '../models/Hospital.js';
import Review from '../models/Review.js';
import Pricing from '../models/Pricing.js';
import { geocodeLocation } from '../config/geocoder.js';
import { getFacilitiesForDisease } from '../utils/diseaseMapping.js';
import { getEstimatedPriceForDisease } from '../utils/diseasePricing.js';
import { fetchDynamicHospitalsFromOSM, fetchHospitalDetailsFromOSM } from '../utils/overpassService.js';
import { fetchHospitalsNearbyGoogle, fetchHospitalsByTextGoogle, fetchHospitalDetailsFromGoogle } from '../utils/googlePlacesService.js';
import { cacheDynamicHospitalsToMongo } from '../utils/dynamicHospitalCache.js';
import mongoose from 'mongoose';

/**
 * Helper: Attach disease-based pricing to a list of hospitals.
 * Tries actual Pricing records first, falls back to estimated prices.
 * @param {Array} hospitals - Array of hospital objects
 * @param {string} disease - Disease/condition name
 * @returns {Promise<Array>} - Hospitals with diseasePrice attached
 */
const attachDiseasePricing = async (hospitals, disease) => {
  if (!disease || hospitals.length === 0) return hospitals;

  const estimatedPrice = getEstimatedPriceForDisease(disease);
  const facilitiesForDisease = getFacilitiesForDisease(disease);

  // Map department names from disease facilities
  const departmentMap = {
    'Cardiology': 'Cardiology', 'Neurology': 'Neurology', 'Orthopedics': 'Orthopedics',
    'Pediatrics': 'Pediatrics', 'Maternity': 'Maternity', 'Oncology': 'Oncology',
    'ENT': 'ENT', 'Dental': 'Dental', 'OPD': 'OPD', 'Emergency': 'Emergency',
    'Surgery': 'Surgery', 'ICU': 'ICU', 'Lab': 'Lab', 'Imaging': 'Imaging',
    'Physiotherapy': 'Physiotherapy', 'Diagnostics': 'Diagnostics',
    'Urology': 'Urology', 'Psychiatry': 'Psychiatry',
  };
  const departments = facilitiesForDisease
    .map(f => departmentMap[f])
    .filter(Boolean);

  // Collect valid MongoDB ObjectIds for batch pricing lookup
  const validIds = hospitals
    .filter(h => h._id && mongoose.Types.ObjectId.isValid(String(h._id)))
    .map(h => new mongoose.Types.ObjectId(String(h._id)));

  // Batch fetch actual pricing from DB
  let pricingByHospital = {};
  if (validIds.length > 0 && departments.length > 0) {
    try {
      const pricingRecords = await Pricing.find({
        hospitalId: { $in: validIds },
        department: { $in: departments },
        isActive: true,
      }).select('hospitalId finalPrice basePrice serviceName department').lean();

      for (const p of pricingRecords) {
        const hid = String(p.hospitalId);
        if (!pricingByHospital[hid]) pricingByHospital[hid] = [];
        pricingByHospital[hid].push(p);
      }
    } catch (err) {
      // Pricing lookup failed — proceed with estimates
      console.warn('Pricing lookup failed, using estimates:', err.message);
    }
  }

  return hospitals.map(h => {
    const hid = String(h._id);
    const actualPricings = pricingByHospital[hid];

    if (actualPricings && actualPricings.length > 0) {
      const prices = actualPricings.map(p => p.finalPrice);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const avgP = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      return {
        ...h,
        diseasePrice: {
          min: minP,
          max: maxP,
          avg: avgP,
          label: estimatedPrice?.label || `${disease} Treatment`,
          source: 'actual',
          serviceCount: actualPricings.length,
        },
      };
    }

    // Use estimated price (add slight random variance per hospital for realism)
    if (estimatedPrice) {
      // Create a deterministic variance based on hospital name hash
      const nameHash = hid.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const variance = 0.8 + (nameHash % 40) / 100; // 0.80 to 1.19
      return {
        ...h,
        diseasePrice: {
          min: Math.round(estimatedPrice.min * variance),
          max: Math.round(estimatedPrice.max * variance),
          avg: Math.round(estimatedPrice.avg * variance),
          label: estimatedPrice.label,
          source: 'estimated',
        },
      };
    }

    return h;
  });
};

/**
 * Fuzzy de-duplication by name and geographic proximity
 * Prevents same hospital from multiple providers appearing twice.
 */
const fuzzyDedup = (hospitals) => {
  const seen = [];
  return hospitals.filter((h) => {
    const name = (h.name || '').toLowerCase();
    // Normalize: remove common hospital words to match "Apollo" vs "Apollo Hospital"
    const normName = name.replace(/hospital|clinic|medical|centre|center|care|health/g, '').replace(/[^a-z0-9]/g, '').trim();

    const coords = h.location?.coordinates || [0, 0];
    const lng = coords[0];
    const lat = coords[1];

    const duplicate = seen.find((s) => {
      // Coordinate match within ~150 meters (0.0015 deg lat/lng)
      const latDiff = Math.abs(lat - s.lat);
      const lngDiff = Math.abs(lng - s.lng);
      const distMatch = latDiff < 0.0015 && lngDiff < 0.0015;

      // Name fuzzy match
      const nameMatch = normName.includes(s.normName) || s.normName.includes(normName);

      return distMatch && nameMatch;
    });

    if (duplicate) return false;
    seen.push({ lat, lng, normName });
    return true;
  });
};

/**
 * Search hospitals near user's GPS location (Geospatial)
 * GET /api/hospitals/nearby?latitude=28.7041&longitude=77.1025&radius=10&page=1&limit=20
 *
 * Query Parameters:
 * - latitude (required): User's latitude (-90 to 90)
 * - longitude (required): User's longitude (-180 to 180)
 * - radius (optional): Search radius in km (default: 10)
 * - maxDistance (optional): Alternative to radius in meters
 * - page (optional): Page number (default: 1)
 * - limit (optional): Results per page (default: 20)
 * - facilities (optional): Comma-separated facility names to filter
 * - minRating (optional): Minimum hospital rating (1-5)
 * - sortBy (optional): Sort parameter (distance, rating, newest)
 */
export const searchNearby = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius,
      maxDistance,
      page = 1,
      limit = 20,
      facilities,
      disease,
      minRating,
      sortBy = 'distance'
    } = req.query;

    // Validate coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'Latitude and longitude are required',
        code: 'INVALID_COORDINATES',
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid latitude or longitude values',
        code: 'INVALID_COORDINATES',
      });
    }

    // Calculate search distance in meters
    // Default: 10 km, or use provided maxDistance/radius
    let searchDistance = 10 * 1000; // 10 km in meters
    if (maxDistance) {
      searchDistance = parseInt(maxDistance, 10);
    } else if (radius) {
      const parsedRadius = parseInt(radius, 10);
      if (!isNaN(parsedRadius) && parsedRadius > 0) {
        searchDistance = parsedRadius * 1000; // Convert km to meters
      }
    }

    // Build geospatial query
    const geoQuery = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat], // Note: [longitude, latitude]
          },
          $maxDistance: searchDistance,
        },
      },
    };

    // Add filters to query
    let query = geoQuery;

    // Filter by facilities if provided
    if (facilities || disease) {
      const facilityList = facilities ? facilities.split(',').map((f) => f.trim()) : [];

      // If disease is provided, map it to facilities and add to the list
      if (disease) {
        const mappedFacilities = getFacilitiesForDisease(disease);
        if (mappedFacilities.length > 0) {
          facilityList.push(...mappedFacilities);
        }
      }

      if (facilityList.length > 0) {
        query.facilities = { $in: [...new Set(facilityList)] };
      }
    }

    // Filter by minimum rating
    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    // Only show active hospitals
    query.isActive = true;

    // Execute query
    const skip = (page - 1) * limit;

    // Build aggregation pipeline for better control
    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          distanceField: 'distance', // Add calculated distance to each document
          maxDistance: searchDistance,
          spherical: true, // Use spherical geometry
          query: {
            isActive: true,
            // (isVerified removed so your seeded data shows up)
            ...(facilities || disease ? {
              facilities: {
                $in: [
                  ...(facilities ? facilities.split(',').map((f) => f.trim()) : []),
                  ...(disease ? getFacilitiesForDisease(disease) : [])
                ].filter(Boolean)
              }
            } : {}),
            ...(minRating && { 'rating.average': { $gte: parseFloat(minRating) } }),
          },
        },
      },
      // Sort by requested parameter
      ...(sortBy === 'rating' ? [{ $sort: { 'rating.average': -1 } }] : [{ $sort: { distance: 1 } }]),
      // Add pagination
      { $skip: skip },
      { $limit: parseInt(limit) },
      // Project selected fields
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          description: 1,
          email: 1,
          phone: 1,
          address: 1,
          location: 1,
          distance: 1, // In meters
          facilities: 1,
          rating: 1,
          imageUrl: 1,
          operatingHours: 1,
          isVerified: 1,
          website: 1,
        },
      },
    ];

    // Execute query
    const hospitals = await Hospital.aggregate(pipeline);

    // Get total count for pagination using a separate count aggregation
    const countPipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          distanceField: 'distance',
          maxDistance: searchDistance,
          spherical: true,
          query: pipeline[0].$geoNear.query,
        },
      },
      { $count: 'total' },
    ];

    const countResult = await Hospital.aggregate(countPipeline);
    let totalCount = countResult.length > 0 ? countResult[0].total : 0;

    const hospitalsWithKmDistanceLocal = hospitals.map((h) => ({
      ...h,
      distance: Math.round((h.distance / 1000) * 100) / 100, // Convert to km and round to 2 decimals
    }));

    // If MongoDB returns too few hospitals or radius is large, augment with dynamic sources.
    const minLocalResults = Math.min(parseInt(limit), 8);
    const radiusKm = Number(radius) || searchDistance / 1000;

    const needsDynamic = hospitalsWithKmDistanceLocal.length < minLocalResults || radiusKm >= 50;

    let hospitalsWithKmDistance = hospitalsWithKmDistanceLocal;

    if (needsDynamic) {
      try {
        // Parallelize external API calls for maximum performance
        const dynamicResponses = await Promise.allSettled([
          fetchHospitalsNearbyGoogle(lat, lng, radiusKm, limit),
          fetchDynamicHospitalsFromOSM(null, lat, lng, radiusKm, limit)
        ]);

        const dynamicHospitals = dynamicResponses
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value || []);

        if (dynamicHospitals.length > 0) {
          const facilityListForRequest = (() => {
            const list = facilities ? facilities.split(',').map((f) => f.trim()).filter(Boolean) : [];
            if (disease) list.push(...getFacilitiesForDisease(disease));
            return [...new Set(list)];
          })();

          const facilitiesToMerge = facilityListForRequest.length > 0 ? facilityListForRequest : ['Emergency', 'OPD', 'General Care'];

          // Attach distance to dynamic results
          const hospitalsWithProcessedDistance = dynamicHospitals.map((h) => {
            if (h.distance != null) return h;

            const hLat = h.location?.coordinates?.[1];
            const hLon = h.location?.coordinates?.[0];
            if (typeof hLat === 'number' && typeof hLon === 'number') {
              const R = 6371;
              const rad1 = lat * Math.PI / 180;
              const rad2 = hLat * Math.PI / 180;
              const deltaLat = (hLat - lat) * Math.PI / 180;
              const deltaLon = (hLon - lng) * Math.PI / 180;
              const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(rad1) * Math.cos(rad2) *
                Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              return { ...h, distance: Math.round(R * c * 100) / 100 };
            }
            return h;
          });

          // BACKGROUND THE CACHING: Return results to user immediately, save in background
          cacheDynamicHospitalsToMongo(hospitalsWithProcessedDistance, {
            extraFacilities: facilitiesToMerge,
          }).catch(err => console.warn('Background caching failed:', err.message));

          // Merge with unique logic
          const combinedHospitals = [...hospitalsWithKmDistanceLocal, ...hospitalsWithProcessedDistance];

          // Fuzzy de-duplication
          const uniqueHospitals = fuzzyDedup(combinedHospitals);

          uniqueHospitals.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
          hospitalsWithKmDistance = uniqueHospitals.slice(0, parseInt(limit));
          totalCount = Math.max(totalCount, hospitalsWithKmDistance.length);
        }
      } catch (err) {
        console.warn('Dynamic search augmentation failed:', err.message);
      }
    }

    // Attach disease-based pricing to results
    const hospitalsWithPricing = await attachDiseasePricing(hospitalsWithKmDistance, disease);

    return res.status(200).json({
      status: 'success',
      code: 'SEARCH_NEARBY_SUCCESS',
      message: `Found ${hospitalsWithPricing.length} hospitals near your location`,
      data: {
        hospitals: hospitalsWithPricing,
        searchedDisease: disease || null,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        searchArea: {
          latitude: lat,
          longitude: lng,
          radius: searchDistance / 1000, // In km
        },
      },
    });
  } catch (error) {
    console.error('Search nearby error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error searching nearby hospitals',
      code: 'SEARCH_ERROR',
      error: error.message,
    });
  }
};

/**
 * Search hospitals by name or location (Text search)
 * GET /api/hospitals/search?q=apollo&city=delhi&page=1&limit=20&sortBy=rating
 *
 * Query Parameters:
 * - q (optional): Search query (hospital name, location, specialty)
 * - city (optional): Filter by city
 * - page (optional): Page number (default: 1)
 * - limit (optional): Results per page (default: 20)
 * - minRating (optional): Minimum hospital rating
 * - sortBy (optional): Sort parameter (rating, newest, name)
 */
export const searchHospitals = async (req, res) => {
  try {
    const { q, disease, city, facilities, page = 1, limit = 20, minRating, sortBy = 'rating', latitude, longitude } = req.query;

    let query = { isActive: true };

    // Text search if query provided
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { 'address.city': { $regex: q, $options: 'i' } },
        { 'address.state': { $regex: q, $options: 'i' } }
      ];
    }

    // Filter by city
    if (city) {
      query['address.city'] = { $regex: city, $options: 'i' };
    }

    // Filter by facilities and disease
    if (facilities || disease) {
      const facilityList = facilities ? facilities.split(',').map((f) => f.trim()) : [];

      // If disease is provided, map it to facilities and add to the list
      if (disease) {
        const mappedFacilities = getFacilitiesForDisease(disease);
        if (mappedFacilities.length > 0) {
          facilityList.push(...mappedFacilities);
        }
      }

      if (facilityList.length > 0) {
        query.facilities = { $in: [...new Set(facilityList)] };
      }
    }

    // Filter by minimum rating
    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    // Build sort object
    let sortObj = { 'rating.average': -1 }; // Default: sort by rating
    if (sortBy === 'newest') {
      sortObj = { createdAt: -1 };
    } else if (sortBy === 'name') {
      sortObj = { name: 1 };
    }

    const skip = (page - 1) * limit;

    // Fetch hospitals
    const hospitals = await Hospital.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('_id name slug description email phone address facilities rating imageUrl operatingHours isVerified website location');

    // Get total count
    const totalCount = await Hospital.countDocuments(query);

    let processedHospitals = hospitals.map((h) => h.toObject());
    let total = totalCount;

    if (processedHospitals.length < 5 && (q || disease)) {
      try {
        const textParts = [];
        if (disease) textParts.push(disease);
        if (q) textParts.push(q);
        const searchQuery = textParts.length > 0 ? textParts.join(' ') : 'Hospitals';

        // Parallel fetching for text search
        const dynamicResponses = await Promise.allSettled([
          fetchHospitalsByTextGoogle(searchQuery, latitude || null, longitude || null, limit),
          fetchDynamicHospitalsFromOSM(q || searchQuery, latitude || null, longitude || null, 25, limit)
        ]);

        const dynamicHospitals = dynamicResponses
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value || []);

        if (dynamicHospitals.length > 0) {
          const facilityList = (() => {
            const list = facilities ? facilities.split(',').map((f) => f.trim()).filter(Boolean) : [];
            if (disease) list.push(...getFacilitiesForDisease(disease));
            return [...new Set(list)];
          })();

          // Background caching
          cacheDynamicHospitalsToMongo(dynamicHospitals, {
            extraFacilities: facilityList,
            defaultCity: city || (q ? String(q).slice(0, 60) : 'Unknown City'),
          }).catch(err => console.warn('Background text caching failed:', err.message));

          // Merge and fuzzy dedup
          const combined = [...processedHospitals, ...dynamicHospitals];
          processedHospitals = fuzzyDedup(combined).slice(0, parseInt(limit));
          total = Math.max(total, processedHospitals.length);
        }
      } catch (err) {
        console.error('Text search dynamic fallback failed:', err.message);
      }
    }

    // Always calculate distance if coordinates provided, even for local results
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        processedHospitals = processedHospitals.map((h) => {
          if (h.location && h.location.coordinates && h.location.coordinates.length === 2) {
            const hLat = h.location.coordinates[1];
            const hLon = h.location.coordinates[0];
            const R = 6371;
            const rad1 = lat * Math.PI / 180;
            const rad2 = hLat * Math.PI / 180;
            const deltaLat = (hLat - lat) * Math.PI / 180;
            const deltaLon = (hLon - lng) * Math.PI / 180;
            const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(rad1) * Math.cos(rad2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            h.distance = Math.round(R * c * 100) / 100;
          }
          return h;
        });
      }
    }

    // Attach disease-based pricing to results
    const hospitalsWithPricing = await attachDiseasePricing(processedHospitals, disease);

    return res.status(200).json({
      status: 'success',
      code: 'SEARCH_SUCCESS',
      message: `Found ${hospitals.length} hospitals matching your search`,
      data: {
        hospitals: hospitalsWithPricing,
        searchedDisease: disease || null,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          searchQuery: q || disease || null,
          city: city || null,
          minRating: minRating || null,
        },
      },
    });
  } catch (error) {
    console.error('Search hospitals error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error searching hospitals',
      code: 'SEARCH_ERROR',
      error: error.message,
    });
  }
};

/**
 * Get hospital details by ID
 * GET /api/hospitals/614d6e3c1c8f9e4a8c4d8e8b
 *
 * Returns: Hospital details with reviews summary
 */
export const getHospitalDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { disease } = req.query;

    // Get disease pricing info if disease is provided
    const diseasePrice = disease ? getEstimatedPriceForDisease(disease) : null;

    const buildDynamicHospitalStub = (dynamicId, kind) => {
      if (kind === 'osm') {
        return {
          _id: dynamicId,
          name: 'Medical Center / Clinic',
          slug: `osm-dynamic-${dynamicId.replace(/^osm-/, '')}`,
          description: 'Dynamic OpenStreetMap hospital (placeholder).',
          email: '',
          phone: '',
          website: '',
          facilities: ['Emergency', 'OPD', 'General Care'],
          rating: { average: 0, totalReviews: 0 },
          isDynamic: true,
          isVerified: false,
          isActive: true,
        };
      }

      // google
      return {
        _id: dynamicId,
        name: 'Medical Center / Clinic',
        slug: `google-dynamic-${dynamicId.replace(/^google-/, '')}`,
        description: 'Dynamic Google hospital (placeholder).',
        email: '',
        phone: '',
        website: '',
        facilities: ['Emergency', 'OPD', 'General Care'],
        rating: { average: 0, totalReviews: 0 },
        isDynamic: true,
        isVerified: false,
        isActive: true,
      };
    };

    // 1. Check if ID corresponds to a dynamically fetched OSM Hospital
    if (id.startsWith('osm-')) {
      const osmId = id.replace('osm-', '');
      const dynamicHospital = await fetchHospitalDetailsFromOSM(osmId);

      if (!dynamicHospital) {
        const stubHospital = buildDynamicHospitalStub(id, 'osm');
        return res.status(200).json({
          status: 'success',
          code: 'HOSPITAL_DETAILS_SUCCESS',
          message: 'Dynamic hospital details retrieved successfully (placeholder)',
          data: {
            hospital: stubHospital,
            recentReviews: [],
            distanceFromUser: null,
            totalReviews: 0,
            averageRating: 0,
          },
        });
      }

      // Calculate distance if requested
      let distanceFromUser = null;
      if (req.query.latitude && req.query.longitude && dynamicHospital.location) {
        const lat = parseFloat(req.query.latitude);
        const lng = parseFloat(req.query.longitude);
        const hLat = dynamicHospital.location.coordinates[1];
        const hLon = dynamicHospital.location.coordinates[0];

        const R = 6371;
        const rad1 = lat * Math.PI / 180;
        const rad2 = hLat * Math.PI / 180;
        const deltaLat = (hLat - lat) * Math.PI / 180;
        const deltaLon = (hLon - lng) * Math.PI / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(rad1) * Math.cos(rad2) *
          Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceFromUser = Math.round(R * c * 100) / 100;
      }

      return res.status(200).json({
        status: 'success',
        code: 'HOSPITAL_DETAILS_SUCCESS',
        message: 'Dynamic hospital details retrieved successfully',
        data: {
          hospital: dynamicHospital,
          recentReviews: [], // No DB reviews for dynamic places yet
          distanceFromUser,
          totalReviews: dynamicHospital.rating?.totalReviews ?? 0,
          averageRating: dynamicHospital.rating?.average ?? 0,
          diseasePrice: diseasePrice ? { ...diseasePrice, disease, source: 'estimated' } : null,
        },
      });
    }

    // 2. Check if ID corresponds to a dynamically fetched Google Place
    if (id.startsWith('google-')) {
      const placeId = id.replace('google-', '');
      const dynamicHospital = await fetchHospitalDetailsFromGoogle(placeId);

      if (!dynamicHospital) {
        const stubHospital = buildDynamicHospitalStub(id, 'google');
        return res.status(200).json({
          status: 'success',
          code: 'HOSPITAL_DETAILS_SUCCESS',
          message: 'Dynamic hospital details retrieved successfully (placeholder)',
          data: {
            hospital: stubHospital,
            recentReviews: [],
            distanceFromUser: null,
            totalReviews: 0,
            averageRating: 0,
          },
        });
      }

      // Calculate distance if requested
      let distanceFromUser = null;
      if (req.query.latitude && req.query.longitude && dynamicHospital.location) {
        const lat = parseFloat(req.query.latitude);
        const lng = parseFloat(req.query.longitude);
        const hLat = dynamicHospital.location.coordinates[1];
        const hLon = dynamicHospital.location.coordinates[0];

        const R = 6371;
        const rad1 = lat * Math.PI / 180;
        const rad2 = hLat * Math.PI / 180;
        const deltaLat = (hLat - lat) * Math.PI / 180;
        const deltaLon = (hLon - lng) * Math.PI / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(rad1) * Math.cos(rad2) *
          Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceFromUser = Math.round(R * c * 100) / 100;
      }

      return res.status(200).json({
        status: 'success',
        code: 'HOSPITAL_DETAILS_SUCCESS',
        message: 'Dynamic hospital details retrieved successfully',
        data: {
          hospital: dynamicHospital,
          recentReviews: [], // No DB reviews for dynamic places yet
          distanceFromUser,
          totalReviews: dynamicHospital.rating?.totalReviews ?? 0,
          averageRating: dynamicHospital.rating?.average ?? 0,
          diseasePrice: diseasePrice ? { ...diseasePrice, disease, source: 'estimated' } : null,
        },
      });
    }

    // 3. Fallback to Local MongoDB - Verify valid ObjectId first
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid hospital ID format',
        code: 'INVALID_ID_FORMAT',
      });
    }

    const hospital = await Hospital.findById(id).select('-__v');

    if (!hospital) {
      return res.status(404).json({
        status: 'error',
        message: 'Hospital not found',
        code: 'HOSPITAL_NOT_FOUND',
      });
    }

    if (!hospital.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'This hospital is currently inactive',
        code: 'HOSPITAL_INACTIVE',
      });
    }

    // Get recent reviews for hospital
    const reviews = await Review.find({ hospital: id, isApproved: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name lastName profilePictureUrl');

    // Calculate distance if user location provided
    let distanceFromUser = null;
    if (req.query.latitude && req.query.longitude) {
      const lat = parseFloat(req.query.latitude);
      const lng = parseFloat(req.query.longitude);
      distanceFromUser = hospital.calculateDistance(lat, lng);
    }

    // If disease is provided, try to get actual pricing from Pricing collection
    let actualDiseasePrice = null;
    if (disease && mongoose.Types.ObjectId.isValid(id)) {
      const facilitiesForDisease = getFacilitiesForDisease(disease);
      const departmentMap = {
        'Cardiology': 'Cardiology', 'Neurology': 'Neurology', 'Orthopedics': 'Orthopedics',
        'Pediatrics': 'Pediatrics', 'Maternity': 'Maternity', 'Oncology': 'Oncology',
        'ENT': 'ENT', 'Dental': 'Dental', 'OPD': 'OPD', 'Emergency': 'Emergency',
        'Surgery': 'Surgery', 'ICU': 'ICU', 'Lab': 'Lab', 'Imaging': 'Imaging',
        'Physiotherapy': 'Physiotherapy', 'Diagnostics': 'Diagnostics',
        'Urology': 'Urology', 'Psychiatry': 'Psychiatry',
      };
      const departments = facilitiesForDisease.map(f => departmentMap[f]).filter(Boolean);

      if (departments.length > 0) {
        try {
          const pricingRecords = await Pricing.find({
            hospitalId: id,
            department: { $in: departments },
            isActive: true,
          }).select('finalPrice basePrice serviceName department serviceType discount').lean();

          if (pricingRecords.length > 0) {
            const prices = pricingRecords.map(p => p.finalPrice);
            actualDiseasePrice = {
              min: Math.min(...prices),
              max: Math.max(...prices),
              avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
              label: diseasePrice?.label || `${disease} Treatment`,
              disease,
              source: 'actual',
              services: pricingRecords.map(p => ({
                name: p.serviceName,
                department: p.department,
                type: p.serviceType,
                basePrice: p.basePrice,
                finalPrice: p.finalPrice,
                discount: p.discount || 0,
              })),
            };
          }
        } catch (err) {
          console.warn('Pricing lookup for details failed:', err.message);
        }
      }
    }

    const finalDiseasePrice = actualDiseasePrice
      || (diseasePrice ? { ...diseasePrice, disease, source: 'estimated' } : null);

    return res.status(200).json({
      status: 'success',
      code: 'HOSPITAL_DETAILS_SUCCESS',
      message: 'Hospital details retrieved successfully',
      data: {
        hospital,
        recentReviews: reviews,
        distanceFromUser, // null if not requested
        totalReviews: hospital.rating.totalReviews,
        averageRating: hospital.rating.average,
        diseasePrice: finalDiseasePrice,
      },
    });
  } catch (error) {
    console.error('Get hospital details error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error fetching hospital details',
      code: 'FETCH_ERROR',
      error: error.message,
    });
  }
};

/**
 * List all hospitals with filters and pagination
 * GET /api/hospitals?page=1&limit=20&city=delhi&sortBy=rating
 *
 * Query Parameters:
 * - page (optional): Page number (default: 1)
 * - limit (optional): Results per page (default: 20)
 * - city (optional): Filter by city
 * - facilities (optional): Comma-separated facility names
 * - minRating (optional): Minimum rating
 * - sortBy (optional): Sort parameter (rating, newest, name)
 */
export const listHospitals = async (req, res) => {
  try {
    const { page = 1, limit = 20, city, facilities, disease, minRating, sortBy = 'rating' } = req.query;

    let query = { isActive: true, isVerified: true };

    // Filter by city
    if (city) {
      query['address.city'] = { $regex: city, $options: 'i' };
    }

    // Filter by facilities and disease
    if (facilities || disease) {
      const facilityList = facilities ? facilities.split(',').map((f) => f.trim()) : [];

      if (disease) {
        const mappedFacilities = getFacilitiesForDisease(disease);
        if (mappedFacilities.length > 0) {
          facilityList.push(...mappedFacilities);
        }
      }

      if (facilityList.length > 0) {
        query.facilities = { $in: [...new Set(facilityList)] };
      }
    }

    // Filter by rating
    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    // Build sort object
    let sortObj = { 'rating.average': -1 }; // Default: sort by rating
    if (sortBy === 'newest') {
      sortObj = { createdAt: -1 };
    } else if (sortBy === 'name') {
      sortObj = { name: 1 };
    }

    const skip = (page - 1) * limit;

    // Fetch hospitals
    const hospitals = await Hospital.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('_id name slug description email phone address facilities rating imageUrl operatingHours website isVerified');

    // Get total count
    const totalCount = await Hospital.countDocuments(query);

    return res.status(200).json({
      status: 'success',
      code: 'LIST_HOSPITALS_SUCCESS',
      message: `Retrieved ${hospitals.length} hospitals`,
      data: {
        hospitals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        availableCities: await Hospital.distinct('address.city', { isActive: true, isVerified: true }),
      },
    });
  } catch (error) {
    console.error('List hospitals error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error listing hospitals',
      code: 'LIST_ERROR',
      error: error.message,
    });
  }
};

/**
 * Get reviews for a specific hospital
 * GET /api/hospitals/:id/reviews?page=1&limit=10&sortBy=newest
 *
 * Query Parameters:
 * - page (optional): Page number (default: 1)
 * - limit (optional): Results per page (default: 10)
 * - sortBy (optional): Sort parameter (newest, oldest, helpful, rating)
 */
export const getHospitalReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, sortBy = 'newest' } = req.query;

    // Verify hospital exists
    const hospital = await Hospital.findById(id);
    if (!hospital) {
      return res.status(404).json({
        status: 'error',
        message: 'Hospital not found',
        code: 'HOSPITAL_NOT_FOUND',
      });
    }

    // Build sort object
    let sortObj = { createdAt: -1 }; // Default: newest first
    if (sortBy === 'oldest') {
      sortObj = { createdAt: 1 };
    } else if (sortBy === 'rating') {
      sortObj = { rating: -1 };
    } else if (sortBy === 'helpful') {
      sortObj = { helpfulCount: -1 };
    }

    const skip = (page - 1) * limit;

    // Fetch reviews
    const reviews = await Review.find({ hospital: id, isApproved: true })
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name lastName profilePictureUrl');

    // Get total count
    const totalCount = await Review.countDocuments({ hospital: id, isApproved: true });

    // Calculate reviews by rating
    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = await Review.countDocuments({ hospital: id, rating: i, isApproved: true });
    }

    return res.status(200).json({
      status: 'success',
      code: 'GET_REVIEWS_SUCCESS',
      message: 'Hospital reviews retrieved successfully',
      data: {
        reviews,
        hospitalInfo: {
          hospitalId: hospital._id,
          hospitalName: hospital.name,
          averageRating: hospital.rating.average,
          totalReviews: hospital.rating.totalReviews,
        },
        ratingDistribution,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get hospital reviews error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error fetching hospital reviews',
      code: 'FETCH_ERROR',
      error: error.message,
    });
  }
};

/**
 * Add a review to a hospital (requires authentication)
 * POST /api/hospitals/:id/reviews
 *
 * Body:
 * {
 *   "rating": 4.5,
 *   "title": "Great experience",
 *   "comment": "Excellent doctors and staff"
 * }
 */
export const addHospitalReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user._id;

    // Validate inputs
    if (!rating || !comment) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating and comment are required',
        code: 'INVALID_INPUT',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be between 1 and 5',
        code: 'INVALID_RATING',
      });
    }

    // Verify hospital exists
    const hospital = await Hospital.findById(id);
    if (!hospital) {
      return res.status(404).json({
        status: 'error',
        message: 'Hospital not found',
        code: 'HOSPITAL_NOT_FOUND',
      });
    }

    // Check if user already reviewed this hospital
    const existingReview = await Review.findOne({ hospital: id, user: userId });
    if (existingReview) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already reviewed this hospital',
        code: 'DUPLICATE_REVIEW',
      });
    }

    // Create review
    const review = new Review({
      hospital: id,
      user: userId,
      rating,
      title: title || 'No title',
      comment,
      isApproved: true, // In production, you might want to moderate this
    });

    await review.save();

    // Update hospital rating
    await hospital.updateRating(rating);

    // Populate user info
    await review.populate('user', 'name lastName profilePictureUrl');

    return res.status(201).json({
      status: 'success',
      code: 'REVIEW_CREATED',
      message: 'Review added successfully',
      data: {
        review,
        hospitalRating: {
          average: hospital.rating.average,
          totalReviews: hospital.rating.totalReviews,
        },
      },
    });
  } catch (error) {
    console.error('Add review error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error adding review',
      code: 'CREATE_ERROR',
      error: error.message,
    });
  }
};

/**
 * Get hospital distance from user's coordinates
 * Useful for calculating distance without full search
 * GET /api/hospitals/:id/distance?latitude=28.7041&longitude=77.1025
 *
 * Query Parameters:
 * - latitude (required): User's latitude
 * - longitude (required): User's longitude
 */
export const getHospitalDistance = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.query;

    // Validate coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'Latitude and longitude are required',
        code: 'INVALID_COORDINATES',
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid latitude or longitude values',
        code: 'INVALID_COORDINATES',
      });
    }

    // Get hospital
    const hospital = await Hospital.findById(id).select('name location');
    if (!hospital) {
      return res.status(404).json({
        status: 'error',
        message: 'Hospital not found',
        code: 'HOSPITAL_NOT_FOUND',
      });
    }

    // Calculate distance
    const distance = hospital.calculateDistance(lat, lng);

    return res.status(200).json({
      status: 'success',
      code: 'DISTANCE_CALCULATED',
      message: 'Distance calculated successfully',
      data: {
        hospitalId: hospital._id,
        hospitalName: hospital.name,
        userLocation: {
          latitude: lat,
          longitude: lng,
        },
        hospitalLocation: {
          latitude: hospital.location.coordinates[1],
          longitude: hospital.location.coordinates[0],
        },
        distanceInKm: distance,
      },
    });
  } catch (error) {
    console.error('Get distance error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error calculating distance',
      code: 'CALCULATION_ERROR',
      error: error.message,
    });
  }
};

/**
 * Search hospitals by user-entered location (city/area/address)
 * Converts location to lat/lng using Mapbox or Google Geocoding
 * GET /api/hospitals/search-by-location?location=Delhi&radius=10&page=1&limit=20
 *
 * Query Parameters:
 * - location (required): City, area, or address to search from
 * - radius (optional): Search radius in km (default: 10, max: 100)
 * - page (optional): Page number (default: 1)
 * - limit (optional): Results per page (default: 20, max: 100)
 * - facilities (optional): Comma-separated facility names to filter
 * - minRating (optional): Minimum hospital rating (1-5)
 * - sortBy (optional): Sort parameter (distance, rating)
 */
export const searchHospitalsByLocation = async (req, res) => {
  try {
    const {
      location,
      radius,
      disease,
      page = 1,
      limit = 20,
      facilities,
      minRating,
      sortBy = 'distance',
    } = req.query;

    // Validate location parameter
    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Location parameter is required and must be a non-empty string',
        code: 'INVALID_LOCATION',
      });
    }

    // Validate and normalize pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

    // Validate radius
    const radiusNum = radius ? Math.min(100, Math.max(1, parseInt(radius))) : 10;

    try {
      // Geocode the location to get latitude and longitude
      const geocodeResult = await geocodeLocation(location, 'IN'); // 'IN' = India
      const { latitude, longitude, formatted_address, place_name } = geocodeResult;

      // Validate coordinates after geocoding
      if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({
          status: 'error',
          message: 'Geocoding returned invalid coordinates',
          code: 'INVALID_GEOCODING_RESULT',
        });
      }

      // Calculate search distance in meters
      const searchDistance = radiusNum * 1000; // Convert km to meters

      // Build aggregation pipeline for geospatial search
      const skip = (pageNum - 1) * limitNum;

      const pipeline = [
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            distanceField: 'distance',
            maxDistance: searchDistance,
            spherical: true,
            query: {
              isActive: true,
              isVerified: true,
              ...(facilities || disease ? {
                facilities: {
                  $in: [
                    ...(facilities ? facilities.split(',').map((f) => f.trim()) : []),
                    ...(disease ? getFacilitiesForDisease(disease) : [])
                  ].filter(Boolean)
                }
              } : {}),
              ...(minRating && { 'rating.average': { $gte: parseFloat(minRating) } }),
            },
          },
        },
        // Sort by requested parameter
        ...(sortBy === 'rating'
          ? [{ $sort: { 'rating.average': -1, distance: 1 } }]
          : [{ $sort: { distance: 1 } }]),
        // Add pagination
        { $skip: skip },
        { $limit: limitNum },
        // Project selected fields
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            description: 1,
            email: 1,
            phone: 1,
            address: 1,
            location: 1,
            distance: 1, // In meters
            facilities: 1,
            rating: 1,
            imageUrl: 1,
            operatingHours: 1,
            isVerified: 1,
            website: 1,
          },
        },
      ];

      // Execute geospatial query
      const hospitals = await Hospital.aggregate(pipeline);

      // Get total count for pagination using a separate count aggregation
      const countPipeline = [
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            distanceField: 'distance',
            maxDistance: searchDistance,
            spherical: true,
            query: pipeline[0].$geoNear.query,
          },
        },
        { $count: 'total' },
      ];

      const countResult = await Hospital.aggregate(countPipeline);
      const totalCount = countResult.length > 0 ? countResult[0].total : 0;

      // Convert distance from meters to km for response
      let hospitalsWithKmDistance = hospitals.map((h) => ({
        ...h,
        distance: Math.round((h.distance / 1000) * 100) / 100, // Convert to km and round to 2 decimals
      }));
      let total = totalCount;

      // Fallback to Google Places Nearby Search
      if (hospitalsWithKmDistance.length === 0) {
        const dynamicHospitals = await fetchHospitalsNearbyGoogle(latitude, longitude, radiusNum, limitNum);
        hospitalsWithKmDistance = dynamicHospitals;
        total = dynamicHospitals.length;
      }

      return res.status(200).json({
        status: 'success',
        code: 'SEARCH_BY_LOCATION_SUCCESS',
        message: `Found ${hospitals.length} hospitals near ${place_name}`,
        data: {
          searchedLocation: {
            input: location,
            formatted_address,
            place_name,
            latitude,
            longitude,
          },
          hospitals: hospitalsWithKmDistance,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: total,
            pages: Math.ceil(total / limitNum),
          },
          searchArea: {
            latitude,
            longitude,
            radius: radiusNum, // In km
          },
        },
      });
    } catch (geocodeError) {
      // Handle geocoding errors
      if (geocodeError.message.includes('No results found')) {
        return res.status(400).json({
          status: 'error',
          message: `Location not found: "${location}". Please try a different city or area.`,
          code: 'LOCATION_NOT_FOUND',
          suggestion: 'Try searching with city name (e.g., "Delhi", "Mumbai", "Bangalore") or area name',
        });
      }

      if (geocodeError.message.includes('not configured')) {
        return res.status(500).json({
          status: 'error',
          message: 'Geocoding service not available at the moment',
          code: 'GEOCODING_SERVICE_ERROR',
        });
      }

      return res.status(400).json({
        status: 'error',
        message: `Error processing location: ${geocodeError.message}`,
        code: 'GEOCODING_ERROR',
      });
    }
  } catch (error) {
    console.error('Search hospitals by location error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error searching hospitals by location',
      code: 'SEARCH_ERROR',
      error: error.message,
    });
  }
};

/**
 * Compare and rank hospitals based on budget, rating and distance
 * GET /api/hospitals/compare?serviceType=Consultation&budget=1000&latitude=28.7&longitude=77.1&maxDistance=20&limit=20
 * Scoring weights: budget (40%), rating (30%), distance (30%)
 */
export const compareHospitals = async (req, res) => {
  try {
    const { serviceType, budget, latitude, longitude, maxDistance = 50, limit = 20 } = req.query;

    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;
    const maxDistanceMeters = parseFloat(maxDistance) * 1000;

    // Build aggregation pipeline
    const pipeline = [];

    if (lat !== null && lng !== null) {
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          spherical: true,
          query: { isActive: true, isVerified: true },
          ...(maxDistance && { maxDistance: maxDistanceMeters }),
        },
      });
    } else {
      pipeline.push({ $match: { isActive: true, isVerified: true } });
    }

    // Lookup pricings for each hospital and compute min price
    const pricingMatch = { isActive: true };
    if (serviceType) pricingMatch.serviceType = serviceType;

    pipeline.push({
      $lookup: {
        from: 'pricings',
        let: { hospitalId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$hospitalId', '$$hospitalId'] }, { $eq: ['$isActive', true] }] } } },
          ...(serviceType ? [{ $match: { serviceType } }] : []),
          { $project: { finalPrice: 1, isAvailable: 1 } },
        ],
        as: 'pricings',
      },
    });

    pipeline.push({
      $addFields: {
        minPrice: { $min: { $ifNull: ['$pricings.finalPrice', []] } },
      },
    });

    // Project only needed fields
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        address: 1,
        location: 1,
        rating: 1,
        imageUrl: 1,
        minPrice: 1,
        distanceMeters: 1,
      },
    });

    pipeline.push({ $limit: parseInt(limit) });

    const hospitals = await Hospital.aggregate(pipeline);

    const userBudget = budget ? parseFloat(budget) : null;
    const maxDistanceKm = maxDistance ? parseFloat(maxDistance) : 50;

    // Helper: compute haversine distance (km)
    const haversineKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round((R * c + Number.EPSILON) * 100) / 100;
    };

    const scored = hospitals.map((h) => {
      const price = h.minPrice || null;

      // Budget score (normalized 0-1)
      let budgetScore = 0;
      if (userBudget && price) {
        if (price <= userBudget) budgetScore = 1;
        else budgetScore = Math.max(0, 1 - (price - userBudget) / userBudget);
      } else if (!userBudget) {
        budgetScore = 0.5; // neutral when budget not provided
      }

      // Rating score (normalized 0-1)
      const ratingAvg = h.rating && h.rating.average ? h.rating.average : 0;
      const ratingScore = Math.min(1, ratingAvg / 5);

      // Distance score (normalized 0-1) - closer is better
      let distanceKm = null;
      if (h.distanceMeters !== undefined && h.distanceMeters !== null) {
        distanceKm = Math.round((h.distanceMeters / 1000) * 100) / 100;
      } else if (h.location && lat !== null && lng !== null) {
        distanceKm = haversineKm(h.location.coordinates[1], h.location.coordinates[0], lat, lng);
      }

      let distanceScore = 0;
      if (distanceKm !== null) {
        if (distanceKm >= maxDistanceKm) distanceScore = 0;
        else distanceScore = Math.max(0, 1 - distanceKm / maxDistanceKm);
      } else {
        distanceScore = 0.5; // neutral when distance not available
      }

      const finalScore = budgetScore * 0.4 + ratingScore * 0.3 + distanceScore * 0.3;

      return {
        _id: h._id,
        name: h.name,
        slug: h.slug,
        address: h.address,
        location: h.location,
        imageUrl: h.imageUrl,
        minPrice: price,
        distanceKm,
        scores: {
          budgetScore: Math.round(budgetScore * 100) / 100,
          ratingScore: Math.round(ratingScore * 100) / 100,
          distanceScore: Math.round(distanceScore * 100) / 100,
          finalScore: Math.round(finalScore * 100) / 100,
        },
      };
    });

    // Sort by final score desc
    scored.sort((a, b) => b.scores.finalScore - a.scores.finalScore);

    return res.status(200).json({
      status: 'success',
      code: 'COMPARE_SUCCESS',
      message: `Ranked ${scored.length} hospitals`,
      data: {
        hospitals: scored,
        meta: {
          serviceType: serviceType || null,
          userBudget: userBudget || null,
          userLocation: lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null,
          maxDistanceKm,
        },
      },
    });
  } catch (error) {
    console.error('Compare hospitals error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error comparing hospitals',
      code: 'COMPARE_ERROR',
      error: error.message,
    });
  }
};
