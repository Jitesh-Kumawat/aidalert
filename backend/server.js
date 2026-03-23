require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Jimp } = require('jimp'); // Stable for Jimp v1.x
const tf = require('@tensorflow/tfjs');

const Alert = require('./models/Alert');
const HelpRequest = require('./models/HelpRequest');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// 1. MIDDLEWARE & STORAGE SETUP
// ==========================================
app.use(cors());
app.use(express.json());

// Uploads folder verify
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Model folder static hosting
app.use('/model', express.static(path.join(__dirname, 'model')));

// Multer disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// ==========================================
// 2. DATABASE CONNECTION
// ==========================================
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

// ==========================================
// 3. AI MODEL LOADING (Graph Mode)
// ==========================================
let potholeModel = null;
async function loadCNNModel() {
    try {
        console.log('⏳ Loading Bulletproof Graph AI Model...');
        // Path matches the static route above
        potholeModel = await tf.loadGraphModel(`http://localhost:${PORT}/model/model.json`);
        console.log('🤖 AI Model Loaded Successfully (Graph Mode)!');
    } catch (err) {
        console.error('❌ AI Loading Error:', err.message);
    }
}

// ==========================================
// 4. POTHOLE DETECTION ROUTE (Sabse Stable Version)
// ==========================================
app.post('/api/pothole-detect', upload.single('image'), async (req, res) => {
    try {
        if (!potholeModel) throw new Error("AI Model is still initializing...");
        if (!req.file) throw new Error("Please upload an image");

        // Jimp supports: JPG, PNG, BMP, TIFF. (AVIF not supported yet)
        const image = await Jimp.read(req.file.path);
        
        // Resize image to 224x224 (New Syntax)
        image.resize({ w: 224, h: 224 });
        
        // Raw bitmap data extraction (Sabse fast aur bug-free tareeka)
        const { data, width, height } = image.bitmap;
        const values = new Float32Array(width * height * 3);
        
        // RGBA buffer ko normalize karke RGB tensor values mein convert karna
        for (let i = 0; i < width * height; i++) {
            values[i * 3] = data[i * 4] / 255.0;         // R
            values[i * 3 + 1] = data[i * 4 + 1] / 255.0; // G
            values[i * 3 + 2] = data[i * 4 + 2] / 255.0; // B
        }

        // Tensor setup aur Prediction
        const tensor = tf.tensor3d(values, [224, 224, 3], 'float32').expandDims(0);
        const prediction = potholeModel.predict(tensor);
        const scoreData = await prediction.data();
        const score = scoreData[0]; 

        // AI Memory cleanup
        tensor.dispose();
        prediction.dispose();
        
        let alertCreated = false;
        // Pothole found threshold (0.5)
        if (score > 0.5) {
            const newAlert = new Alert({
                type: 'road_damage',
                location: req.body.location || 'Auto-detected via AI',
                severity: score > 0.75 ? 'high' : 'medium',
                description: `[AI VERIFIED] Pothole detected with ${Math.round(score * 100)}% confidence.`
            });
            await newAlert.save();
            alertCreated = true;
        }
        
        res.json({
            pothole: score > 0.5,
            confidence: Math.round(score * 100),
            alertCreated: alertCreated
        });

    } catch (error) {
        console.error("Route Error:", error);
        // Error handling for unsupported formats like AVIF
        let errorMessage = error.message;
        if (errorMessage.includes('Mime type image/avif')) {
            errorMessage = "AVIF format is not supported. Please upload JPG or PNG.";
        }
        res.status(500).json({ error: errorMessage });
    } finally {
        // Cleanup temp file from disk
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

// ==========================================
// 5. STANDARD API ROUTES
// ==========================================
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

app.get('/api/helprequests', async (req, res) => {
    try {
        const requests = await HelpRequest.find().sort({ timestamp: -1 });
        res.json(requests);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/helprequests', async (req, res) => {
    try {
        const request = new HelpRequest(req.body);
        await request.save();
        res.status(201).json(request);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.patch('/api/helprequests/:id/status', async (req, res) => {
    try {
        const request = await HelpRequest.findByIdAndUpdate(
            req.params.id, { status: req.body.status }, { new: true }
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

// ==========================================
// 6. SERVER START
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    // Delay of 2 seconds for clean initialization
    setTimeout(loadCNNModel, 2000);
});