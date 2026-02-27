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

// Advanced Routing Objects
let activeRoutes = {}; 
let govBaseLocation = L.latLng(20.5937, 78.9629); 
let rescueLegend; 

const API_BASE = 'http://localhost:5000/api';

// Fetch data from backend
async function fetchAlerts() {
    try {
        const response = await fetch(`${API_BASE}/alerts`);
        if (!response.ok) throw new Error('Failed to fetch alerts');
        alerts = await response.json();
        renderAlerts();
    } catch (error) { console.error('Error fetching alerts:', error); }
}

async function fetchHelpRequests() {
    try {
        const response = await fetch(`${API_BASE}/helprequests`);
        if (!response.ok) throw new Error('Failed to fetch requests');
        helpRequests = await response.json();
        renderHelpRequests();
        updateRequestStats();
        updateResources(); 
    } catch (error) { console.error('Error fetching requests:', error); }
}

// Navigation
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);

        if (targetSection) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;

            window.scrollTo({ top: targetPosition, behavior: 'smooth' });

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            targetSection.classList.add('active');
            
            // Auto-close hamburger menu
            navMenu.classList.remove('active');

            if (targetId === 'dashboard' && map) {
                setTimeout(() => { map.invalidateSize(); }, 100);
            }
        }
    });
});

// Main Top Navigation Hamburger Logic
menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navMenu.classList.toggle('active');
});

// Close top menu if clicked outside
document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        navMenu.classList.remove('active');
    }
});

newAlertBtn.addEventListener('click', () => newAlertModal.classList.add('active'));
closeAlertModal.addEventListener('click', () => newAlertModal.classList.remove('active'));
window.addEventListener('click', (e) => { if (e.target === newAlertModal) newAlertModal.classList.remove('active'); });

alertForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(alertForm);
    const newAlert = {
        type: formData.get('type'), location: formData.get('location'),
        severity: formData.get('severity'), description: formData.get('description')
    };

    try {
        await fetch(`${API_BASE}/alerts`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAlert)
        });
        alertForm.reset();
        newAlertModal.classList.remove('active');
        await fetchAlerts();
        geocodeAndPlot(newAlert.location, newAlert.type, newAlert.description, true);
        showNotification('✅ Alert issued successfully!', 'success');
    } catch (error) { showNotification('❌ Error submitting alert', 'error'); }
});

// Fast Help Actions
quickFood.addEventListener('click', () => openHelpModal('food', 'Food & Water'));
quickMedical.addEventListener('click', () => openHelpModal('medical', 'Medical Help'));
quickShelter.addEventListener('click', () => openHelpModal('shelter', 'Shelter'));
quickCustom.addEventListener('click', () => openHelpModal('other', 'Custom Need'));

function openHelpModal(type, title) {
    helpTitle.innerHTML = `<i class="fas fa-${getIcon(type)}"></i> ${title} Request`;
    helpUrgency.value = 'critical';
    fastHelpForm.reset();
    fastHelpModal.classList.add('active');
}

function getIcon(type) {
    const icons = { food: 'utensils', medical: 'medkit', shelter: 'home', other: 'exclamation-triangle' };
    return icons[type] || 'exclamation-triangle';
}

closeHelpModal.addEventListener('click', () => fastHelpModal.classList.remove('active'));

fastHelpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(fastHelpForm);
    const newRequest = {
        type: getIconType(), location: formData.get('location'),
        people: parseInt(formData.get('people')), urgency: formData.get('urgency'),
        details: formData.get('details') || 'Urgent help needed'
    };

    try {
        await fetch(`${API_BASE}/helprequests`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRequest)
        });
        fastHelpForm.reset();
        fastHelpModal.classList.remove('active');
        await fetchHelpRequests();
        showNotification('🚨 HELP REQUEST SENT! Response team notified.', 'success');
    } catch (error) { showNotification('❌ Error submitting request', 'error'); }
});

function getIconType() {
    const iconClass = helpTitle.querySelector('i')?.classList[1];
    return iconClass ? iconClass.split('-')[1] : 'other';
}

