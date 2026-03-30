const mongoose = require('mongoose');

const HelpRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  type: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['pending', 'assigned', 'resolved'], default: 'pending' },
  urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'high' },
  timestamp: { type: Date, default: Date.now },
  latitude: Number,
  longitude: Number,
  people: { type: Number, default: 1 },       // ← NEW
  priorityScore: { type: Number, default: 0 },       // ← NEW
});

module.exports = mongoose.model('HelpRequest', HelpRequestSchema);