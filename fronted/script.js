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
// Pagination & Filter State
let currentPage = 1;
let totalPages = 1;
let totalRequests = 0;
let filterStatus = '';
let filterUrgency = '';
let filterType = '';
let searchQuery = '';
let isLoadingMore = false;
let map;
let markersLayer;



// Advanced Routing Objects (RESTORED FROM OLD)
let activeRoutes = {};
let govBaseLocation = L.latLng(25.1433, 75.8080); // Exact RTU Kota Location
// let rescueLegend; 
let isLegendOpen = false;

const API_BASE = 'http://192.168.1.16:5000/api';

// ✅ Define red icon for hazard markers
const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

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

async function fetchHelpRequests(page = 1, append = false) {
    if (isLoadingMore) return;
    isLoadingMore = true;

    try {
        const params = new URLSearchParams({
            page,
            limit: 20,
            ...(filterStatus && { status: filterStatus }),
            ...(filterUrgency && { urgency: filterUrgency }),
            ...(filterType && { type: filterType }),
            ...(searchQuery && { search: searchQuery }),
        });

        const response = await fetch(`${API_BASE}/helprequests?${params}`);
        const result = await response.json();

        // ✅ Handle BOTH old (array) and new (paginated object) server formats
        if (Array.isArray(result)) {
            // Old server format: plain array
            if (append) {
                helpRequests = [...helpRequests, ...result];
            } else {
                helpRequests = result;
            }
            currentPage = 1;
            totalPages = 1;
            totalRequests = result.length;
        } else {
            // New server format: { data, total, page, totalPages }
            if (append) {
                helpRequests = [...helpRequests, ...(result.data || [])];
            } else {
                helpRequests = result.data || [];
            }
            currentPage = result.page || 1;
            totalPages = result.totalPages || 1;
            totalRequests = result.total || helpRequests.length;
        }

        renderHelpRequests(append);
        await fetchRequestStats();
        updateResources();
        await restoreActiveRoutes();
                // ✅ Recalc Scores button — added once
        const toolbar = document.querySelector('.sos-toolbar');
        if (toolbar && !document.getElementById('recalcBtn')) {
            const recalcBtn = document.createElement('button');
            recalcBtn.id = 'recalcBtn';
            recalcBtn.className = 'sos-refresh-btn';
            recalcBtn.style.background = 'rgba(231,76,60,0.2)';
            recalcBtn.innerHTML = '<i class="fas fa-calculator"></i> Recalc Scores';
            recalcBtn.onclick = async () => {
                recalcBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recalculating...';
                await fetch(`${API_BASE}/helprequests/recalculate-scores`, { method: 'POST' });
                await fetchHelpRequests();
                recalcBtn.innerHTML = '<i class="fas fa-calculator"></i> Recalc Scores';
                showNotification('✅ Priority scores updated!', 'success');
            };
            toolbar.appendChild(recalcBtn);
        }
    } catch (error) {
        console.error('Error fetching requests:', error);
    } finally {
        isLoadingMore = false;
    }
}

