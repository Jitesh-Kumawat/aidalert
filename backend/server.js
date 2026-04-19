require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Jimp } = require('jimp');
const tf = require('@tensorflow/tfjs');

const Alert = require('./models/Alert');
const HelpRequest = require('./models/HelpRequest');
const PotholeAlert = require('./models/PotholeAlert');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST_IP = process.env.HOST_IP || '192.168.1.16';
const reactDistPath = path.join(__dirname, '../frontend-react/dist');

const Incident = require('./models/Incident');


// middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '15mb' }));

// static files
app.use('/model', express.static(path.join(__dirname, 'model')));

if (fs.existsSync(reactDistPath)) {
  app.use(express.static(reactDistPath));
}

// uploads dir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use('/uploads', express.static(uploadDir));


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

//incident type config
const INCIDENT_TYPE_CONFIG = {
  pothole: {
    title: 'Pothole Alert',
    severity: 'high',
    alertRadiusMeters: 500,
  },
  broken_railing: {
    title: 'Broken Railing Alert',
    severity: 'high',
    alertRadiusMeters: 500,
  },
  under_construction: {
    title: 'Under Construction Alert',
    severity: 'medium',
    alertRadiusMeters: 500,
  },
  road_collapse: {
    title: 'Road Collapse Alert',
    severity: 'critical',
    alertRadiusMeters: 700,
  },
  damaged_road: {
    title: 'Damaged Road Alert',
    severity: 'high',
    alertRadiusMeters: 500,
  },
  debris: {
    title: 'Road Debris Alert',
    severity: 'medium',
    alertRadiusMeters: 400,
  },
  disaster: {
    title: 'Disaster Alert',
    severity: 'critical',
    alertRadiusMeters: 1000,
  },
  flood: {
    title: 'Flood Alert',
    severity: 'critical',
    alertRadiusMeters: 1000,
  },
  fire: {
    title: 'Fire Alert',
    severity: 'critical',
    alertRadiusMeters: 800,
  },
  landslide: {
    title: 'Landslide Alert',
    severity: 'critical',
    alertRadiusMeters: 1000,
  },
  building_collapse: {
    title: 'Building Collapse Alert',
    severity: 'critical',
    alertRadiusMeters: 800,
  },
};

function getIncidentConfig(type = 'pothole') {
  return INCIDENT_TYPE_CONFIG[type] || INCIDENT_TYPE_CONFIG.pothole;
}

// database
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => console.log('MongoDB Connection Error:', err));

// AI model (Potholes)
let potholeModel = null;
async function loadModel() {
  try {
    potholeModel = await tf.loadGraphModel(`http://127.0.0.1:${PORT}/model/model.json`);
    console.log('AI Model Loaded');
  } catch (err) {
    console.error('AI Load Error:', err.message);
  }
}
setTimeout(loadModel, 2000);
// Keep ML service warm
setInterval(async () => {
  try {
    await fetch(`${process.env.ML_SERVICE_URL || 'https://aidalert-ml.onrender.com'}/`);
    console.log('ML warm ping ok');
  } catch (e) {
    console.error('ML ping failed:', e.message);
  }
}, 10 * 60 * 1000);
// ==========================================
// 1. THE PERMANENT ML FIX (YOUR PYTHON API + SMART WAKE-UP)
// ==========================================
async function predictPriorityWithML(cleanMessageText, retries = 3) {
  const mlUrl = process.env.ML_SERVICE_URL || 'https://aidalert-ml.onrender.com';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${mlUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: cleanMessageText, // Only send the raw text!
          req_type: "Other",
          people_count: 1,
          vulnerable_present: "no",
          waiting_minutes: 0
        })
      });

      // Catch the "Cold Start" 502/503 error specifically
      if (response.status === 502 || response.status === 503) {
        throw new Error(`Python server is waking up from sleep (${response.status})`);
      }

      if (!response.ok) throw new Error(`Python API failed: ${response.status}`);

      const data = await response.json();

      // Safety check in case Python returns empty data
      if (!data || !data.priority) throw new Error("Invalid response from Python API");

      return { priority: data.priority, confidence: data.confidence };

    } catch (err) {
      console.error(`ML attempt ${attempt}/${retries} failed:`, err.message);

      if (attempt === retries) return null; // Trigger fallback after 3 fails

      // THE FIX: Wait 10 full seconds to give Python time to boot up!
      console.log("Waiting 10 seconds for Python server to wake up...");
      await new Promise(r => setTimeout(r, 10000));
    }
  }
}

