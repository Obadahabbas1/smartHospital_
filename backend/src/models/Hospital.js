import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
      maxlength: [100, 'Hospital name must not exceed 100 characters'],
      index: true,
    },

    email: {
      type: String,
      required: [true, 'Hospital email is required'],
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },

    phone: {
      type: String,
      required: [true, 'Hospital phone is required'],
      match: [/^[0-9]{10}$/, 'Phone must be 10 digits'],
    },

    // Address & Location
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        index: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
      },
      zipCode: {
        type: String,
        required: [true, 'Zip code is required'],
      },
      country: {
        type: String,
        required: true,
        default: 'India',
      },
    },

    // Geospatial Location (for proximity queries)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude] - NOTE: Order matters for GeoJSON!
        required: [true, 'Coordinates are required'],
        validate: {
          validator: function (arr) {
            return arr.length === 2 && arr[0] >= -180 && arr[0] <= 180 && arr[1] >= -90 && arr[1] <= 90;
          },
          message: 'Coordinates must be [longitude, latitude] with valid ranges',
        },
      },
    },

    // Hospital Details
    description: {
      type: String,
      maxlength: [1000, 'Description must not exceed 1000 characters'],
    },

    registrationNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Facilities
    facilities: [
      {
        type: String,
        enum: [
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
        ],
      },
    ],

    // Operating Hours
    operatingHours: {
      monday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
      tuesday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
      wednesday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
      thursday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
      friday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
      saturday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
      sunday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
      is24Hours: { type: Boolean, default: false },
    },

    // Ratings & Reviews
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        set: (val) => Math.round(val * 10) / 10, // Round to 1 decimal place
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
      distribution: {
        five: { type: Number, default: 0 },
        four: { type: Number, default: 0 },
        three: { type: Number, default: 0 },
        two: { type: Number, default: 0 },
        one: { type: Number, default: 0 },
      },
    },

    // Images
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        alt: String,
        isProfileImage: {
          type: Boolean,
          default: false,
        },
      },
    ],

    profileImage: {
      type: String,
      default: null,
    },

    // Certifications & Accreditations
    accreditations: [
      {
        name: String,
        certificationNumber: String,
        validUntil: Date,
      },
    ],

    // Staff Information
    staffCount: {
      doctors: { type: Number, default: 0 },
      nurses: { type: Number, default: 0 },
      technicians: { type: Number, default: 0 },
      support: { type: Number, default: 0 },
    },

    // Bed Information
    bedCount: {
      general: { type: Number, default: 0 },
      icu: { type: Number, default: 0 },
      highDependency: { type: Number, default: 0 },
      isolation: { type: Number, default: 0 },
    },

    // Parking & Amenities
    amenities: [
      {
        type: String,
        enum: ['Free WiFi', 'Parking', 'Cafeteria', 'Pharmacy', 'ATM', 'Wheelchair Access', 'Ambulance'],
      },
    ],

    // Pricing Information (reference to Pricing collection)
    pricings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pricing',
      },
    ],

    // Insurance Accepted
    insuranceAccepted: [
      {
        type: String,
        enum: [
          'AETNA',
          'Aditya Birla',
          'Apollo Munich',
          'BPMJY',
          'CGHS',
          'ECHS',
          'United India',
          'Bajaj',
          'Care',
          'National',
        ],
      },
    ],

    // Status
    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Admin & Management
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // SEO & Metadata
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    keywords: [String],

    // Statistics
    stats: {
      viewCount: { type: Number, default: 0 },
      searchRankings: [],
      savedCount: { type: Number, default: 0 },
      appointmentCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// ==================== Indexes ====================
/**
 * Geospatial Index for proximity queries
 * Example query: db.hospitals.find({
 *   location: { $near: { $geometry: { type: "Point", coordinates: [77.2169, 28.6139] }, $maxDistance: 5000 } }
 * })
 */
hospitalSchema.index({ 'location.coordinates': '2dsphere' });

// Index for text search on name
hospitalSchema.index({ name: 'text', 'address.city': 'text' });

// Indexes for common queries
hospitalSchema.index({ 'address.city': 1 });
hospitalSchema.index({ 'address.state': 1 });
hospitalSchema.index({ facilities: 1 });
hospitalSchema.index({ rating: 1 });
hospitalSchema.index({ isActive: 1 });
hospitalSchema.index({ slug: 1 });
hospitalSchema.index({ email: 1 });
hospitalSchema.index({ phone: 1 });

// Compound indexes for common query patterns
hospitalSchema.index({ isActive: 1, rating: -1 }); // Active hospitals sorted by rating
hospitalSchema.index({ 'address.city': 1, isActive: 1 }); // Hospitals in city
hospitalSchema.index({ isVerified: 1, isActive: 1 }); // Verified active hospitals

// TTL index for temporary data (if needed)
hospitalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days optional auto-delete

// ==================== Middleware ====================
/**
 * Generate slug from hospital name before saving
 */
hospitalSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

// ==================== Methods ====================
/**
 * Calculate distance between hospital and a given point (in km)
 * @param {number} latitude - User latitude
 * @param {number} longitude - User longitude
 * @returns {number} - Distance in kilometers
 */
hospitalSchema.methods.calculateDistance = function (latitude, longitude) {
  const lat1 = this.location.coordinates[1];
  const lon1 = this.location.coordinates[0];
  const lat2 = latitude;
  const lon2 = longitude;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round((R * c + Number.EPSILON) * 100) / 100; // Round to 2 decimals
};

/**
 * Update rating based on reviews
 * Called by Review model post hooks
 */
hospitalSchema.methods.updateRating = function (newRating, oldRating) {
  const totalReviews = this.rating.totalReviews;

  if (oldRating) {
    // Update existing review
    const oldRatingKey = Math.round(oldRating);
    this.rating.distribution[`${oldRatingKey}`] = Math.max(0, this.rating.distribution[`${oldRatingKey}`] - 1);
  } else {
    // New review
    this.rating.totalReviews += 1;
  }

  const newRatingKey = Math.round(newRating);
  this.rating.distribution[`${newRatingKey}`] = (this.rating.distribution[`${newRatingKey}`] || 0) + 1;

  // Calculate average
  let sum = 0;
  for (let i = 1; i <= 5; i++) {
    sum += i * (this.rating.distribution[`${i}`] || 0);
  }
  this.rating.average = sum / this.rating.totalReviews || 0;

  return this.save();
};

/**
 * Check if hospital is open at a specific time
 * @param {Date} dateTime - Date and time to check
 * @returns {boolean} - True if open
 */
hospitalSchema.methods.isOpenAt = function (dateTime) {
  if (this.operatingHours.is24Hours) return true;

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[dateTime.getDay()];
  const dayHours = this.operatingHours[dayName];

  if (!dayHours) return false;

  const timeString = String(dateTime.getHours()).padStart(2, '0') + ':' + String(dateTime.getMinutes()).padStart(2, '0');

  return timeString >= dayHours.open && timeString <= dayHours.close;
};

export default mongoose.model('Hospital', hospitalSchema);
