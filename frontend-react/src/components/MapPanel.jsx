import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useAppData } from '../context/AppDataContext';

const hqPosition = [25.1433, 75.8080];
const defaultCenter = [25.18, 75.83];
const routeColors = ['#2563eb', '#e74c3c', '#16a34a', '#f59e0b', '#8e44ad'];
const geoCache = new Map();

const redIcon = L.icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = L.icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = L.icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseRequestCoords(req) {
  let lat = toNumber(req.latitude);
  let lng = toNumber(req.longitude);

  if (lat == null || lng == null) {
    const loc = String(req.location || '');
    const match = loc.match(/Lat[:\s]*([-\d.]+)[,\s]+Long[:\s]*([-\d.]+)/i);
    if (match) {
      lat = Number(match[1]);
      lng = Number(match[2]);
    }
  }

  if (lat == null || lng == null) return null;
  return [lat, lng];
}

async function geocodeLocation(location) {
  const key = String(location || '').trim().toLowerCase();
  if (!key) return null;

  if (geoCache.has(key)) {
    return geoCache.get(key);
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
  );
  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) return null;

  const coords = [Number(data[0].lat), Number(data[0].lon)];
  geoCache.set(key, coords);
  return coords;
}

function MapFlyTo({ center, zoom = 13 }) {
  const map = useMap();

  useEffect(() => {
    if (center) map.flyTo(center, zoom);
  }, [map, center, zoom]);

  return null;
}

function MapFitBounds({ mode, assignedMarkers }) {
  const map = useMap();

  useEffect(() => {
    if (mode !== 'sos' || assignedMarkers.length === 0) return;

    const bounds = L.latLngBounds([
      hqPosition,
      ...assignedMarkers.map((m) => [m.lat, m.lng]),
    ]);

    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, mode, assignedMarkers]);

  return null;
}

