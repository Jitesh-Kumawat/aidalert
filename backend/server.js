require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Jimp = require('jimp');
const tf = require('@tensorflow/tfjs');
const Alert = require('./models/Alert');
const HelpRequest = require('./models/HelpRequest');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ─────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── STATIC FILES ────────────────────────────────────────────────────────────
app.use('/model', express.static(path.join(__dirname, 'model')));
app.use(express.static(path.join(__dirname, 'public'))); // serves index.html

// ─── UPLOADS DIR ────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// ─── DATABASE ───────────────────────────────────────────────────────────────
const primaryMongoUri = process.env.MONGODB_URI;
const fallbackMongoUri = process.env.MONGODB_URI_FALLBACK;

async function connectToMongo() {
  const candidates = [primaryMongoUri, fallbackMongoUri].filter(Boolean);

  if (!candidates.length) {
    console.warn('⚠️ MongoDB URI not found. Set MONGODB_URI (and optional MONGODB_URI_FALLBACK).');
    return;
  }

  for (let i = 0; i < candidates.length; i++) {
    const label = i === 0 ? 'primary' : 'fallback';

    try {
      await mongoose.connect(candidates[i], {
        serverSelectionTimeoutMS: 10000,
        family: 4,
      });
      console.log(`✅ MongoDB Connected (${label})`);
      return;
    } catch (err) {
      console.error(`❌ MongoDB ${label} connection failed:`, err.message);

      const isSrvDnsIssue = err?.code === 'ECONNREFUSED' && err?.syscall === 'querySrv';
      if (isSrvDnsIssue) {
        console.error('💡 SRV DNS lookup failed. Fix DNS or set MONGODB_URI_FALLBACK to a non-SRV Mongo URI.');
      }
    }
  }

  console.error('⚠️ Server will continue, but Mongo-backed endpoints will fail until DB connection is restored.');
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected.');
});

connectToMongo();

// ─── AI MODEL ────────────────────────────────────────────────────────────────
let potholeModel = null;
async function loadModel() {
  try {
    potholeModel = await tf.loadGraphModel(
      `http://localhost:${PORT}/model/model.json`
    );
    console.log('✅ AI Model Loaded');
  } catch (err) {
    console.error('❌ AI Load Error:', err.message);
  }
}
setTimeout(loadModel, 2000);