async function fetchRequestStats() {
    try {
        const res = await fetch(`${API_BASE}/helprequests/stats`);
        const stats = await res.json();
        updateRequestStats(stats);
    } catch (e) { }
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
        L.DomEvent.on(this._btn, 'click', function () { isLegendOpen = !isLegendOpen; this.update(); }, this);
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
<<<<<<< HEAD
        let destLocation;

        // ✅ FIX: Check if location is GPS coords (from Flutter app)
        const latLngMatch = destinationStr.match(
            /Lat[:\s]*([-\d.]+)[,\s]+Long[:\s]*([-\d.]+)/i
        );

        if (latLngMatch) {
            // Flutter GPS format: "Lat: 25.1234, Long: 75.5678"
            destLocation = L.latLng(
                parseFloat(latLngMatch[1]),
                parseFloat(latLngMatch[2])
            );
        } else {
            // Web dashboard text format: geocode via Nominatim
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationStr)}`
            );
            const data = await response.json();
            if (!data || data.length === 0) {
                showNotification('❌ Location not found on map', 'error');
                return;
            }
            destLocation = L.latLng(data[0].lat, data[0].lon);
=======
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
>>>>>>> bcd9ef4d2960ec02077c7a569331341b6e30d5dc
        }

        // Remove old route for this id if exists
        if (activeRoutes[id]) {
            map.removeControl(activeRoutes[id].control);
            map.removeLayer(activeRoutes[id].marker);
        }

        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f'];
        const routeColor = colors[Object.keys(activeRoutes).length % colors.length];
        const instantDistKm = (govBaseLocation.distanceTo(destLocation) / 1000).toFixed(1);

        const destMarker = L.marker(destLocation, {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            })
        }).addTo(map).bindPopup(`<b>🆘 SOS Location</b><br>${destinationStr}`);

        const newRouteControl = L.Routing.control({
            waypoints: [govBaseLocation, destLocation],
            addWaypoints: false,
            show: false,
            lineOptions: {
                styles: [{ color: routeColor, opacity: 0.85, weight: 6 }]
            }
        }).addTo(map);

        activeRoutes[id] = {
            control: newRouteControl,
            marker: destMarker,
            destination: destinationStr,
            color: routeColor,
            distance: `${instantDistKm} km`,
            time: 'Calculating...'
        };

        newRouteControl.on('routesfound', (e) => {
            const summary = e.routes[0].summary;
            activeRoutes[id].distance = (summary.totalDistance / 1000).toFixed(1) + ' km';
            activeRoutes[id].time = Math.round(summary.totalTime / 60) + ' min';
            if (rescueLegend) rescueLegend.update();
        });

        if (zoomToPath) map.flyTo(destLocation, 13);
        if (rescueLegend) rescueLegend.update();

    } catch (error) {
        console.error('Routing failed:', error);
        showNotification('❌ Routing failed', 'error');
    }
}

async function resolveHelpRequest(id, btn, targetLocation) {
    if (!confirm('Dispatch Team?')) return;
    try {
        await fetch(`${API_BASE}/helprequests/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'assigned' })
        });
        showNotification('✅ Team dispatched!', 'success');

        // ✅ Find the full request object to get lat/lng
        const req = helpRequests.find(r => r._id === id);

        if (req && req.latitude && req.longitude) {
            // Use direct GPS coordinates (from Flutter)
            await drawRescueRouteByLatLng(req.latitude, req.longitude, req.location, id);
        } else {
            // Fallback: geocode text address
            await drawRescueRoute(targetLocation, id, true);
        }

        document.querySelector('a[href="#dashboard"]').click();
        await fetchHelpRequests();
    } catch (e) {
        console.error(e);
        showNotification('❌ Dispatch failed', 'error');
    }
}

// ✅ NEW: Direct lat/lng route (no geocoding needed)
async function drawRescueRouteByLatLng(lat, lng, label, id, zoomToPath = true) {
    if (!map) return;
    try {
        const destLocation = L.latLng(lat, lng);

        if (activeRoutes[id]) {
            map.removeControl(activeRoutes[id].control);
            map.removeLayer(activeRoutes[id].marker);
        }

        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f'];
        const routeColor = colors[Object.keys(activeRoutes).length % colors.length];
        const distKm = (govBaseLocation.distanceTo(destLocation) / 1000).toFixed(1);

        const destMarker = L.marker(destLocation, {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                iconSize: [25, 41], iconAnchor: [12, 41]
            })
        }).addTo(map).bindPopup(`<b>🆘 SOS: ${label}</b><br>Lat: ${lat}, Long: ${lng}`);

        const routeControl = L.Routing.control({
            waypoints: [govBaseLocation, destLocation],
            addWaypoints: false,
            show: false,
            lineOptions: { styles: [{ color: routeColor, opacity: 0.85, weight: 6 }] }
        }).addTo(map);

        activeRoutes[id] = {
            control: routeControl,
            marker: destMarker,
            destination: label,
            color: routeColor,
            distance: `${distKm} km`,
            time: 'Calculating...'
        };

        routeControl.on('routesfound', (e) => {
            const s = e.routes[0].summary;
            activeRoutes[id].distance = (s.totalDistance / 1000).toFixed(1) + ' km';
            activeRoutes[id].time = Math.round(s.totalTime / 60) + ' min';
            if (rescueLegend) rescueLegend.update();
        });

        if (zoomToPath) map.flyTo(destLocation, 13);
        if (rescueLegend) rescueLegend.update();

    } catch (err) {
        console.error('Route error:', err);
    }
}