addContact.addEventListener('click', () => {
    const contactField = document.createElement('div');
    contactField.className = 'form-group';
    contactField.innerHTML = `<label>Phone/WhatsApp</label><input type="tel" name="contact" placeholder="+91 9876543210">`;
    fastHelpForm.insertBefore(contactField, fastHelpForm.querySelector('button[type="submit"]').parentNode);
    addContact.style.display = 'none';
});

function renderAlerts() {
    recentAlerts.innerHTML = alerts.slice(0, 3).map(alert => `
        <li class="alert-item">
            <div><strong>${alert.type.toUpperCase()}</strong> - ${alert.location}<br><small>${alert.description}</small></div>
            <span class="severity-${alert.severity}">${alert.severity.toUpperCase()}</span>
        </li>
    `).join('');

    alertsGrid.innerHTML = alerts.map(alert => `
    <div class="card alert-card">
        <div class="alert-header"><h4>${alert.type.toUpperCase()}</h4><span class="severity-badge severity-${alert.severity}">${alert.severity}</span></div>
        <p><strong>Location:</strong> ${alert.location}</p><p>${alert.description}</p>
        <div class="alert-footer">
            <span class="time">${new Date(alert.timestamp).toLocaleTimeString()}</span>
            <button class="btn btn-secondary btn-small" onclick="deleteAlert('${alert._id}')" style="background: #e74c3c;">Delete</button>
        </div>
    </div>`).join('');

    const activeAlertsEl = document.getElementById('activeAlerts');
    if (activeAlertsEl) activeAlertsEl.textContent = alerts.length;
    plotAllAlertsOnMap();
}

function renderHelpRequests() {
    recentRequests.innerHTML = helpRequests.slice(0, 5).map(req => {
        const isAssigned = req.status === 'assigned';
        return `
        <li class="alert-item" style="background: linear-gradient(45deg, ${getUrgencyColor(req.urgency)}, ${getUrgencyColor(req.urgency, true)}); display: flex; justify-content: space-between; align-items: center; opacity: ${isAssigned ? '0.7' : '1'}; transition: all 0.3s;">
            <div><strong>${req.type.toUpperCase()} - ${req.location}</strong><br><small>${req.people} people | ${req.details}</small></div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                <div><span class="help-badge help-${req.urgency}">${req.urgency}</span><span style="font-size: 0.8rem; opacity: 0.9;">${new Date(req.timestamp).toLocaleTimeString()}</span></div>
                ${isAssigned 
                    ? `<div style="display: flex; gap: 8px; align-items: center;">
                         <span style="background: rgba(255,255,255,0.9); color: #27ae60; padding: 4px 10px; border-radius: 15px; font-size: 0.85rem; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.1);"><i class="fas fa-truck-medical"></i> Dispatched</span>
                         <button onclick="closeHelpRequest('${req._id}', this)" class="btn btn-small" style="background: #e74c3c; color: white; border: none; padding: 4px 10px; border-radius: 15px; cursor: pointer; font-size: 0.85rem;"><i class="fas fa-times"></i> Close</button>
                       </div>`
                    : `<button onclick="resolveHelpRequest('${req._id}', this, '${req.location}')" class="btn btn-small" style="background: rgba(255,255,255,0.25); color: white; border: 1px solid rgba(255,255,255,0.5); padding: 4px 10px; border-radius: 15px; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 0.85rem;"><i class="fas fa-paper-plane"></i> Dispatch Team</button>`
                }
            </div>
        </li>`;
    }).join('');
}

function updateRequestStats() {
    const pending = helpRequests.filter(r => r.status === 'pending').length;
    const assigned = helpRequests.filter(r => r.status === 'assigned').length;
    requestStats.innerHTML = `
        <div class="stat-card"><i class="fas fa-clock" style="background: linear-gradient(45deg, #f39c12, #e67e22);"></i><div><h3>${pending}</h3><p>Pending Requests</p></div></div>
        <div class="stat-card"><i class="fas fa-truck-medical" style="background: linear-gradient(45deg, #27ae60, #229954);"></i><div><h3>${assigned}</h3><p>Response Teams</p></div></div>
    `;
}

