// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');
const newAlertBtn = document.getElementById('newAlertBtn');
const newAlertModal = document.getElementById('newAlertModal');
const closeAlertModal = document.getElementById('closeAlertModal');
const alertForm = document.getElementById('alertForm');
const alertsGrid = document.getElementById('alertsGrid');
const recentAlerts = document.getElementById('recentAlerts');

const quickFood = document.getElementById('quickFood');
const quickMedical = document.getElementById('quickMedical');
const quickShelter = document.getElementById('quickShelter');
const quickCustom = document.getElementById('quickCustom');
const fastHelpModal = document.getElementById('fastHelpModal');
const closeHelpModal = document.getElementById('closeHelpModal');
const fastHelpForm = document.getElementById('fastHelpForm');
const helpTitle = document.getElementById('helpTitle');
const helpUrgency = document.getElementById('helpUrgency');
const addContact = document.getElementById('addContact');
const recentRequests = document.getElementById('recentRequests');
const requestStats = document.getElementById('requestStats');

// Backend data arrays & GLOBAL Map Variables
let alerts = [];
let helpRequests = [];
let map;
let markersLayer; 

// Advanced Routing Objects (RESTORED FROM OLD)
let activeRoutes = {}; 
let govBaseLocation = L.latLng(25.1433, 75.8080); // Exact RTU Kota Location
// let rescueLegend; 
let isLegendOpen = false;

const API_BASE = 'http://localhost:5000/api';

// ==========================================
// DATA FETCHING
// ==========================================
async function fetchAlerts() {
    try {
        const response = await fetch(`${API_BASE}/alerts`);
        alerts = await response.json();
        renderAlerts();
    } catch (error) { console.error('Error fetching alerts:', error); }
}

async function fetchHelpRequests() {
    try {
        const response = await fetch(`${API_BASE}/helprequests`);
        helpRequests = await response.json();
        renderHelpRequests();
        updateRequestStats();
        updateResources(); 
    } catch (error) { console.error('Error fetching requests:', error); }
}

// ==========================================
// NAVIGATION & UI
// ==========================================
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            window.scrollTo({ top: targetSection.offsetTop - 70, behavior: 'smooth' });
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            targetSection.classList.add('active');
            navMenu.classList.remove('active');
            if (targetId === 'dashboard' && map) setTimeout(() => map.invalidateSize(), 100);
        }
    });
});

menuToggle.addEventListener('click', () => navMenu.classList.toggle('active'));
newAlertBtn.addEventListener('click', () => newAlertModal.classList.add('active'));
closeAlertModal.addEventListener('click', () => newAlertModal.classList.remove('active'));

// ==========================================
// 1. AI POTHOLE SCANNING LOGIC (RESTORED)
// ==========================================
const aiScanBtn = document.getElementById('aiScanBtn');
const aiStatus = document.getElementById('aiStatus');

if (aiScanBtn) {
    aiScanBtn.addEventListener('click', async () => {
        const fileInput = document.getElementById('hazardImage');
        const file = fileInput.files[0];
        if (!file) return showNotification('Bhai, pehle image select karo!', 'warning');

        aiScanBtn.disabled = true;
        aiScanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        aiStatus.textContent = "AI is scanning...";

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('location', document.getElementById('alertLocation').value || 'Detected by AI');

            const response = await fetch(`${API_BASE}/pothole-detect`, { method: 'POST', body: formData });
            const result = await response.json();

            if (result.pothole) {
                showNotification(`🚨 Pothole Found! (${result.confidence}%)`, 'success');
                aiStatus.innerHTML = `<b style="color:red">Pothole Found (${result.confidence}%)</b>`;
                document.getElementById('alertType').value = 'road_damage';
                document.getElementById('alertSeverity').value = result.confidence > 75 ? 'high' : 'medium';
                document.getElementById('alertDescription').value = `[AI VERIFIED] Pothole detected with ${result.confidence}% confidence.`;
            } else {
                showNotification('✅ Road safe.', 'info');
                aiStatus.innerHTML = `<b style="color:green">Safe Road</b>`;
            }
        } catch (err) { showNotification('AI Offline', 'error'); }
        finally { aiScanBtn.disabled = false; aiScanBtn.innerHTML = '<i class="fas fa-search"></i> Run AI Analysis'; }
    });
}