async function closeHelpRequest(id) {
    if (!confirm('Close?')) return;
    try {
        await fetch(`${API_BASE}/helprequests/${id}`, { method: 'DELETE' });
        if (activeRoutes[id]) { map.removeControl(activeRoutes[id].control); map.removeLayer(activeRoutes[id].marker); delete activeRoutes[id]; rescueLegend.update(); }
        await fetchHelpRequests();
    } catch (e) { }
}

async function restoreActiveRoutes() {
    const assignedReqs = helpRequests.filter(r => r.status === 'assigned');
    for (const req of assignedReqs) { if (!activeRoutes[req._id]) await drawRescueRoute(req.location, req._id, false); }
}

// ==========================================
// 4. RENDERING & COLORS (RESTORED)
// ==========================================

// ✅ Client-side filter — works even if server returns all records
function getFilteredRequests() {
    return helpRequests.filter(req => {
        const matchStatus = !filterStatus || req.status === filterStatus;
        // ✅ treat missing urgency as 'high' (app default)
        const reqUrgency = (req.urgency || 'high').toLowerCase();
        const matchUrgency = !filterUrgency ||
            reqUrgency === filterUrgency.toLowerCase(); const matchType = !filterType ||
                (req.type && req.type.toLowerCase() === filterType.toLowerCase());
        const matchSearch = !searchQuery ||
            (req.name && req.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (req.location && req.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (req.phone && req.phone.includes(searchQuery));
        return matchStatus && matchUrgency && matchType && matchSearch;
    });
}

function renderHelpRequests(append = false) {
    const container = document.getElementById('recentRequests');

    // Render filter bar always at top (not inside list)
    // renderFilterBar();

    const filtered = getFilteredRequests(); // ✅ apply client-side filter

    if (!append) {
        if (helpRequests.length === 0) {
            container.innerHTML = `
        <div class="sos-empty">
            <i class="fas fa-satellite-dish"></i>
            <p>No SOS requests yet</p>
            <small>Citizen app requests will appear here in real-time</small>
        </div>`;
            return;
        }
        if (filtered.length === 0) {
            container.innerHTML = `
        <div class="sos-empty">
            <i class="fas fa-filter"></i>
            <p>No requests match your filters</p>
            <small>Try changing or clearing the filters above</small>
        </div>`;
            // ✅ Still update count badge to show 0
            const badge = document.getElementById('totalCount');
            if (badge) badge.textContent = 0;
            return;
        }
        container.innerHTML = '';
    }

    const typeConfig = {
        medical: { icon: 'fa-medkit', color: '#e74c3c' },
        Medical: { icon: 'fa-medkit', color: '#e74c3c' },
        rescue: { icon: 'fa-life-ring', color: '#8e44ad' },
        Rescue: { icon: 'fa-life-ring', color: '#8e44ad' },
        supplies: { icon: 'fa-box-open', color: '#e67e22' },
        Supplies: { icon: 'fa-box-open', color: '#e67e22' },
        food: { icon: 'fa-utensils', color: '#27ae60' },
        shelter: { icon: 'fa-home', color: '#2980b9' },
        other: { icon: 'fa-question-circle', color: '#7f8c8d' },
        Other: { icon: 'fa-question-circle', color: '#7f8c8d' },
    };
    const defaultType = { icon: 'fa-exclamation-triangle', color: '#e74c3c' };
    const urgencyColors = { critical: '#e74c3c', high: '#e67e22', medium: '#f1c40f', low: '#27ae60' };

    const fragment = document.createDocumentFragment(); // ✅ batch DOM insert

    filtered.forEach(req => {
        const tc = typeConfig[req.type] || defaultType;
        const isAssigned = req.status === 'assigned';
        const isResolved = req.status === 'resolved';
        const urgencyColor = urgencyColors[req.urgency] || '#e67e22';

        const statusBadge = isResolved
            ? `<span class="sos-status-badge status-resolved"><i class="fas fa-check-circle"></i> Resolved</span>`
            : isAssigned
                ? `<span class="sos-status-badge status-assigned"><i class="fas fa-paper-plane"></i> Dispatched</span>`
                : `<span class="sos-status-badge status-pending"><i class="fas fa-satellite-dish"></i> Pending</span>`;

        const time = new Date(req.timestamp).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const div = document.createElement('div');
        div.className = 'sos-card';
        div.style.borderTop = `3px solid ${tc.color}`;
        // Score color based on value
        const score = req.priorityScore || 0;
        const scoreColor = score >= 150 ? '#c0392b'
            : score >= 100 ? '#e67e22'
                : score >= 60 ? '#f1c40f'
                    : '#27ae60';
        const scoreLabel = score >= 150 ? '🔴 CRITICAL'
            : score >= 100 ? '🟠 HIGH'
                : score >= 60 ? '🟡 MEDIUM'
                    : '🟢 LOW';
        div.innerHTML = `
        <div class="sos-card-header">
            <div class="sos-card-title">
               <div class="sos-type-icon" style="background:${tc.color}; box-shadow: 0 4px 12px ${tc.color}55;">
                    <i class="fas ${tc.icon}"></i>
                </div>
                <div>
                    <div class="sos-card-name">${req.name || 'Unknown Citizen'}</div>
                    <div class="sos-card-type" style="color:${tc.color};">${(req.type || 'Other').toUpperCase()} REQUEST</div>
                </div>
            </div>
           ${statusBadge}
<div class="sos-score-badge" style="
    background: ${scoreColor}18;
    border: 1.5px solid ${scoreColor};
    color: ${scoreColor};
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;">
    <i class="fas fa-fire"></i> ${score} pts
</div>
        </div>
        <div class="sos-info-grid">
            <div class="sos-info-row">
                <i class="fas fa-phone" style="color:#27ae60;"></i>
                <div><span class="sos-info-label">Phone</span>
                     <span class="sos-info-value">${req.phone || '—'}</span></div>
            </div>
            <div class="sos-info-row">
                <i class="fas fa-exclamation-circle" style="color:${urgencyColor};"></i>
                <div><span class="sos-info-label">Urgency</span>
                     <span class="sos-info-value" style="color:${urgencyColor};">${(req.urgency || 'high').toUpperCase()}</span></div>
            </div>
            <div class="sos-info-row full-width">
                <i class="fas fa-map-marker-alt" style="color:#e74c3c;"></i>
                <div><span class="sos-info-label">Location</span>
                     <span class="sos-info-value">${req.location || 'Unknown'}</span>
                     ${req.latitude && req.longitude
                ? `<span class="sos-gps-tag"><i class="fas fa-crosshairs"></i> ${parseFloat(req.latitude).toFixed(5)}, ${parseFloat(req.longitude).toFixed(5)}</span>`
                : ''}</div>
            </div>
            ${req.description ? `
            <div class="sos-info-row full-width">
                <i class="fas fa-comment-alt" style="color:#9b59b6;"></i>
                <div><span class="sos-info-label">Details</span>
                     <span class="sos-info-value">${req.description}</span></div>
            </div>` : ''}
            <div class="sos-info-row full-width">
                <i class="fas fa-clock" style="color:#7f8c8d;"></i>
                <div><span class="sos-info-label">Received</span>
                     <span class="sos-info-value">${time}</span></div>
            </div>
        </div>
        ${!isResolved ? `
        <div class="sos-actions">
            ${!isAssigned ? `
            <button class="sos-btn sos-btn-dispatch"
                onclick="resolveHelpRequest('${req._id}', this, '${req.location}')">
                <i class="fas fa-paper-plane"></i> Dispatch Team
            </button>` : ''}
            <button class="sos-btn sos-btn-resolve ${!isAssigned ? '' : 'sos-btn-only'}"
                onclick="closeHelpRequest('${req._id}')">
                <i class="fas fa-check-double"></i> Mark Resolved
            </button>
        </div>` : ''}`;

        fragment.appendChild(div);
    });

    container.appendChild(fragment); // ✅ single DOM write
    // ✅ Update count badge — show filtered count / total
    const badge = document.getElementById('totalCount');
    if (badge) badge.textContent =
        filtered.length < totalRequests
            ? `${filtered.length} of ${totalRequests}`
            : totalRequests;

    // Load More button
    const existing = document.getElementById('loadMoreBtn');
    if (existing) existing.remove();

    if (currentPage < totalPages) {
        const btn = document.createElement('button');
        btn.id = 'loadMoreBtn';
        btn.className = 'sos-refresh-btn';
        btn.style.cssText = 'width:100%; justify-content:center; padding:14px; margin-top:12px; font-size:0.95rem;';
        btn.innerHTML = `<i class="fas fa-chevron-down"></i> Load More (${totalRequests - helpRequests.length} remaining)`;
        btn.onclick = () => fetchHelpRequests(currentPage + 1, true);
        container.appendChild(btn);
    }
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
    } catch (e) { }
}

// ✅ FIXED: Use stored lat/lng directly, fallback to geocode
async function plotAllAlertsOnMap() {
    if (!markersLayer) return;
    markersLayer.clearLayers();

    for (const a of alerts) {
        try {
            if (a.latitude && a.longitude) {
                // ✅ Direct plot using stored coordinates
                const marker = L.marker([a.latitude, a.longitude], { icon: redIcon })
                    .addTo(markersLayer);
                marker.bindPopup(`
                    <b>⚠️ ${a.type.toUpperCase()}</b><br>
                    ${a.locationText || a.location || 'Unknown location'}<br>
                    <small>${a.description || ''}</small>
                `);
            } else if (a.location || a.locationText) {
                // Fallback: geocode text address
                await geocodeAndPlot(a.locationText || a.location, a.type, a.description);
            }
        } catch (e) {
            console.error('Marker plot error:', e);
        }
    }
}

// // ==========================================
// // 5. EMERGENCY BUTTONS (RESTORED)
// // ==========================================
// if (quickFood) quickFood.addEventListener('click', () => openHelpModal('food', 'Food & Water'));
// if (quickMedical) quickMedical.addEventListener('click', () => openHelpModal('medical', 'Medical Help'));
// if (quickShelter) quickShelter.addEventListener('click', () => openHelpModal('shelter', 'Shelter'));
// if (quickCustom) quickCustom.addEventListener('click', () => openHelpModal('other', 'Custom Need'));
// if (closeHelpModal) closeHelpModal.addEventListener('click', () => fastHelpModal.classList.remove('active'));

// function openHelpModal(type, title) {
//     helpTitle.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${title} Request`;
//     fastHelpForm.reset();
//     fastHelpModal.classList.add('active');
// }

// fastHelpForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const formData = new FormData(fastHelpForm);
//     const newRequest = { type: 'emergency', location: formData.get('location'), people: parseInt(formData.get('people')), urgency: formData.get('urgency'), details: formData.get('details') };
//     await fetch(`${API_BASE}/helprequests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRequest) });
//     fastHelpModal.classList.remove('active');
//     await fetchHelpRequests();
//     showNotification('🚨 REQUEST SENT!', 'success');
// });

// Helper Stats
function updateRequestStats(stats = {}) {
    const pending = stats.pending ?? helpRequests.filter(r => r.status === 'pending').length;
    const assigned = stats.assigned ?? helpRequests.filter(r => r.status === 'assigned').length;
    const resolved = stats.resolved ?? helpRequests.filter(r => r.status === 'resolved').length;
    const total = stats.total ?? helpRequests.length;
    const critical = stats.critical ?? 0;

    requestStats.innerHTML = `
    <div class="sos-stats">
        <div class="sos-stat-card">
            <div class="sos-stat-icon" style="background:linear-gradient(135deg,#e74c3c,#c0392b);">
                <i class="fas fa-satellite-dish" style="color:white;"></i>
            </div>
            <div><div class="sos-stat-num">${pending}</div><div class="sos-stat-label">Pending</div></div>
        </div>
        <div class="sos-stat-card">
            <div class="sos-stat-icon" style="background:linear-gradient(135deg,#3498db,#2980b9);">
                <i class="fas fa-paper-plane" style="color:white;"></i>
            </div>
            <div><div class="sos-stat-num">${assigned}</div><div class="sos-stat-label">Dispatched</div></div>
        </div>
        <div class="sos-stat-card">
            <div class="sos-stat-icon" style="background:linear-gradient(135deg,#27ae60,#1e8449);">
                <i class="fas fa-check-circle" style="color:white;"></i>
            </div>
            <div><div class="sos-stat-num">${resolved}</div><div class="sos-stat-label">Resolved</div></div>
        </div>
        <div class="sos-stat-card">
            <div class="sos-stat-icon" style="background:linear-gradient(135deg,#8e44ad,#6c3483);">
                <i class="fas fa-list" style="color:white;"></i>
            </div>
            <div><div class="sos-stat-num">${total}</div><div class="sos-stat-label">Total</div></div>
        </div>
        ${critical > 0 ? `
        <div class="sos-stat-card" style="border:2px solid rgba(231,76,60,0.5);">
            <div class="sos-stat-icon" style="background:linear-gradient(135deg,#c0392b,#922b21);">
                <i class="fas fa-skull-crossbones" style="color:white;"></i>
            </div>
            <div><div class="sos-stat-num" style="color:#e74c3c;">${critical}</div><div class="sos-stat-label">🔴 Critical</div></div>
        </div>` : ''}
    </div>`;
}

// function renderFilterBar() {
//     const existing = document.getElementById('sosFilterBar');
//     if (existing) return; // only render once

//     const toolbar = document.querySelector('.sos-toolbar');
//     if (!toolbar) return;

//     const bar = document.createElement('div');
//     bar.id = 'sosFilterBar';
//     bar.style.cssText = `
//         display: flex; flex-wrap: wrap; gap: 10px;
//         margin-bottom: 16px; align-items: center;
//     `;
//     bar.innerHTML = `
//     <!-- Search -->
//     <input type="text" id="sosSearch" placeholder="🔍 Search name / location / phone..."
//         style="flex:1; min-width:200px; padding:9px 16px; border-radius:25px;
//                border:1.5px solid rgba(255,255,255,0.3); background:rgba(255,255,255,0.15);
//                color:white; font-size:0.88rem; outline:none;"
//         oninput="debounceSearch(this.value)">

//     <!-- Status Filter -->
//     <select id="filterStatus" onchange="applyFilters()"
//         style="padding:9px 14px; border-radius:25px; border:1.5px solid rgba(255,255,255,0.3);
//                background:rgba(255,255,255,0.15); color:white; font-size:0.85rem; outline:none; cursor:pointer;">
//         <option value="">All Status</option>
//         <option value="pending">🔴 Pending</option>
//         <option value="assigned">🔵 Dispatched</option>
//         <option value="resolved">🟢 Resolved</option>
//     </select>

//     <!-- Urgency Filter -->
//     <select id="filterUrgency" onchange="applyFilters()"
//         style="padding:9px 14px; border-radius:25px; border:1.5px solid rgba(255,255,255,0.3);
//                background:rgba(255,255,255,0.15); color:white; font-size:0.85rem; outline:none; cursor:pointer;">
//         <option value="">All Urgency</option>
//         <option value="critical">🚨 Critical</option>
//         <option value="high">🔶 High</option>
//         <option value="medium">🟡 Medium</option>
//         <option value="low">🟢 Low</option>
//     </select>

//     <!-- Type Filter -->
//     <select id="filterType" onchange="applyFilters()"
//         style="padding:9px 14px; border-radius:25px; border:1.5px solid rgba(255,255,255,0.3);
//                background:rgba(255,255,255,0.15); color:white; font-size:0.85rem; outline:none; cursor:pointer;">
//         <option value="">All Types</option>
//         <option value="Medical">🏥 Medical</option>
//         <option value="Rescue">🛟 Rescue</option>
//         <option value="Supplies">📦 Supplies</option>
//         <option value="Other">❓ Other</option>
//     </select>

//     <!-- Clear -->
//     <button onclick="clearFilters()"
//         style="padding:9px 16px; border-radius:25px; border:1.5px solid rgba(255,255,255,0.4);
//                background:transparent; color:white; font-size:0.85rem; cursor:pointer; font-weight:600;">
//         ✕ Clear
//     </button>`;

//     toolbar.insertAdjacentElement('afterend', bar);
// }

// Debounce search so it doesn't fire on every keystroke
let searchTimer;
function debounceSearch(val) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchQuery = val.trim();
        currentPage = 1;
        fetchHelpRequests(1, false);
    }, 400);
}

