const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Hazard Alert',
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'pothole',
        'broken_railing',
        'under_construction',
        'road_collapse',
        'damaged_road',
        'debris',
        'disaster',
        'flood',
        'fire',
        'landslide',
        'building_collapse',
      ],
      required: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    locationText: {
      type: String,
      required: true,
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
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    alertRadiusMeters: {
      type: Number,
      default: 500,
      min: 50,
      max: 10000,
    },
    status: {
      type: String,
      enum: ['unverified', 'verified', 'active', 'resolved', 'false_report'],
      default: 'unverified',
    },
    source: {
      type: String,
      enum: ['citizen', 'govt', 'ai', 'manual'],
      default: 'citizen',
    },
    confidence: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    reportedBy: {
      type: String,
      default: 'citizen',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

IncidentSchema.index({ coordinates: '2dsphere' });
IncidentSchema.index({ status: 1, type: 1, source: 1 });

module.exports = mongoose.model('Incident', IncidentSchema);