function updateResources() {
    const MAX_AMBULANCES = 20; const MAX_FIRETRUCKS = 12; const MAX_RESCUE = 30;
    let deployedAmbulances = 0; let deployedFiretrucks = 0; let deployedRescue = 0;

    helpRequests.forEach(req => {
        if (req.status === 'assigned') {
            if (req.type === 'medkit') deployedAmbulances++;
            else if (req.type === 'exclamation-triangle') deployedFiretrucks++; 
            else deployedRescue++; 
        }
    });

    const availAmbulances = Math.max(0, MAX_AMBULANCES - deployedAmbulances);
    const availFiretrucks = Math.max(0, MAX_FIRETRUCKS - deployedFiretrucks);
    const availRescue = Math.max(0, MAX_RESCUE - deployedRescue);

    document.getElementById('ambulanceCount').innerHTML = `<strong>${availAmbulances}</strong>/${MAX_AMBULANCES} Available`;
    document.getElementById('firetruckCount').innerHTML = `<strong>${availFiretrucks}</strong>/${MAX_FIRETRUCKS} Available`;
    document.getElementById('rescueCount').innerHTML = `<strong>${availRescue}</strong>/${MAX_RESCUE} Available`;

    const totalMax = MAX_AMBULANCES + MAX_FIRETRUCKS + MAX_RESCUE;
    const totalAvail = availAmbulances + availFiretrucks + availRescue;
    document.getElementById('supplies').textContent = `${Math.round((totalAvail / totalMax) * 100)}%`;
}

function getUrgencyColor(urgency, darker = false) {
    const colors = { critical: darker ? '#c0392b' : '#e74c3c', high: darker ? '#d35400' : '#e67e22', medium: darker ? '#e67e22' : '#f39c12', low: darker ? '#95a5a6' : '#bdc3c7' };
    return colors[urgency] || '#95a5a6';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => { notification.classList.add('show'); }, 100);
    setTimeout(() => { notification.classList.remove('show'); setTimeout(() => notification.remove(), 300); }, 3000);
}


// ==========================================
// **MAP INITIALIZATION & ROUTING LOGIC**
// ==========================================

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

let isLegendOpen = false;

// Build the Map UI Legend (Collapsible Hamburger)
function setupMapLegend() {
    rescueLegend = L.control({ position: 'bottomleft' });
    
    rescueLegend.onAdd = function () {
        this._div = L.DomUtil.create('div', 'map-legend-wrapper');
        L.DomEvent.disableClickPropagation(this._div); // Prevent map clicks

        // Create the Toggle Button
        this._btn = L.DomUtil.create('button', 'legend-toggle-btn', this._div);
        
        // Create the Content Container
        this._content = L.DomUtil.create('div', 'map-legend-content', this._div);

        // Click Listener for the Map Hamburger
        L.DomEvent.on(this._btn, 'click', function() {
            isLegendOpen = !isLegendOpen;
            this.update();
        }, this);

        this.update();
        return this._div;
    };
    
    rescueLegend.update = function () {
        if (!this._div) return;
        const routeKeys = Object.keys(activeRoutes);
        
        // Hide completely if no ambulances are dispatched
        if (routeKeys.length === 0) {
            this._div.style.display = 'none';
            return;
        }

        this._div.style.display = 'flex';
        
        // Update Button UI
        const icon = isLegendOpen ? 'fa-times' : 'fa-bars';
        this._btn.innerHTML = `<i class="fas ${icon}"></i> Active Dispatches <span style="background:#e74c3c; color:white; padding:2px 8px; border-radius:12px; font-size:0.8rem; margin-left:auto;">${routeKeys.length}</span>`;
        
        // Show/Hide Content Block
        this._content.style.display = isLegendOpen ? 'block' : 'none';
        
        // Populate Content
        if (isLegendOpen) {
            let html = '';
            routeKeys.forEach(key => {
                const data = activeRoutes[key];
                html += `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; padding:6px; background:#f8f9fa; border-radius:8px;">
                    <div style="width:16px; height:16px; border-radius:50%; background:${data.color}; box-shadow:0 2px 4px rgba(0,0,0,0.2); flex-shrink:0;"></div>
                    <div style="flex:1;">
                        <strong style="display:block; color:#333; font-size:0.85rem; margin-bottom:2px;">${data.destination.toUpperCase()}</strong>
                        <span style="color:#7f8c8d; font-size:0.75rem;"><i class="fas fa-route"></i> ${data.distance} &nbsp;|&nbsp; <i class="fas fa-clock"></i> ETA: ${data.time}</span>
                    </div>
                </div>`;
            });
            this._content.innerHTML = html;
        }
    };
    
    rescueLegend.addTo(map);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize map
    map = L.map('map', { 
        zoomControl: false, 
        fullscreenControl: true,
        fullscreenControlOptions: { position: 'topright' }
    }).setView([20.5937, 78.9629], 5);

    // Re-add Zoom buttons to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    
    setupMapLegend();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                govBaseLocation = L.latLng(userLat, userLng);
                map.setView([userLat, userLng], 6);
                L.marker([userLat, userLng]).addTo(map).bindPopup('<b>🏛️ Government HQ</b>').openPopup();
            },
            () => { console.log("Location access denied."); }
        );
    }

    await fetchAlerts();
    await fetchHelpRequests();
    await restoreActiveRoutes(); 
});