// ==========================================
// 2. MAP & LEGEND (FULL DETAIL RESTORED)
// ==========================================
function setupMapLegend() {
    rescueLegend = L.control({ position: 'bottomleft' });
    rescueLegend.onAdd = function () {
        this._div = L.DomUtil.create('div', 'map-legend-wrapper');
        L.DomEvent.disableClickPropagation(this._div);
        this._btn = L.DomUtil.create('button', 'legend-toggle-btn', this._div);
        this._content = L.DomUtil.create('div', 'map-legend-content', this._div);
        L.DomEvent.on(this._btn, 'click', function() { isLegendOpen = !isLegendOpen; this.update(); }, this);
        this.update();
        return this._div;
    };
    rescueLegend.update = function () {
        if (!this._div) return;
        const routeKeys = Object.keys(activeRoutes);
        if (routeKeys.length === 0) { this._div.style.display = 'none'; return; }
        this._div.style.display = 'flex';
        this._btn.innerHTML = `<i class="fas ${isLegendOpen ? 'fa-times' : 'fa-bars'}"></i> Active Dispatches <span style="background:red; color:white; padding:2px 8px; border-radius:12px; font-size:0.8rem; margin-left:auto;">${routeKeys.length}</span>`;
        this._content.style.display = isLegendOpen ? 'block' : 'none';
        if (isLegendOpen) {
            let html = '';
            routeKeys.forEach(key => {
                const data = activeRoutes[key];
                html += `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; padding:6px; background:#f8f9fa; border-radius:8px;">
                    <div style="width:12px; height:12px; border-radius:50%; background:${data.color};"></div>
                    <div style="flex:1;">
                        <strong style="display:block; color:#333; font-size:0.8rem;">${data.destination.toUpperCase()}</strong>
                        <span style="color:#7f8c8d; font-size:0.7rem;"><i class="fas fa-route"></i> ${data.distance} | <i class="fas fa-clock"></i> ETA: ${data.time}</span>
                    </div>
                </div>`;
            });
            this._content.innerHTML = html;
        }
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    map = L.map('map', { zoomControl: false, fullscreenControl: true, fullscreenControlOptions: { position: 'topright' } }).setView([25.1433, 75.8080], 13);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    setupMapLegend(); rescueLegend.addTo(map);
    L.marker(govBaseLocation).addTo(map).bindPopup('<b>🏛️ Govt HQ: RTU Kota</b>').openPopup();
    await fetchAlerts(); await fetchHelpRequests(); await restoreActiveRoutes(); 
});

