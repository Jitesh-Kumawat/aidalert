const mongoose = require('mongoose');

const PotholeAlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: 'road_damage',
    },
    title: {
      type: String,
      default: 'Pothole Alert',
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    locality: {
      type: String,
      default: '',
      trim: true,
    },
    locationText: {
      type: String,
      default: '',
      trim: true,
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    alertRadiusMeters: {
      type: Number,
      default: 500,
      min: 50,
      max: 5000,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    confidence: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    source: {
      type: String,
      enum: ['ai', 'manual', 'govt-survey', 'citizen'],
      default: 'ai',
    },
    status: {
      type: String,
      enum: ['active', 'repaired', 'false_report'],
      default: 'active',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    lastVerifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

PotholeAlertSchema.index({ coordinates: '2dsphere' });
PotholeAlertSchema.index({ city: 1, status: 1 });

module.exports = mongoose.model('PotholeAlert', PotholeAlertSchema);