async function geocodeAndPlot(locationStr, type, description, flyToMarker = false) {
    if (!map || !markersLayer) return;
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationStr)}`);
        const data = await response.json();
        if (data && data.length > 0) {
            const marker = L.marker([data[0].lat, data[0].lon], { icon: redIcon }).addTo(markersLayer);
            marker.bindPopup(`<b>🚨 ${type.toUpperCase()}</b><br>${locationStr}<br><small>${description}</small>`);
            if (flyToMarker) { map.flyTo([data[0].lat, data[0].lon], 10); marker.openPopup(); }
        }
    } catch (error) {}
}

async function plotAllAlertsOnMap() {
    if (!markersLayer) return;
    markersLayer.clearLayers(); 
    for (const alert of alerts) {
        await geocodeAndPlot(alert.location, alert.type, alert.description, false);
        await new Promise(r => setTimeout(r, 1000)); 
    }
}

// ** ADVANCED DIJKSTRA ROUTING WITH INSTANT DISTANCE **
async function drawRescueRoute(destinationStr, id, zoomToPath = true) {
    if (!map) return;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationStr)}`);
        const data = await response.json();

        if (data && data.length > 0) {
            const destLocation = L.latLng(data[0].lat, data[0].lon);

            // Clear old route if exists
            if (activeRoutes[id]) {
                map.removeControl(activeRoutes[id].control);
                map.removeLayer(activeRoutes[id].marker);
            }

            // Assign distinct color
            const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
            const routeColor = colors[Object.keys(activeRoutes).length % colors.length];

            // 1. Instant Air Distance
            const instantDistKm = (govBaseLocation.distanceTo(destLocation) / 1000).toFixed(1);

            // 2. Custom marker
            const destMarker = L.marker(destLocation, {icon: redIcon}).addTo(map);
            destMarker.bindPopup(`<div style="text-align:center;"><b>🚨 Target: ${destinationStr.toUpperCase()}</b><br><i class="fas fa-spinner fa-spin"></i> Finding fastest roads...</div>`);

            // 3. Draw Shortest Path
            const newRouteControl = L.Routing.control({
                waypoints: [govBaseLocation, destLocation],
                routeWhileDragging: false,
                addWaypoints: false,
                show: false, 
                createMarker: function() { return null; }, 
                lineOptions: { styles: [{color: routeColor, opacity: 0.8, weight: 6}] }
            }).addTo(map);

            // Save using INSTANT distance
            activeRoutes[id] = { 
                control: newRouteControl, marker: destMarker, destination: destinationStr, 
                color: routeColor, distance: `~${instantDistKm} km (Air)`, time: 'Calculating...' 
            };
            rescueLegend.update(); 

            // 4. Listen for math completion (Exact Road Distance)
            newRouteControl.on('routesfound', function(e) {
                const summary = e.routes[0].summary;
                const distKm = (summary.totalDistance / 1000).toFixed(1);
                const timeMin = Math.round(summary.totalTime / 60);

                activeRoutes[id].distance = `${distKm} km`;
                activeRoutes[id].time = `${timeMin} min`;

                destMarker.bindPopup(`
                    <div style="text-align:center; min-width: 120px;">
                        <b style="color:${routeColor}; font-size:1.1rem;">🚨 ${destinationStr.toUpperCase()}</b><br>
                        <hr style="margin:5px 0;">
                        <b><i class="fas fa-route"></i> Distance:</b> ${distKm} km<br>
                        <b><i class="fas fa-clock"></i> ETA:</b> ${timeMin} min
                    </div>
                `);
                
                rescueLegend.update(); 
            });

            if (zoomToPath) map.flyTo(destLocation, 8);
        }
    } catch (error) { console.error("Routing failed:", error); }
}