// ==========================================
// 3. ADVANCED DIJKSTRA ROUTING (RESTORED)
// ==========================================
async function drawRescueRoute(destinationStr, id, zoomToPath = true) {
    if (!map) return;
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationStr)}`, {
    headers: {
        'User-Agent': 'RescueApp/1.0 (nikhil.verma521975@gamil.com)'
    }
});
        const data = await response.json();
        if (data && data.length > 0) {
            const destLocation = L.latLng(data[0].lat, data[0].lon);
            if (activeRoutes[id]) { map.removeControl(activeRoutes[id].control); map.removeLayer(activeRoutes[id].marker); }
            const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f'];
            const routeColor = colors[Object.keys(activeRoutes).length % colors.length];
            const instantDistKm = (govBaseLocation.distanceTo(destLocation) / 1000).toFixed(1);
            const destMarker = L.marker(destLocation, { icon: L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', iconSize: [25, 41], iconAnchor: [12, 41] }) }).addTo(map);
            const newRouteControl = L.Routing.control({
                waypoints: [govBaseLocation, destLocation],
                addWaypoints: false, show: false,
                lineOptions: { styles: [{color: routeColor, opacity: 0.8, weight: 6}] }
            }).addTo(map);

            activeRoutes[id] = { control: newRouteControl, marker: destMarker, destination: destinationStr, color: routeColor, distance: `${instantDistKm} km`, time: 'Calculating...' };
            
            newRouteControl.on('routesfound', function(e) {
                 const route = e.routes[0];

                const timeInMinutes = Math.round(route.summary.totalTime / 60);
                 const distanceInKm = (route.summary.totalDistance / 1000).toFixed(1);

                 activeRoutes[id].time = `${timeInMinutes} min`;
                 activeRoutes[id].distance = `${distanceInKm} km`;

                console.log(`Route to ${destinationStr}: ${distanceInKm} km, ${timeInMinutes} min`);
            });
            if (zoomToPath) {
                newRouteControl.on('routesfound', function(e) {
                    const bounds = L.latLngBounds(e.routes[0].coordinates);
                    map.fitBounds(bounds);
                 });
            }map.flyTo(destLocation, 8);
            rescueLegend.update();
        }
    } catch (error) { console.error("Routing failed", error); }
}

async function resolveHelpRequest(id, btn, targetLocation) {
    if (!confirm('Dispatch Team?')) return;
    try {
        await fetch(`${API_BASE}/helprequests/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'assigned' }) });
        showNotification('✅ Team dispatched!', 'success');
        await drawRescueRoute(targetLocation, id, true);
        document.querySelector('a[href="#dashboard"]').click();
        await fetchHelpRequests();
    } catch (e) {}
}

async function closeHelpRequest(id) {
    if (!confirm('Close?')) return;
    try {
        await fetch(`${API_BASE}/helprequests/${id}`, { method: 'DELETE' });
        if (activeRoutes[id]) { map.removeControl(activeRoutes[id].control); map.removeLayer(activeRoutes[id].marker); delete activeRoutes[id]; rescueLegend.update(); }
        await fetchHelpRequests();
    } catch (e) {}
}

async function restoreActiveRoutes() {
    const assignedReqs = helpRequests.filter(r => r.status === 'assigned');
    for (const req of assignedReqs) { if (!activeRoutes[req._id]) await drawRescueRoute(req.location, req._id, false); }
}

// ==========================================
// 4. RENDERING & COLORS (RESTORED)
// ==========================================
function renderHelpRequests() {
    recentRequests.innerHTML = helpRequests.slice(0, 5).map(req => {
        const isAssigned = req.status === 'assigned';
        // COLOR UI RESTORED: Gradient background based on urgency
        return `
        <li class="alert-item" style="background: linear-gradient(45deg, ${getUrgencyColor(req.urgency)}, ${getUrgencyColor(req.urgency, true)}); color: white; display: flex; justify-content: space-between; align-items: center; margin-bottom:10px; padding:15px; border-radius:10px;">
            <div><strong>${req.type.toUpperCase()} - ${req.location}</strong><br><small>${req.people} people | ${req.details}</small></div>
            <div>
                ${isAssigned 
                    ? `<button onclick="closeHelpRequest('${req._id}')" class="btn btn-small" style="background:rgba(255,255,255,0.2); color:white; border:1px solid white;">Close</button>`
                    : `<button onclick="resolveHelpRequest('${req._id}', this, '${req.location}')" class="btn btn-small" style="background:white; color:#333;">Dispatch</button>`
                }
            </div>
        </li>`;
    }).join('');
}

function getUrgencyColor(urgency, darker = false) {
    const colors = { critical: darker ? '#c0392b' : '#e74c3c', high: darker ? '#d35400' : '#e67e22', medium: darker ? '#e67e22' : '#f39c12', low: '#95a5a6' };
    return colors[urgency] || '#95a5a6';
}

