import mongoose from 'mongoose';
import Hospital from '../models/Hospital.js';

// Keep in sync with `Hospital` model enum for `facilities`.
const ALLOWED_FACILITIES = new Set([
  'Emergency',
  'ICU',
  'OPD',
  'Lab',
  'Imaging',
  'Surgery',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Maternity',
  'Oncology',
  'Psychiatry',
  'Urology',
  'ENT',
  'Dental',
  'Physiotherapy',
  'Dialysis',
  'MRI',
  'CT-Scan',
  'Ultrasound',
  'X-Ray',
]);

const normalizeDigits = (value, fallback) => {
  const s = String(value ?? '');
  // Many dynamic sources include country code; keep last 10 digits if present.
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return fallback;
};

export const getDynamicSlugForId = (dynamicId) => {
  // Example:
  //  - osm-1358917799  -> dynamic-osm-1358917799
  //  - google-xxxxx     -> dynamic-google-xxxxx
  const id = String(dynamicId ?? '');
  return `dynamic-${id}`.toLowerCase();
};

export const cacheDynamicHospitalsToMongo = async (dynamicHospitals, opts = {}) => {
  const {
    extraFacilities = [],
    // Optional defaults when dynamic payload is missing address pieces.
    defaultCity = '',
    defaultState = '',
    defaultZipCode = '',
  } = opts;

  if (!Array.isArray(dynamicHospitals) || dynamicHospitals.length === 0) return [];

  const extraFacilitiesSet = new Set(extraFacilities.filter(Boolean));

  const upserted = [];
  for (const h of dynamicHospitals) {
    if (!h || !h._id) continue;

    const dynamicId = String(h._id);
    const slug = getDynamicSlugForId(dynamicId);

    const safeFacilities = [
      ...(Array.isArray(h.facilities) ? h.facilities : []),
      ...extraFacilitiesSet,
    ]
      .map((f) => String(f))
      .filter((f) => ALLOWED_FACILITIES.has(f));

    const facilities = safeFacilities.length > 0 ? [...new Set(safeFacilities)] : ['OPD'];

    const coords = h.location?.coordinates;
    const lon = Number(coords?.[0]);
    const lat = Number(coords?.[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      // Skip invalid geo entries to avoid failing validators.
      continue;
    }

    const address = h.address || {};
    const street = address.street && String(address.street).trim() ? String(address.street).trim() : 'N/A';
    const city = address.city && String(address.city).trim() ? String(address.city).trim() : defaultCity;
    const state = address.state && String(address.state).trim() ? String(address.state).trim() : defaultState;
    const zipCode = address.zipCode && String(address.zipCode).trim() ? String(address.zipCode).trim() : defaultZipCode;

    // Hospital model requires email + phone.
    const rawEmail = String(h.email ?? '').trim();
    const email = rawEmail ? rawEmail.split(/[;,]/)[0].trim() : 'cache@hospital.com';
    const phone = normalizeDigits(h.phone, '9999999999');

    const rating = h.rating || {};
    const average = Number(rating.average);
    const totalReviews = Number(rating.totalReviews);

    const update = {
      // Required by schema validators:
      name: String(h.name ?? 'Medical Center / Clinic'),
      slug,
      email,
      phone,
      address: {
        street,
        city,
        state,
        zipCode,
        country: address.country || 'Unknown Country',
      },
      location: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      // Optional enrichment / filters:
      description: String(h.description ?? ''),
      facilities,
      rating: {
        average: Number.isFinite(average) ? average : 0,
        totalReviews: Number.isFinite(totalReviews) ? totalReviews : 0,
      },
      // Make sure cached hospitals show up in listings/search:
      isActive: true,
      isVerified: true,
      // Preserve for frontend if it exists in the dynamic payload:
      website: String(h.website ?? ''),
      imageUrl: String(h.imageUrl ?? ''),
      // Note: `operatingHours` and many other fields are optional in schema.
    };

    // Upsert by `slug` so we don't create duplicates.
    // `runValidators` ensures required fields are present and enums match.
    // `setDefaultsOnInsert` helps schema defaults apply to new documents.
    const doc = await Hospital.findOneAndUpdate(
      { slug },
      update,
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    if (doc) upserted.push(doc.toObject());
  }

  return upserted;
};