async function restoreActiveRoutes() {
    const assignedReqs = helpRequests.filter(r => r.status === 'assigned');
    for (const req of assignedReqs) {
        if (!activeRoutes[req._id]) {
            await drawRescueRoute(req.location, req._id, false); 
            await new Promise(r => setTimeout(r, 1000)); 
        }
    }
}

// Database Actions
async function deleteAlert(id) {
    if (!confirm('Are you sure you want to delete this alert?')) return; 
    try {
        await fetch(`${API_BASE}/alerts/${id}`, { method: 'DELETE' });
        showNotification('🗑️ Alert deleted', 'info');
        await fetchAlerts(); 
    } catch (error) {}
}

async function resolveHelpRequest(id, buttonElement, targetLocation) {
    if (!confirm('Dispatch an emergency response team to this location?')) return;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dispatching...';
    try {
        await fetch(`${API_BASE}/helprequests/${id}/status`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'assigned' })
        });
        showNotification('✅ Team dispatched! Drawing shortest path...', 'success');
        
        drawRescueRoute(targetLocation, id, true);
        document.querySelector('a[href="#dashboard"]').click();
        
        await fetchHelpRequests(); 
    } catch (error) { buttonElement.innerHTML = '<i class="fas fa-paper-plane"></i> Dispatch Team'; }
}

async function closeHelpRequest(id, buttonElement) {
    if (!confirm('Is this emergency handled? Closing this will free up your response team.')) return;
    try {
        await fetch(`${API_BASE}/helprequests/${id}`, { method: 'DELETE' });
        showNotification('✅ Emergency handled! Team is returning.', 'success');

        // REMOVE from map and legend
        if (activeRoutes[id]) {
            map.removeControl(activeRoutes[id].control);
            map.removeLayer(activeRoutes[id].marker);
            delete activeRoutes[id];
            rescueLegend.update();
        }
        
        await fetchHelpRequests(); 
    } catch (error) {}
}

// ==========================================
// ** DATA EXPORT (DOWNLOAD REPORT) **
// ==========================================
function downloadReport() {
    if (helpRequests.length === 0 && alerts.length === 0) {
        showNotification('⚠️ No data available to export.', 'warning');
        return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "--- EMERGENCY HELP REQUESTS ---\nType,Location,People,Urgency,Details,Status,Time\n";
    helpRequests.forEach(req => {
        const cleanDetails = req.details ? req.details.replace(/,/g, ';') : 'None';
        const cleanLocation = req.location ? req.location.replace(/,/g, ';') : 'Unknown';
        const time = new Date(req.timestamp).toLocaleString().replace(/,/g, '');
        csvContent += `${req.type.toUpperCase()},${cleanLocation},${req.people},${req.urgency},${cleanDetails},${req.status},${time}\n`;
    });
    csvContent += "\n--- ACTIVE DISASTER ALERTS ---\nType,Location,Severity,Description,Time\n";
    alerts.forEach(alert => {
        const cleanDesc = alert.description ? alert.description.replace(/,/g, ';') : 'None';
        const cleanLocation = alert.location ? alert.location.replace(/,/g, ';') : 'Unknown';
        const time = new Date(alert.timestamp).toLocaleString().replace(/,/g, '');
        csvContent += `${alert.type.toUpperCase()},${cleanLocation},${alert.severity},${cleanDesc},${time}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Disaster_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('📥 Report downloaded successfully!', 'success');
}