function applyFilters() {
    filterStatus = document.getElementById('filterStatus')?.value || '';
    filterUrgency = document.getElementById('filterUrgency')?.value || '';
    filterType = document.getElementById('filterType')?.value || '';
    currentPage = 1;

    // ✅ If data already loaded, just re-render with client filter (instant)
    if (helpRequests.length > 0) {
        renderHelpRequests(false);
    } else {
        fetchHelpRequests(1, false); // fetch if no data yet
    }
}

function clearFilters() {
    filterStatus = filterUrgency = filterType = searchQuery = '';
    currentPage = 1;
    const s = document.getElementById('sosSearch');
    const fs = document.getElementById('filterStatus');
    const fu = document.getElementById('filterUrgency');
    const ft = document.getElementById('filterType');
    if (s) s.value = '';
    if (fs) fs.value = '';
    if (fu) fu.value = '';
    if (ft) ft.value = '';

    // ✅ Instant re-render — no need to refetch
    renderHelpRequests(false);
}
function updateResources() { document.getElementById('supplies').textContent = "87%"; }
function showNotification(msg, type) {
    const n = document.createElement('div'); n.className = `notification notification-${type}`; n.textContent = msg;
    document.body.appendChild(n); setTimeout(() => n.classList.add('show'), 100);
    setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3000);
}
async function deleteAlert(id) { if (confirm('Delete?')) { await fetch(`${API_BASE}/alerts/${id}`, { method: 'DELETE' }); fetchAlerts(); } }

alertForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('alertSubmitBtn');
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    const locationText = document.getElementById('alertLocation').value.trim();

    // ✅ Geocode text location → get lat/lng before saving
    let latitude = null;
    let longitude = null;
    try {
        const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationText)}&limit=1`
        );
        const geoData = await geoRes.json();
        if (geoData.length > 0) {
            latitude = parseFloat(geoData[0].lat);
            longitude = parseFloat(geoData[0].lon);
            showNotification(`📍 Location found: ${geoData[0].display_name.substring(0, 40)}...`, 'info');
        } else {
            showNotification('⚠️ Location not found on map, saving without coordinates', 'warning');
        }
    } catch (err) {
        console.warn('Geocoding failed:', err);
    }

    const alertData = {
        type: document.getElementById('alertType').value,
        location: locationText,
        latitude: latitude,    // ✅ now sent
        longitude: longitude,  // ✅ now sent
        severity: document.getElementById('alertSeverity').value,
        description: document.getElementById('alertDescription').value,
    };

    await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData)
    });

    submitBtn.textContent = 'Submit Official Alert';
    submitBtn.disabled = false;
    alertForm.reset();
    newAlertModal.classList.remove('active');
    fetchAlerts();
    showNotification('✅ Alert created with map location!', 'success');
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

// Auto-refresh incoming SOS requests every 30 seconds
setInterval(() => {
    fetchHelpRequests();
}, 30000)