// Expanded keyword list to catch things immediately without AI
function hasCriticalKeywords(text = '') {
  const t = text.toLowerCase();
  const keywords = [
    'unconscious', 'not breathing', 'bleeding', 'trapped', 'collapsed',
    'collapse', 'fire', 'drowning', 'heart attack', 'gas leak', 'hanging', 'explosion'
  ];

  return keywords.some((word) => t.includes(word));
}

// AI pothole detect
// app.post('/api/pothole-detect', upload.single('image'), async (req, res) => {
//   try {
//     if (!potholeModel) throw new Error('AI Model not ready');
//     if (!req.file) throw new Error('No image uploaded');

//     const image = await Jimp.read(req.file.path);
//     image.resize({ w: 224, h: 224 });

//     const { data, width, height } = image.bitmap;
//     const values = new Float32Array(width * height * 3);

//     for (let i = 0; i < width * height; i++) {
//       values[i * 3] = data[i * 4] / 255.0;
//       values[i * 3 + 1] = data[i * 4 + 1] / 255.0;
//       values[i * 3 + 2] = data[i * 4 + 2] / 255.0;
//     }

//     const tensor = tf.tensor3d(values, [224, 224, 3]).expandDims(0);
//     const prediction = potholeModel.predict(tensor);
//     const score = (await prediction.data())[0];

//     tensor.dispose();
//     prediction.dispose();

//     let alertCreated = false;
//     if (score > 0.5) {
//       await new Alert({
//         type: 'road_damage',
//         location: req.body.location || 'AI Detected',
//         severity: score > 0.75 ? 'high' : 'medium',
//         description: `[AI VERIFIED] Pothole detected with ${Math.round(score * 100)}% confidence.`,
//         latitude: req.body.latitude || null,
//         longitude: req.body.longitude || null,
//       }).save();
//       alertCreated = true;
//     }

