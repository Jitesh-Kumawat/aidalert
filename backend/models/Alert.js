const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: { type: String, required: true }, // flood, fire, earthquake
  location: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);
