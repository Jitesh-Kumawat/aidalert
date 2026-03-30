const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  type: { type: String, required: true },
  location: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  description: { type: String },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Alert', AlertSchema);