//     res.json({
//       pothole: score > 0.5,
//       confidence: Math.round(score * 100),
//       alertCreated,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   } finally {
//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }
//   }
// });
// ENTERPRISE AI ROUTE: Base64 JSON Payload + AI Watchdog Timer
app.post('/api/potholes/report', async (req, res) => {
  try {
    if (!potholeModel) throw new Error('AI Model is still booting. Please try again in 5 seconds.');

    const { latitude, longitude, city, locationText, imageBase64 } = req.body;
    const lat = Number(latitude);
    const lng = Number(longitude);

    // 1. Validation
    if (!imageBase64) throw new Error('No image provided in request');
    if (!city || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Missing location data' });
    }

    console.log("1. Received Base64 Image payload...");

    // 2. Decode Base64 Text back into an Image Buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // 3. Process Image
    console.log("2. Processing Image for AI...");
    const image = await Jimp.read(imageBuffer);
    const resized = image.resize({ w: 224, h: 224 });

    const width = resized.width;
    const height = resized.height;
    const values = new Float32Array(width * height * 3);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = resized.getPixelColor(x, y);
        const r = (pixel >>> 24) & 0xff;
        const g = (pixel >>> 16) & 0xff;
        const b = (pixel >>> 8)  & 0xff;
        const idx = (y * width + x) * 3;
        values[idx]     = r / 255.0;
        values[idx + 1] = g / 255.0;
        values[idx + 2] = b / 255.0;
      }
    }

    console.log("3. Running TensorFlow Prediction...");
    
    // 4. THE WATCHDOG: Wrap the AI in a safe execution block
    const runAI = async () => {
        const tensor = tf.tensor3d(values, [224, 224, 3]).expandDims(0);
        const prediction = potholeModel.predict(tensor);
        const score = (await prediction.data())[0];
        tensor.dispose();
        prediction.dispose();
        return score;
    };

    // If the ML math freezes the server for > 12 seconds, this kills it safely
    const watchdogTimer = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI Processing Timeout: Server overloaded")), 12000)
    );

    // Race the AI against the clock!
    const score = await Promise.race([runAI(), watchdogTimer]);
    
    console.log(`4. AI Scan Complete! Score: ${score}`);

    // 5. Save to Database
    let alertCreated = false;
    let potholeData = null;

    if (score > 0.5) {
      potholeData = await new PotholeAlert({
        city,
        locationText: locationText || 'Citizen Reported Hazard',
        latitude: lat,
        longitude: lng,
        coordinates: { type: 'Point', coordinates: [lng, lat] },
        severity: score > 0.75 ? 'high' : 'medium',
        confidence: Math.round(score * 100),
        source: 'citizen',
        status: 'active',
      }).save();
      alertCreated = true;
    }

    res.status(200).json({
      pothole: score > 0.5,
      confidence: Math.round(score * 100),
      alertCreated,
      data: potholeData
    });

  } catch (error) {
    console.error("AI Route Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});
// alerts API
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alerts', async (req, res) => {
  try {
    const alert = await new Alert(req.body).save();
    res.status(201).json(alert);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/alerts/:id', async (req, res) => {
  try {
    await Alert.findByIdAndDelete(req.params.id);
    res.json({ message: 'Alert deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// priority logic
const GOVT_PRIORITY_BY_TYPE = {
  Medical: 'critical',
  Rescue: 'high',
  Supplies: 'medium',
  Other: 'low',
};

function getUrgencyFromType(type) {
  return GOVT_PRIORITY_BY_TYPE[type] || 'medium';
}

function calculatePriorityScore(urgency, people, timestamp) {
  const urgencyPoints = { critical: 100, high: 70, medium: 40, low: 20 };
  let score = urgencyPoints[urgency] || 70;

  const p = parseInt(people, 10) || 1;
  if (p >= 10) score += 30;
  else if (p >= 6) score += 20;
  else if (p >= 2) score += 10;

  const waitMins = (Date.now() - new Date(timestamp).getTime()) / 60000;
  if (waitMins > 180) score += 60;
  else if (waitMins > 60) score += 40;
  else if (waitMins > 30) score += 20;

  return score;
}

// help requests API
app.get('/api/helprequests', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { status, urgency, type, search } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;
    if (type) filter.type = { $regex: type, $options: 'i' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await HelpRequest.countDocuments(filter);
    const requests = await HelpRequest.find(filter)
      .sort({ priorityScore: -1, timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      data: requests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/helprequests/stats', async (req, res) => {
  try {
    const [pending, assigned, resolved, critical] = await Promise.all([
      HelpRequest.countDocuments({ status: 'pending' }),
      HelpRequest.countDocuments({ status: 'assigned' }),
      HelpRequest.countDocuments({ status: 'resolved' }),
      HelpRequest.countDocuments({ urgency: 'critical', status: 'pending' }),
    ]);

    res.json({
      pending,
      assigned,
      resolved,
      critical,
      total: pending + assigned + resolved,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/helprequests/recalculate-scores', async (req, res) => {
  try {
    const all = await HelpRequest.find({ status: 'pending' });

    for (const item of all) {
      item.priorityScore = calculatePriorityScore(
        item.urgency,
        item.people,
        item.timestamp
      );
      await item.save();
    }

    res.json({ message: `Recalculated ${all.length} requests` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 2. THE PERMANENT ROUTING FIX
// ==========================================
app.post('/api/helprequests', async (req, res) => {
  try {
    const body = { ...req.body };
    body.people = parseInt(body.people, 10) || 1;

    // Isolate the description text
    const descriptionText = (body.description || '').trim();
    // Message with location is only used for the keyword search
    const messageWithLocation = `${descriptionText} ${body.location || ''}`.trim();

    // SCENARIO A: Critical Keywords Found -> Instant Save, No ML
    if (hasCriticalKeywords(messageWithLocation)) {
      body.urgency = 'critical';
      body.priorityScore = calculatePriorityScore('critical', body.people, new Date());
      body.prioritySource = 'rule';
      body.modelConfidence = 1.0;

      // SCENARIO B: Empty Description -> Use Dropdown Type, No ML
    } else if (descriptionText === '') {
      body.urgency = getUrgencyFromType(body.type);
      body.priorityScore = calculatePriorityScore(body.urgency, body.people, new Date());
      body.prioritySource = 'dropdown_default';
      body.modelConfidence = 1.0;

      // SCENARIO C: Custom Text -> Send ONLY the text to Python
    } else {
      const ml = await predictPriorityWithML(descriptionText);

      if (ml) {
        // ML succeeded!
        body.urgency = ml.priority;
        body.priorityScore = calculatePriorityScore(body.urgency, body.people, new Date());
        body.prioritySource = 'ml';
        body.modelConfidence = ml.confidence;
      } else {
        // ML completely failed. Use safety fallback.
        body.urgency = getUrgencyFromType(body.type);
        body.priorityScore = calculatePriorityScore(body.urgency, body.people, new Date());
        body.prioritySource = 'ml_fallback';
        body.modelConfidence = 0.5;
      }
    }

    const request = await new HelpRequest(body).save();
    res.status(201).json(request);
  } catch (err) {
    console.error("SOS Creation Error Details:", err);
    res.status(400).json({ error: err.message });
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/helprequests/:id', async (req, res) => {
  try {
    await HelpRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Request closed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// serve React app after API routes
if (fs.existsSync(reactDistPath)) {
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(reactDistPath, 'index.html'));
  });
}

app.post('/api/potholes', async (req, res) => {
  try {
    const {
      city,
      locality,
      locationText,
      latitude,
      longitude,
      alertRadiusMeters,
      severity,
      confidence,
      source,
      imageUrl,
      notes,
    } = req.body;

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!city || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        error: 'city, latitude and longitude are required',
      });
    }

    const pothole = await new PotholeAlert({
      city,
      locality: locality || '',
      locationText: locationText || `${city}${locality ? `, ${locality}` : ''}`,
      latitude: lat,
      longitude: lng,
      coordinates: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      alertRadiusMeters: Number(alertRadiusMeters || 500),
      severity: severity || 'medium',
      confidence: confidence ?? null,
      source: source || 'manual',
      imageUrl: imageUrl || '',
      notes: notes || '',
      status: 'active',
    }).save();

    res.status(201).json(pothole);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/potholes/nearby', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius || 500);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng are required' });
    }

    const potholes = await PotholeAlert.find({
      status: 'active',
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radius,
        },
      },
    }).limit(20);

    res.json(potholes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/potholes/:id/status', async (req, res) => {
  try {
    const pothole = await PotholeAlert.findByIdAndUpdate(
      req.params.id,
      {
        status: req.body.status,
        lastVerifiedAt: new Date(),
      },
      { new: true }
    );

    res.json(pothole);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//incident API with image upload and AI processing
// app.post('/api/incidents/report', upload.single('image'), async (req, res) => {
//   try {
//     const {
//       hazardType = 'pothole',
//       latitude,
//       longitude,
//       city,
//       locationText,
//       notes,
//     } = req.body;

//     const lat = Number(latitude);
//     const lng = Number(longitude);

//     if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
//       return res.status(400).json({ error: 'Valid latitude and longitude are required' });
//     }

//     const config = getIncidentConfig(hazardType);
//     const resolvedLocation =
//       locationText?.trim() || city?.trim() || 'Citizen reported hazard';

//     const imageUrl = req.file
//       ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
//       : '';

//     const incident = await new Incident({
//       title: config.title,
//       type: hazardType,
//       description: notes?.trim() || `${config.title} reported by citizen`,
//       locationText: resolvedLocation,
//       latitude: lat,
//       longitude: lng,
//       coordinates: {
//         type: 'Point',
//         coordinates: [lng, lat],
//       },
//       severity: config.severity,
//       alertRadiusMeters: config.alertRadiusMeters,
//       status: 'unverified',
//       source: 'citizen',
//       confidence: null,
//       imageUrl,
//       notes: notes?.trim() || '',
//       reportedBy: 'citizen',
//     }).save();

//     res.status(201).json({
//       message: 'Report submitted for government verification',
//       incident,
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.post('/api/incidents', async (req, res) => {
//   try {
//     const {
//       type,
//       title,
//       description,
//       locationText,
//       latitude,
//       longitude,
//       severity,
//       alertRadiusMeters,
//       source,
//       confidence,
//       notes,
//     } = req.body;

//     const lat = Number(latitude);
//     const lng = Number(longitude);

//     if (!type || !locationText || !Number.isFinite(lat) || !Number.isFinite(lng)) {
//       return res.status(400).json({
//         error: 'type, locationText, latitude and longitude are required',
//       });
//     }

//     const config = getIncidentConfig(type);

//     const incident = await new Incident({
//       title: title || config.title,
//       type,
//       description: description || '',
//       locationText,
//       latitude: lat,
//       longitude: lng,
//       coordinates: {
//         type: 'Point',
//         coordinates: [lng, lat],
//       },
//       severity: severity || config.severity,
//       alertRadiusMeters: Number(alertRadiusMeters || config.alertRadiusMeters),
//       status: 'active',
//       source: source || 'govt',
//       confidence: confidence ?? null,
//       notes: notes || '',
//       verifiedAt: new Date(),
//       reportedBy: 'govt',
//     }).save();

//     res.status(201).json(incident);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.get('/api/incidents', async (req, res) => {
//   try {
//     const { status, type, source } = req.query;
//     const filter = {};

//     if (status) filter.status = status;
//     if (type) filter.type = type;
//     if (source) filter.source = source;

//     const incidents = await Incident.find(filter).sort({ createdAt: -1 });
//     res.json(incidents);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.get('/api/incidents/nearby', async (req, res) => {
//   try {
//     const lat = Number(req.query.lat);
//     const lng = Number(req.query.lng);
//     const radius = Number(req.query.radius || 500);

//     if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
//       return res.status(400).json({ error: 'Valid lat and lng are required' });
//     }

//     const incidents = await Incident.find({
//       status: 'active',
//       coordinates: {
//         $near: {
//           $geometry: {
//             type: 'Point',
//             coordinates: [lng, lat],
//           },
//           $maxDistance: radius,
//         },
//       },
//     }).limit(25);

//     res.json(incidents);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.patch('/api/incidents/:id/status', async (req, res) => {
//   try {
//     const { status } = req.body;
//     const update = { status };

//     if (status === 'verified' || status === 'active') {
//       update.verifiedAt = new Date();
//     }

//     const incident = await Incident.findByIdAndUpdate(
//       req.params.id,
//       update,
//       { new: true }
//     );

//     res.json(incident);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

app.post('/api/incidents/report', upload.single('image'), async (req, res) => {
  try {
    const {
      hazardType = 'pothole',
      latitude,
      longitude,
      city,
      locationText,
      notes,
    } = req.body;

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required' });
    }

    const config = getIncidentConfig(hazardType);
    const resolvedLocation =
      locationText?.trim() || city?.trim() || 'Citizen reported hazard';

    const imageUrl = req.file
      ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
      : '';

    const incident = await new Incident({
      type: hazardType,
      title: config.title,
      description: notes?.trim() || `${config.title} reported by citizen`,
      severity: config.severity,
      status: 'unverified',
      source: 'citizen',
      confidence: null,
      locationText: resolvedLocation,
      latitude: lat,
      longitude: lng,
      coordinates: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      alertRadiusMeters: config.alertRadiusMeters,
      imageUrl,
      reportedBy: 'citizen',
      notes: notes?.trim() || '',
    }).save();

    res.status(201).json({
      message: 'Report submitted for government verification',
      incident,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/incidents', async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      locationText,
      latitude,
      longitude,
      severity,
      alertRadiusMeters,
      source,
      confidence,
      notes,
    } = req.body;

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!type || !locationText || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        error: 'type, locationText, latitude and longitude are required',
      });
    }

    const config = getIncidentConfig(type);

    const incident = await new Incident({
      type,
      title: title || config.title,
      description: description || '',
      severity: severity || config.severity,
      status: 'active',
      source: source || 'govt',
      confidence: confidence ?? null,
      locationText,
      latitude: lat,
      longitude: lng,
      coordinates: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      alertRadiusMeters: Number(alertRadiusMeters || config.alertRadiusMeters),
      verifiedAt: new Date(),
      reportedBy: 'govt',
      notes: notes || '',
    }).save();

    res.status(201).json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/incidents', async (req, res) => {
  try {
    const { status, type, source } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (source) filter.source = source;

    const incidents = await Incident.find(filter).sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/incidents/nearby', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius || 500);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng are required' });
    }

    const incidents = await Incident.find({
      status: 'active',
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radius,
        },
      },
    }).limit(25);

    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/incidents/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid incident id' });
    }

    const update = { status };

    if (status === 'verified' || status === 'active') {
      update.verifiedAt = new Date();
    }

    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json(incident);
  } catch (err) {
    console.error('Incident status update error:', err);
    res.status(500).json({ error: err.message });
  }
});


app.patch('/api/incidents/:id/verify', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid incident id' });
    }

    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { status: 'active', verifiedAt: new Date() },
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json(incident);
  } catch (err) {
    console.error('Incident verify error:', err);
    res.status(500).json({ error: err.message });
  }
});


// start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Local LAN access: http://${HOST_IP}:${PORT}`);
});