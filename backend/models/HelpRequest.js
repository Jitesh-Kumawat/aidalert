const mongoose = require('mongoose');

const HelpRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  type: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'resolved'],
    default: 'pending',
  },
  urgency: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  timestamp: { type: Date, default: Date.now },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  people: { type: Number, default: 1 },
  priorityScore: { type: Number, default: 0 },
  modelConfidence: { type: Number, default: null },
  prioritySource: { type: String, default: 'rule' },
  imageUrl: { type: String, default: '' },
  fcmToken: { type: String, default: '' },
  dispatchEtaMinutes: { type: Number, default: null },
  pushSentAt: { type: Date, default: null },
});

module.exports = mongoose.model('HelpRequest', HelpRequestSchema);