export default function MapPanel({ mode, setMode, focusedRequestId }) {
  const { alerts, helpRequests } = useAppData();
  const [resolvedSosMarkers, setResolvedSosMarkers] = useState([]);
  const [routeMap, setRouteMap] = useState({});
  const [legendOpen, setLegendOpen] = useState(true);
  const [resolvingMarkers, setResolvingMarkers] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const panelRef = useRef(null);

  const hazardMarkers = useMemo(() => {
    return alerts
      .map((alert) => {
        const lat = toNumber(alert.latitude);
        const lng = toNumber(alert.longitude);
        if (lat == null || lng == null) return null;

        return {
          id: alert._id || alert.id,
          lat,
          lng,
          title: String(alert.type || 'Hazard').toUpperCase(),
          description:
            alert.description ||
            alert.location ||
            alert.locationText ||
            'Hazard detected',
        };
      })
      .filter(Boolean);
  }, [alerts]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === panelRef.current);
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  async function toggleFullscreen() {
    if (!panelRef.current) return;

    if (document.fullscreenElement === panelRef.current) {
      await document.exitFullscreen();
      return;
    }

    await panelRef.current.requestFullscreen();
  }

  useEffect(() => {
    let cancelled = false;

    async function resolveMarkers() {
      setResolvingMarkers(true);

      try {
        const results = await Promise.all(
          helpRequests.map(async (req) => {
            let coords = parseRequestCoords(req);

            if (!coords && req.location) {
              try {
                coords = await geocodeLocation(req.location);
              } catch (err) {
                console.error('Geocoding failed:', err);
              }
            }

            if (!coords) return null;

            return {
              id: req._id,
              lat: coords[0],
              lng: coords[1],
              name: req.name || 'Unknown Citizen',
              type: req.type || 'Other',
              phone: req.phone || '-',
              location: req.location || 'Unknown',
              status: req.status || 'pending',
            };
          })
        );

        if (!cancelled) {
          setResolvedSosMarkers(results.filter(Boolean));
        }
      } finally {
        if (!cancelled) setResolvingMarkers(false);
      }
    }

    resolveMarkers();

    return () => {
      cancelled = true;
    };
  }, [helpRequests]);

  const assignedMarkers = useMemo(
    () => resolvedSosMarkers.filter((marker) => marker.status === 'assigned'),
    [resolvedSosMarkers]
  );

  const focusedMarker = useMemo(() => {
    if (!focusedRequestId) return null;
    return resolvedSosMarkers.find((m) => m.id === focusedRequestId) || null;
  }, [focusedRequestId, resolvedSosMarkers]);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignedRoutes() {
      if (mode !== 'sos' || assignedMarkers.length === 0) {
        setRouteMap({});
        return;
      }

      const results = await Promise.all(
        assignedMarkers.map(async (marker, index) => {
          const color = routeColors[index % routeColors.length];

          try {
            const url =
              `https://router.project-osrm.org/route/v1/driving/` +
              `${hqPosition[1]},${hqPosition[0]};${marker.lng},${marker.lat}` +
              `?geometries=geojson&overview=full`;

            const res = await fetch(url);
            const data = await res.json();

            const route = data?.routes?.[0];
            const coords = route?.geometry?.coordinates || [];
            const points = coords.map((coord) => [coord[1], coord[0]]);

            const distanceKm = route?.distance
              ? (route.distance / 1000).toFixed(1)
              : '0.0';
            const etaMin = route?.duration
              ? Math.round(route.duration / 60)
              : 0;

            return [
              marker.id,
              {
                points,
                color,
                distanceKm,
                etaMin,
                destination: marker.location,
              },
            ];
          } catch (err) {
            console.error(`Route failed for ${marker.id}:`, err);
            return [
              marker.id,
              {
                points: [hqPosition, [marker.lat, marker.lng]],
                color,
                distanceKm: (
                  L.latLng(hqPosition[0], hqPosition[1]).distanceTo(
                    L.latLng(marker.lat, marker.lng)
                  ) / 1000
                ).toFixed(1),
                etaMin: 0,
                destination: marker.location,
              },
            ];
          }
        })
      );

      if (!cancelled) {
        setRouteMap(Object.fromEntries(results));
      }
    }

    loadAssignedRoutes();

    return () => {
      cancelled = true;
    };
  }, [mode, assignedMarkers]);

  const flyCenter =
    mode === 'sos' && focusedMarker
      ? [focusedMarker.lat, focusedMarker.lng]
      : mode === 'sos' && assignedMarkers.length > 0
      ? [assignedMarkers[0].lat, assignedMarkers[0].lng]
      : mode === 'sos'
      ? hqPosition
      : defaultCenter;

  const activeRoutes = Object.entries(routeMap);

  return (
    <div
      ref={panelRef}
      className={`map-panel-shell ${isFullscreen ? 'map-panel-shell-fullscreen' : ''}`}
    >
      <div className="map-toolbar">
        <button
          className={`map-toggle-btn ${mode === 'hazards' ? 'active' : ''}`}
          onClick={() => setMode('hazards')}
        >
          Hazards
        </button>
        <button
          className={`map-toggle-btn ${mode === 'sos' ? 'active' : ''}`}
          onClick={() => setMode('sos')}
        >
          Govt SOS View
        </button>
      </div>

      <div className="map-wrapper-react">
        <button
          type="button"
          className="map-fullscreen-fab"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit full screen' : 'Open full screen'}
        >
          <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
        </button>

        <MapContainer
          center={flyCenter}
          zoom={13}
          scrollWheelZoom
          style={{
            height: isFullscreen ? 'calc(100vh - 120px)' : '560px',
            width: '100%',
            borderRadius: '18px',
          }}
        >
          <MapFlyTo center={flyCenter} zoom={13} />
          <MapFitBounds mode={mode} assignedMarkers={assignedMarkers} />

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mode === 'sos' && (
            <Marker position={hqPosition} icon={greenIcon}>
              <Popup>
                <strong>Govt HQ</strong>
                <br />
                RTU Kota
              </Popup>
            </Marker>
          )}

          {mode === 'hazards' &&
            hazardMarkers.map((marker) => (
              <Marker
                key={marker.id}
                position={[marker.lat, marker.lng]}
                icon={redIcon}
              >
                <Popup>
                  <strong>{marker.title}</strong>
                  <br />
                  {marker.description}
                </Popup>
              </Marker>
            ))}

          {mode === 'sos' &&
            resolvedSosMarkers.map((marker) => (
              <Marker
                key={marker.id}
                position={[marker.lat, marker.lng]}
                icon={blueIcon}
              >
                <Popup>
                  <strong>SOS: {marker.name}</strong>
                  <br />
                  {marker.type} needed
                  <br />
                  Phone: {marker.phone}
                  <br />
                  Status: {marker.status}
                </Popup>
              </Marker>
            ))}

          {mode === 'sos' &&
            activeRoutes.map(([requestId, route]) =>
              route.points.length > 1 ? (
                <Polyline
                  key={requestId}
                  positions={route.points}
                  pathOptions={{ color: route.color, weight: 6 }}
                />
              ) : null
            )}
        </MapContainer>

        {mode === 'sos' && resolvingMarkers && (
          <div className="map-loading-badge">Resolving SOS locations...</div>
        )}

        {mode === 'sos' && activeRoutes.length > 0 && (
          <div className="dispatch-legend">
            <button
              className="dispatch-legend-toggle"
              onClick={() => setLegendOpen((prev) => !prev)}
            >
              {legendOpen ? 'Hide' : 'Show'} Active Dispatches
              <span className="dispatch-count">{activeRoutes.length}</span>
            </button>

            {legendOpen && (
              <div className="dispatch-legend-body">
                {activeRoutes.map(([requestId, route]) => {
                  const marker = resolvedSosMarkers.find((m) => m.id === requestId);
                  return (
                    <div key={requestId} className="dispatch-item">
                      <div
                        className="dispatch-dot"
                        style={{ background: route.color }}
                      />
                      <div className="dispatch-info">
                        <strong>
                          {String(route.destination || marker?.location || 'Unknown')
                            .toUpperCase()}
                        </strong>
                        <span>
                          {route.distanceKm} km | ETA: {route.etaMin} min
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