function renderAlerts() {

    recentAlerts.innerHTML = alerts.map(a => `
        <li class="alert-item" style="background:#f39c12; color:white; margin-bottom:5px; padding:10px; border-radius:5px;">
            <strong>${a.type.toUpperCase()}</strong> - ${a.location}
        </li>`).join('');

    // Baki ka function (alertsGrid wala part) waisa hi rehne do
    alertsGrid.innerHTML = alerts.map(a => `
        <div class="card alert-card">
            <h4>${a.type.toUpperCase()}</h4>
            <p>${a.location}</p>
            <button onclick="deleteAlert('${a._id}')" class="btn btn-small" style="background:red; color:white;">Delete</button>
        </div>`).join('');
    
    document.getElementById('activeAlerts').textContent = alerts.length;
    plotAllAlertsOnMap();
}

async function geocodeAndPlot(locationStr, type, description, flyToMarker = false) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationStr)}`);
        const data = await res.json();
        if (data.length > 0) {
            const marker = L.marker([data[0].lat, data[0].lon], { icon: redIcon }).addTo(markersLayer);
            marker.bindPopup(`<b>🚨 ${type.toUpperCase()}</b><br>${locationStr}`);
            if (flyToMarker) map.flyTo([data[0].lat, data[0].lon], 10);
        }
    } catch (e) {}
}

async function plotAllAlertsOnMap() {
    if (!markersLayer) return; markersLayer.clearLayers();
    for (const a of alerts) await geocodeAndPlot(a.location, a.type, a.description, false);
}

// ==========================================
// 5. EMERGENCY BUTTONS (RESTORED)
// ==========================================
if (quickFood) quickFood.addEventListener('click', () => openHelpModal('food', 'Food & Water'));
if (quickMedical) quickMedical.addEventListener('click', () => openHelpModal('medical', 'Medical Help'));
if (quickShelter) quickShelter.addEventListener('click', () => openHelpModal('shelter', 'Shelter'));
if (quickCustom) quickCustom.addEventListener('click', () => openHelpModal('other', 'Custom Need'));
if (closeHelpModal) closeHelpModal.addEventListener('click', () => fastHelpModal.classList.remove('active'));

function openHelpModal(type, title) {
    helpTitle.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${title} Request`;
    fastHelpForm.reset();
    fastHelpModal.classList.add('active');
}

fastHelpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(fastHelpForm);
    const newRequest = { type: 'emergency', location: formData.get('location'), people: parseInt(formData.get('people')), urgency: formData.get('urgency'), details: formData.get('details') };
    await fetch(`${API_BASE}/helprequests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRequest) });
    fastHelpModal.classList.remove('active');
    await fetchHelpRequests();
    showNotification('🚨 REQUEST SENT!', 'success');
});

// Helper Stats
function updateRequestStats() {
    const pending = helpRequests.filter(r => r.status === 'pending').length;
    const assigned = helpRequests.filter(r => r.status === 'assigned').length;
    requestStats.innerHTML = `<div class="stat-card"><h3>${pending}</h3><p>Pending</p></div><div class="stat-card"><h3>${assigned}</h3><p>Active</p></div>`;
}
function updateResources() { document.getElementById('supplies').textContent = "87%"; }
function showNotification(msg, type) {
    const n = document.createElement('div'); n.className = `notification notification-${type}`; n.textContent = msg;
    document.body.appendChild(n); setTimeout(() => n.classList.add('show'), 100);
    setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3000);
}
async function deleteAlert(id) { if(confirm('Delete?')) { await fetch(`${API_BASE}/alerts/${id}`, { method: 'DELETE' }); fetchAlerts(); } }

alertForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertData = { type: document.getElementById('alertType').value, location: document.getElementById('alertLocation').value, severity: document.getElementById('alertSeverity').value, description: document.getElementById('alertDescription').value };
    await fetch(`${API_BASE}/alerts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(alertData) });
    alertForm.reset(); newAlertModal.classList.remove('active'); fetchAlerts();
});