// ─── AI POTHOLE DETECT ───────────────────────────────────────────────────────
app.post('/api/pothole-detect', upload.single('image'), async (req, res) => {
  try {
    if (!potholeModel) throw new Error('AI Model not ready');
    if (!req.file) throw new Error('No image uploaded');

    const image = await Jimp.read(req.file.path);
    image.resize({ w: 224, h: 224 });
    const { data, width, height } = image.bitmap;
    const values = new Float32Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
      values[i * 3] = data[i * 4] / 255.0;
      values[i * 3 + 1] = data[i * 4 + 1] / 255.0;
      values[i * 3 + 2] = data[i * 4 + 2] / 255.0;
    }

    const tensor = tf.tensor3d(values, [224, 224, 3]).expandDims(0);
    const prediction = potholeModel.predict(tensor);
    const score = (await prediction.data())[0];
    tensor.dispose();
    prediction.dispose();

    let alertCreated = false;
    if (score > 0.5) {
      const newAlert = new Alert({
        type: 'road_damage',
        location: req.body.location || 'AI Detected',
        severity: score > 0.75 ? 'high' : 'medium',
        description: `[AI VERIFIED] Pothole detected with ${Math.round(score * 100)}% confidence.`,
        latitude: req.body.latitude || null,
        longitude: req.body.longitude || null,
      });
      await newAlert.save();
      alertCreated = true;
    }

    res.json({
      pothole: score > 0.5,
      confidence: Math.round(score * 100),
      alertCreated,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (req.file && fs.existsSync(req.file.path))
      fs.unlinkSync(req.file.path);
  }
});

// ─── ALERTS API ─────────────────────────────────────────────────────────────
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 });
    res.json(alerts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/alerts', async (req, res) => {
  try {
    const alert = new Alert(req.body);
    await alert.save();
    res.status(201).json(alert);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/alerts/:id', async (req, res) => {
  try {
    await Alert.findByIdAndDelete(req.params.id);
    res.json({ message: 'Alert deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ══════════════════════════════════════
// PRIORITY SCORE CALCULATOR
// ══════════════════════════════════════
function calculatePriorityScore(urgency, people, timestamp) {
    let score = 0;

    // 1. Urgency points
    const urgencyPoints = {
        critical: 100,
        high:     70,
        medium:   40,
        low:      20
    };
    score += urgencyPoints[urgency] || 70;

    // 2. People affected points
    const p = parseInt(people) || 1;
    if      (p >= 10) score += 30;
    else if (p >= 6)  score += 20;
    else if (p >= 2)  score += 10;

    // 3. Waiting time points
    const waitMins = (Date.now() - new Date(timestamp).getTime()) / 60000;
    if      (waitMins > 180) score += 60; // 3+ hours
    else if (waitMins > 60)  score += 40; // 1+ hour
    else if (waitMins > 30)  score += 20; // 30+ mins

    return score;
}
// ─── HELP REQUESTS API ───────────────────────────────────────────────────────
app.get('/api/helprequests', async (req, res) => {
    try {
        const page     = parseInt(req.query.page)     || 1;
        const limit    = parseInt(req.query.limit)    || 20; // 20 per page
        const status   = req.query.status  || null;
        const urgency  = req.query.urgency || null;
        const type     = req.query.type    || null;
        const search   = req.query.search  || null;

        // Build filter
        let filter = {};
        if (status)  filter.status  = status;
        if (urgency) filter.urgency = urgency;
        if (type)    filter.type    = { $regex: type, $options: 'i' };
        if (search)  filter.$or = [
            { name:     { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
            { phone:    { $regex: search, $options: 'i' } }
        ];

        const total    = await HelpRequest.countDocuments(filter);
        const requests = await HelpRequest.find(filter)
            .sort({ priorityScore: -1, timestamp: -1 })
// ✅ Highest score always shown first
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            data:       requests,
            total:      total,
            page:       page,
            totalPages: Math.ceil(total / limit),
            limit:      limit
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stats endpoint (fast count only)
app.get('/api/helprequests/stats', async (req, res) => {
    try {
        const [pending, assigned, resolved, critical] = await Promise.all([
            HelpRequest.countDocuments({ status: 'pending' }),
            HelpRequest.countDocuments({ status: 'assigned' }),
            HelpRequest.countDocuments({ status: 'resolved' }),
            HelpRequest.countDocuments({ urgency: 'critical', status: 'pending' }),
        ]);
        res.json({ pending, assigned, resolved, critical, total: pending + assigned + resolved });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/helprequests', async (req, res) => {
    try {
        const body = req.body;

        // ✅ Auto-calculate priority score on save
        body.priorityScore = calculatePriorityScore(
            body.urgency,
            body.people,
            new Date()
        );

        const request = new HelpRequest(body);
        await request.save();
        res.status(201).json(request);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Recalculate priority scores for ALL existing requests
app.post('/api/helprequests/recalculate-scores', async (req, res) => {
    try {
        const all = await HelpRequest.find({ status: 'pending' });
        let updated = 0;
        for (const item of all) {
            item.priorityScore = calculatePriorityScore(
                item.urgency,
                item.people,
                item.timestamp
            );
            await item.save();
            updated++;
        }
        res.json({ message: `Recalculated ${updated} requests` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/helprequests/:id/status', async (req, res) => {
  try {
    const request = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(request);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/helprequests/:id', async (req, res) => {
  try {
    await HelpRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Request closed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── START ──────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Access on your phone: http://192.168.1.16:${PORT}`);
});
