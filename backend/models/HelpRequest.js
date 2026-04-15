// const mongoose = require('mongoose');

// const HelpRequestSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   phone: { type: String, required: true },
//   type: { type: String, required: true },
//   location: { type: String, required: true },
//   description: { type: String },
//   status: { type: String, enum: ['pending', 'assigned', 'resolved'], default: 'pending' },
//   urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'high' },
//   timestamp: { type: Date, default: Date.now },
//   latitude: Number,
//   longitude: Number,
//   people: { type: Number, default: 1 },       // ← NEW
//   priorityScore: { type: Number, default: 0 },       // ← NEW
// });

// module.exports = mongoose.model('HelpRequest', HelpRequestSchema);
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
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  timestamp: { type: Date, default: Date.now },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  people: { type: Number, default: 1 },
  priorityScore: { type: Number, default: 0 },

modelConfidence: { type: Number, default: null },
prioritySource: { type: String, default: 'rule' },
});

module.exports = mongoose.model('HelpRequest', HelpRequestSchema);



