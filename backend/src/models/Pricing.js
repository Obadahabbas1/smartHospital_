import mongoose from 'mongoose';

const pricingSchema = new mongoose.Schema(
  {
    // Hospital Reference
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Hospital ID is required'],
      index: true,
    },

    // Service Information
    serviceType: {
      type: String,
      enum: [
        'Consultation',
        'Test',
        'Procedure',
        'Surgery',
        'Package',
        'Admission',
        'Emergency',
      ],
      required: [true, 'Service type is required'],
      index: true,
    },

    serviceName: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      index: true,
    },

    description: {
      type: String,
      maxlength: [1000, 'Description must not exceed 1000 characters'],
    },

    // Department/Speciality
    department: {
      type: String,
      enum: [
        'General',
        'Emergency',
        'OPD',
        'IPD',
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
        'Diagnostics',
        'Lab',
        'Imaging',
        'ICU',
      ],
      required: [true, 'Department is required'],
      index: true,
    },

    // Pricing Details
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price cannot be negative'],
    },

    // Discounts
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
    },

    finalPrice: {
      type: Number,
      required: [true, 'Final price is required'],
      min: [0, 'Final price cannot be negative'],
    },

    // Insurance and Schemes
    insuranceAccepted: [
      {
        type: String,
        enum: [
          'AETNA',
          'BUPA',
          'CIGNA',
          'GEICO',
          'HUMANA',
          'UnitedHealth',
          'Aligence',
          'Assured',
          'Star',
          'National',
        ],
      },
    ],

    insuranceCoverage: {
      type: Number,
      min: [0, 'Coverage cannot be negative'],
      max: [100, 'Coverage cannot exceed 100%'],
    },

    // Package Details (if applicable)
    isPackage: {
      type: Boolean,
      default: false,
    },

    packageIncludes: [
      {
        item: String,
        quantity: Number,
      },
    ],

    // Duration and Availability
    estimatedDuration: {
      type: String,
      // Examples: "30 minutes", "2 hours", "3 days", "1 week"
    },

    availableSlots: {
      type: Number,
      min: [0, 'Available slots cannot be negative'],
    },

    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },

    availabilitySchedule: {
      monday: { start: String, end: String },
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String },
    },

    // Special Conditions
    prerequisites: [String], // e.g., ["Fasting required", "Lab report submission"]

    ageRestriction: {
      minAge: Number,
      maxAge: Number,
    },

    // Doctor/Specialist Requirement
    requiresDoctor: {
      type: Boolean,
      default: false,
    },

    specialists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to hospital staff/doctor
      },
    ],

    // Ratings and Reviews
    rating: {
      average: {
        type: Number,
        min: [0, 'Rating cannot be less than 0'],
        max: [5, 'Rating cannot be more than 5'],
        default: 0,
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

    // Related Services
    relatedServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pricing',
      },
    ],

    // Booking Information
    bookingRequired: {
      type: Boolean,
      default: true,
    },

    cancellationPolicy: {
      type: String,
      enum: ['NonRefundable', 'PartialRefundable', 'FullyRefundable'],
      default: 'FullyRefundable',
    },

    cancellationDeadline: {
      type: Number,
      default: 24, // hours before appointment
    },

    // Verification and Status
    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Created by (Hospital Admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
    },

    // Metadata
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    popularity: {
      bookingCount: {
        type: Number,
        default: 0,
      },
      viewCount: {
        type: Number,
        default: 0,
      },
    },

    // Tags for filtering
    tags: [String], // e.g., ["Emergency", "Walk-in", "Appointment-only"]

    customFields: mongoose.Schema.Types.Mixed, // For hospital-specific fields
  },
  {
    timestamps: true,
  }
);

// ==================== Indexes ====================
// Primary index - find prices by hospital
pricingSchema.index({ hospitalId: 1, isActive: 1 });

// Service-based queries
pricingSchema.index({ serviceType: 1, department: 1 });

// Price range queries
pricingSchema.index({ finalPrice: 1 });

// Availability queries
pricingSchema.index({ isAvailable: 1, isActive: 1 });

// Popular services
pricingSchema.index({ 'popularity.bookingCount': -1 });

// Compound indexes
pricingSchema.index({ hospitalId: 1, serviceType: 1, isActive: 1 }); // Hospital services
pricingSchema.index({ department: 1, finalPrice: 1, isActive: 1 }); // Department price range
pricingSchema.index({
  hospitalId: 1,
  isActive: 1,
  'popularity.bookingCount': -1,
}); // Popular hospital services

