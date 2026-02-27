const mongoose = require('mongoose');

const helpRequestSchema = new mongoose.Schema({
  type: { type: String, required: true }, // food, medical, shelter, other
  location: { type: String, required: true },
  people: { type: Number, required: true },
  urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  details: String,
  status: { type: String, enum: ['pending', 'assigned'], default: 'pending' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HelpRequest', helpRequestSchema);
