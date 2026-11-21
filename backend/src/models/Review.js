import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    // User & Hospital References
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Hospital ID is required'],
      index: true,
    },

    // Review Content
    title: {
      type: String,
      required: [true, 'Review title is required'],
      trim: true,
      maxlength: [100, 'Title must not exceed 100 characters'],
    },

    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [2000, 'Comment must not exceed 2000 characters'],
    },

    // Rating Scale
    overallRating: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must not exceed 5'],
      enum: [1, 2, 3, 4, 5],
    },

    // Category Ratings (1-5 stars each)
    categoryRatings: {
      cleanliness: {
        type: Number,
        min: 1,
        max: 5,
        required: [true, 'Cleanliness rating is required'],
      },
      staff: {
        type: Number,
        min: 1,
        max: 5,
        required: [true, 'Staff rating is required'],
      },
      facilities: {
        type: Number,
        min: 1,
        max: 5,
        required: [true, 'Facilities rating is required'],
      },
      service: {
        type: Number,
        min: 1,
        max: 5,
        required: [true, 'Service rating is required'],
      },
      cost: {
        type: Number,
        min: 1,
        max: 5,
        required: [true, 'Cost-effectiveness rating is required'],
      },
    },

    // Visited Information
    visitDate: {
      type: Date,
      required: [true, 'Visit date is required'],
    },

    department: {
      type: String,
      enum: [
        'Emergency',
        'OPD',
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
        'Other',
      ],
      required: [true, 'Department is required'],
    },

    visitType: {
      type: String,
      enum: ['Consultation', 'Treatment', 'Emergency', 'Surgery', 'Checkup', 'Other'],
      required: [true, 'Visit type is required'],
    },

    // Additional Details
    treatmentDetail: {
      type: String,
      maxlength: [500, 'Treatment detail must not exceed 500 characters'],
    },

    // Sentiments and Tags
    experiences: [
      {
        type: String,
        enum: [
          'Quick check-in',
          'Long queue',
          'Professional staff',
          'Good facilities',
          'Poor cleanliness',
          'High cost',
          'Reasonable cost',
          'Emergency ready',
          'Parking issues',
          'Good food',
        ],
      },
    ],

    wouldRecommend: {
      type: Boolean,
      default: true,
    },

    // Engagement
    isVerifiedVisit: {
      type: Boolean,
      default: false,
    },

    helpful: {
      count: {
        type: Number,
        default: 0,
      },
      by: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },

    unhelpful: {
      count: {
        type: Number,
        default: 0,
      },
      by: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },

    // Response from Hospital
    hospitalResponse: {
      comment: String,
      respondedAt: Date,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    // Status
    isApproved: {
      type: Boolean,
      default: false,
    },

    isFlagged: {
      type: Boolean,
      default: false,
    },

    flagReason: String,

    // Images/Videos from visit
    photos: [
      {
        url: String,
        caption: String,
      },
    ],

    // Moderation
    moderation: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'pending',
      },
      reason: String,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== Indexes ====================
// Index for finding reviews by hospital
reviewSchema.index({ hospitalId: 1, isApproved: 1 });

// Index for finding user's reviews
reviewSchema.index({ userId: 1 });

// Index for recent reviews
reviewSchema.index({ createdAt: -1 });

// Index for rating-based queries
reviewSchema.index({ overallRating: 1 });

// Index for moderation status
reviewSchema.index({ 'moderation.status': 1 });

// Compound indexes for common queries
reviewSchema.index({ hospitalId: 1, isApproved: 1, createdAt: -1 }); // Recent approved reviews for hospital
reviewSchema.index({ hospitalId: 1, overallRating: 1 }); // Reviews by rating
reviewSchema.index({ userId: 1, createdAt: -1 }); // User's recent reviews

// Text index for searching review comments
reviewSchema.index({ title: 'text', comment: 'text' });

// ==================== Middleware ====================
/**
 * Populate user and hospital info before responding
 */
reviewSchema.pre(/^find/, function (next) {
  // Only populate if explicitly needed (for detail queries)
  if (this.options._recursed) return next();
  
  // Store original select
  const select = this.getOptions().select;
  
  // Don't populate in list queries by default (performance)
  // User can explicitly populate if needed using .populate()
  next();
});

/**
 * Update hospital rating when review is saved
 * Note: Only applies to new reviews or when overallRating is modified
 */
reviewSchema.post('save', async function (doc) {
  // Only update if review is approved
  if (doc.isApproved && doc.isModified('overallRating')) {
    const Hospital = mongoose.model('Hospital');
    const hospital = await Hospital.findById(doc.hospitalId);
    
    if (hospital) {
      const oldRating = this.constructor.findById(doc._id).select('overallRating');
      await hospital.updateRating(doc.overallRating);
    }
  }
});

// ==================== Methods ====================
/**
 * Mark review as helpful
 * @param {string} userId - User ID marking as helpful
 */
reviewSchema.methods.markAsHelpful = async function (userId) {
  // Remove from unhelpful if exists
  this.unhelpful.by = this.unhelpful.by.filter((id) => id.toString() !== userId.toString());
  this.unhelpful.count = this.unhelpful.by.length;

  // Add to helpful if not already there
  if (!this.helpful.by.includes(userId)) {
    this.helpful.by.push(userId);
    this.helpful.count += 1;
  }

  return this.save();
};

/**
 * Mark review as unhelpful
 * @param {string} userId - User ID marking as unhelpful
 */
reviewSchema.methods.markAsUnhelpful = async function (userId) {
  // Remove from helpful if exists
  this.helpful.by = this.helpful.by.filter((id) => id.toString() !== userId.toString());
  this.helpful.count = this.helpful.by.length;

  // Add to unhelpful if not already there
  if (!this.unhelpful.by.includes(userId)) {
    this.unhelpful.by.push(userId);
    this.unhelpful.count += 1;
  }

  return this.save();
};

/**
 * Get average rating from category ratings
 */
reviewSchema.methods.getAverageRating = function () {
  const ratings = Object.values(this.categoryRatings);
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
};

/**
 * Approve review by moderator
 * @param {string} moderatorId - Moderator user ID
 */
reviewSchema.methods.approve = async function (moderatorId) {
  this.isApproved = true;
  this.moderation.status = 'approved';
  this.moderation.reviewedBy = moderatorId;
  this.moderation.reviewedAt = new Date();

  return this.save();
};

/**
 * Reject review by moderator
 * @param {string} moderatorId - Moderator user ID
 * @param {string} reason - Reason for rejection
 */
reviewSchema.methods.reject = async function (moderatorId, reason) {
  this.isApproved = false;
  this.moderation.status = 'rejected';
  this.moderation.reason = reason;
  this.moderation.reviewedBy = moderatorId;
  this.moderation.reviewedAt = new Date();

  return this.save();
};

export default mongoose.model('Review', reviewSchema);