// ==========================================
// 🏥 RESOURCE MANAGEMENT LOGIC (FULL UPDATED)
// ==========================================

// 1. Live Resource Counter Update Function
function updateResources() {
    const MAX_AMBULANCES = 20; 
    const MAX_FIRETRUCKS = 12; 
    const MAX_RESCUE = 30;

    // Filter assigned requests to count active missions
    // Type checking case-insensitive taaki sahi count ho
    let deployedA = helpRequests.filter(r => r.status === 'assigned' && r.type.toLowerCase().includes('ambulance')).length;
    let deployedF = helpRequests.filter(r => r.status === 'assigned' && (r.type.toLowerCase().includes('fire') || r.type.toLowerCase().includes('truck'))).length;
    let deployedR = helpRequests.filter(r => r.status === 'assigned' && (r.type.toLowerCase().includes('rescue') || r.type.toLowerCase().includes('team'))).length;

    // Availability Calculate karo
    const availA = Math.max(0, MAX_AMBULANCES - deployedA);
    const availF = Math.max(0, MAX_FIRETRUCKS - deployedF);
    const availR = Math.max(0, MAX_RESCUE - deployedR);

    // HTML Update (Ensure IDs match your index.html)
    const ambEl = document.getElementById('ambulanceCount');
    const fireEl = document.getElementById('firetruckCount');
    const resEl = document.getElementById('rescueCount');

    if (ambEl) ambEl.innerHTML = `<strong>${availA}</strong>/${MAX_AMBULANCES} Available`;
    if (fireEl) fireEl.innerHTML = `<strong>${availF}</strong>/${MAX_FIRETRUCKS} Available`;
    if (resEl) resEl.innerHTML = `<strong>${availR}</strong>/${MAX_RESCUE} Available`;
    
    // Global Supply percentage update
    const suppliesEl = document.getElementById('supplies');
    if (suppliesEl) {
        const totalMax = MAX_AMBULANCES + MAX_FIRETRUCKS + MAX_RESCUE;
        const totalAvail = availA + availF + availR;
        suppliesEl.textContent = `${Math.round((totalAvail / totalMax) * 100)}%`;
    }
}

// 2. Resource Page "Dispatch" Button Handler
document.querySelectorAll('.resource-card .btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const card = e.target.closest('.resource-card');
        const resourceName = card.querySelector('h3').innerText; // e.g., "Ambulances"
        
        // Location pucho
        const loc = prompt(`Enter target location for ${resourceName}:`, "Bundi");
        if (!loc) return;

        // Visual loading state
        const originalText = e.target.innerText;
        e.target.innerText = "Dispatching...";
        e.target.disabled = true;

        try {
            // A. Naya help request banao (Backend Sync)
            const autoReq = {
                type: resourceName.slice(0, -1), // "Ambulances" -> "Ambulance"
                location: loc,
                people: 1,
                urgency: 'high',
                details: `Manual dispatch from Resource Manager`
            };

            const response = await fetch(`${API_BASE}/helprequests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(autoReq)
            });
            const data = await response.json();

            // B. Turant status 'assigned' karo rasta banane ke liye
            await resolveHelpRequest(data._id, null, loc); 

            // C. Map section par scroll karo
            const mapSection = document.getElementById('dashboard');
            if (mapSection) {
                window.scrollTo({ top: mapSection.offsetTop - 70, behavior: 'smooth' });
            }

            showNotification(`✅ ${resourceName} dispatched from RTU Kota HQ to ${loc}`, 'success');

        } catch (err) {
            console.error("Resource dispatch error:", err);
            showNotification('❌ Dispatch failed', 'error');
        } finally {
            e.target.innerText = originalText;
            e.target.disabled = false;
        }
    });
});

// 3. Script load hone par aur data fetch ke baad updateResources call karna zaroori hai
// Ise fetchHelpRequests function ke end mein bhi add kar dena.