import express from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { searchLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  searchNearby,
  searchHospitals,
  searchHospitalsByLocation,
  compareHospitals,
  getHospitalDetails,
  listHospitals,
  getHospitalReviews,
  addHospitalReview,
  getHospitalDistance,
} from '../controllers/hospitalController.js';

const router = express.Router();

/**
 * GET /api/hospitals
 * List all hospitals with filters
 * Query params: page, limit, city, facilities, minRating, sortBy
 */
router.get('/', asyncHandler(listHospitals));

/**
 * GET /api/hospitals/search
 * Search hospitals by text (name, location, specialty)
 * Query params: q, city, page, limit, minRating, sortBy
 */
router.get('/search', searchLimiter, asyncHandler(searchHospitals));

/**
 * GET /api/hospitals/search-by-location
 * Search hospitals by user-entered location (city/area/address)
 * Converts location string to coordinates using Mapbox/Google Geocoding
 * Query params: location (required), radius (km, default 10), page, limit, facilities, minRating, sortBy
 */
router.get('/search-by-location', searchLimiter, asyncHandler(searchHospitalsByLocation));

/**
 * GET /api/hospitals/nearby
 * Get hospitals near coordinates (geospatial search)
 * Query params: latitude, longitude, radius (default 10km), page, limit, facilities, minRating, sortBy
 */
router.get('/nearby', searchLimiter, asyncHandler(searchNearby));

/**
 * GET /api/hospitals/compare
 * Compare and rank hospitals by budget, rating and distance
 * Query: serviceType, budget, latitude, longitude, maxDistance, limit
 */
router.get('/compare', searchLimiter, asyncHandler(compareHospitals));

/**
 * GET /api/hospitals/:id/distance
 * Get distance from user's coordinates to hospital
 * Query params: latitude, longitude
 */
router.get('/:id/distance', asyncHandler(getHospitalDistance));

/**
 * GET /api/hospitals/:id
 * Get hospital details by ID
 * Query params: latitude, longitude (optional, for distance calculation)
 */
router.get('/:id', optionalAuth, asyncHandler(getHospitalDetails));

/**
 * GET /api/hospitals/:id/reviews
 * Get reviews for a hospital
 * Query params: page, limit, sortBy
 */
router.get('/:id/reviews', asyncHandler(getHospitalReviews));

/**
 * POST /api/hospitals/:id/reviews
 * Add a review to hospital (auth required)
 * Body: { rating, title, comment }
 */
router.post('/:id/reviews', authenticate, asyncHandler(addHospitalReview));

/**
 * GET /api/hospitals/:id/costs
 * Get cost breakdown for procedures/tests
 */
router.get('/:id/costs', asyncHandler(async (req, res) => {
  // TODO: Implement get costs controller
  res.json({ message: 'Get costs endpoint - To be implemented' });
}));

/**
 * POST /api/hospitals/:id/save
 * Save hospital to user profile (auth required)
 */
router.post('/:id/save', authenticate, asyncHandler(async (req, res) => {
  // TODO: Implement save hospital controller
  res.json({ message: 'Save hospital endpoint - To be implemented' });
}));

/**
 * DELETE /api/hospitals/:id/save
 * Remove hospital from saved list (auth required)
 */
router.delete('/:id/save', authenticate, asyncHandler(async (req, res) => {
  // TODO: Implement unsave hospital controller
  res.json({ message: 'Unsave hospital endpoint - To be implemented' });
}));

export default router;