// Rating-based
pricingSchema.index({ 'rating.average': -1, isActive: 1 }); // Highest rated services

// Text index for service search
pricingSchema.index({ serviceName: 'text', description: 'text' });

// ==================== Virtual Fields ====================
pricingSchema.virtual('discountedAmount').get(function () {
  return Math.round((this.basePrice * this.discount) / 100);
});

pricingSchema.virtual('savingsPercentage').get(function () {
  if (this.basePrice === 0) return 0;
  return Math.round(((this.basePrice - this.finalPrice) / this.basePrice) * 100);
});

// ==================== Middleware ====================
/**
 * Calculate final price before saving
 */
pricingSchema.pre('save', function (next) {
  if (this.isModified('basePrice') || this.isModified('discount')) {
    this.finalPrice = Math.round(this.basePrice * (1 - this.discount / 100) * 100) / 100;
  }
  next();
});

/**
 * Auto-disable pricing if no slots available
 */
pricingSchema.pre('save', function (next) {
  if (this.availableSlots !== undefined && this.availableSlots <= 0) {
    this.isAvailable = false;
  }
  next();
});

// ==================== Methods ====================
/**
 * Check if service is available at given time
 * @param {Date} dateTime - Date and time to check
 * @returns {boolean} - True if available at given time
 */
pricingSchema.methods.isAvailableAt = function (dateTime) {
  if (!this.isAvailable) return false;

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[dateTime.getDay()];
  const schedule = this.availabilitySchedule[dayName];

  if (!schedule || !schedule.start || !schedule.end) return true; // Open when no schedule defined

  const time = dateTime.getHours() * 100 + dateTime.getMinutes();
  const [startHour, startMin] = schedule.start.split(':').map(Number);
  const [endHour, endMin] = schedule.end.split(':').map(Number);
  const startTime = startHour * 100 + startMin;
  const endTime = endHour * 100 + endMin;

  return time >= startTime && time <= endTime;
};

/**
 * Update service rating
 * @param {number} newRating - New rating value (1-5)
 * @param {number} oldRating - Old rating value (1-5)
 */
pricingSchema.methods.updateRating = async function (newRating, oldRating = null) {
  if (newRating < 1 || newRating > 5) return;

  // Decrease old rating if exists
  if (oldRating) {
    const key = `distribution.${['one', 'two', 'three', 'four', 'five'][oldRating - 1]}`;
    this.rating.distribution[['one', 'two', 'three', 'four', 'five'][oldRating - 1]] = Math.max(
      0,
      this.rating.distribution[['one', 'two', 'three', 'four', 'five'][oldRating - 1]] - 1
    );
  }

  // Increase new rating
  const ratingKey = ['one', 'two', 'three', 'four', 'five'][newRating - 1];
  this.rating.distribution[ratingKey] += 1;
  this.rating.totalReviews += 1;

  // Calculate average
  const total =
    this.rating.distribution.one * 1 +
    this.rating.distribution.two * 2 +
    this.rating.distribution.three * 3 +
    this.rating.distribution.four * 4 +
    this.rating.distribution.five * 5;

  this.rating.average = Math.round((total / this.rating.totalReviews) * 10) / 10;

  return this.save();
};

/**
 * Increment booking count
 */
pricingSchema.methods.incrementBookingCount = async function () {
  this.popularity.bookingCount += 1;
  return this.save();
};

/**
 * Increment view count
 */
pricingSchema.methods.incrementViewCount = async function () {
  this.popularity.viewCount += 1;
  return this.save();
};

/**
 * Check if user meets age restrictions
 * @param {number} userAge - User's age
 * @returns {boolean} - True if user meets restrictions
 */
pricingSchema.methods.meetsAgeRequirement = function (userAge) {
  if (!this.ageRestriction) return true;

  if (this.ageRestriction.minAge && userAge < this.ageRestriction.minAge) return false;
  if (this.ageRestriction.maxAge && userAge > this.ageRestriction.maxAge) return false;

  return true;
};

/**
 * Get available insurance providers for this service
 */
pricingSchema.methods.getAvailableInsurance = function () {
  return this.insuranceAccepted || [];
};

/**
 * Deactivate pricing (mark as unavailable)
 */
pricingSchema.methods.deactivate = async function () {
  this.isActive = false;
  this.isAvailable = false;
  return this.save();
};

/**
 * Activate pricing (mark as available)
 */
pricingSchema.methods.activate = async function () {
  this.isActive = true;
  this.isAvailable = true;
  return this.save();
};

export default mongoose.model('Pricing', pricingSchema);
