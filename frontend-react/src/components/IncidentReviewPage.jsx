// import { useEffect, useMemo, useState } from 'react';

// const API_BASE =
//   import.meta.env.VITE_API_BASE_URL || 'https://aidalert.onrender.com';

// const statusOptions = [
//   { value: 'all', label: 'All Status' },
//   { value: 'unverified', label: 'Unverified' },
//   { value: 'active', label: 'Active' },
//   { value: 'resolved', label: 'Resolved' },
//   { value: 'false_report', label: 'False Report' },
// ];

// function formatType(type = '') {
//   return type
//     .split('_')
//     .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
//     .join(' ');
// }

// function formatDate(value) {
//   if (!value) return 'Just now';
//   const date = new Date(value);
//   return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
// }

// export default function IncidentReviewPage() {
//   const [incidents, setIncidents] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [statusFilter, setStatusFilter] = useState('all');
//   const [busyId, setBusyId] = useState(null);

//   async function loadIncidents() {
//     setLoading(true);
//     try {
//       const query =
//         statusFilter === 'all' ? '' : `?status=${encodeURIComponent(statusFilter)}`;
//       const res = await fetch(`${API_BASE}/api/incidents${query}`);
//       const data = await res.json();
//       setIncidents(Array.isArray(data) ? data : []);
//     } catch (err) {
//       console.error('Failed to load incidents', err);
//       setIncidents([]);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function updateStatus(id, status) {
//     setBusyId(id);
//     try {
//       await fetch(`${API_BASE}/api/incidents/${id}/status`, {
//         method: 'PATCH',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status }),
//       });
//       await loadIncidents();
//     } catch (err) {
//       console.error('Failed to update incident', err);
//     } finally {
//       setBusyId(null);
//     }
//   }

//   useEffect(() => {
//     loadIncidents();
//   }, [statusFilter]);

//   const stats = useMemo(() => {
//     return {
//       total: incidents.length,
//       unverified: incidents.filter((item) => item.status === 'unverified').length,
//       active: incidents.filter((item) => item.status === 'active').length,
//       critical: incidents.filter((item) => item.severity === 'critical').length,
//     };
//   }, [incidents]);

//   return (
//     <section className="section active">
//       <div className="container">
//         <div className="section-header">
//           <div>
//             <h2>Incident Review</h2>
//             <span className="sos-subtitle">
//               Review citizen hazard reports and activate only verified public alerts.
//             </span>
//           </div>

//           <div className="toolbar-actions">
//             <select
//               className="incident-filter"
//               value={statusFilter}
//               onChange={(e) => setStatusFilter(e.target.value)}
//             >
//               {statusOptions.map((option) => (
//                 <option key={option.value} value={option.value}>
//                   {option.label}
//                 </option>
//               ))}
//             </select>

//             <button className="sos-refresh-btn" onClick={loadIncidents}>
//               <i className="fas fa-rotate-right"></i> Refresh
//             </button>
//           </div>
//         </div>

//         <div className="sos-stats">
//           <div className="sos-stat-card">
//             <div className="sos-stat-icon blue">
//               <i className="fas fa-layer-group"></i>
//             </div>
//             <div>
//               <div className="sos-stat-num">{stats.total}</div>
//               <div className="sos-stat-label">Visible Incidents</div>
//             </div>
//           </div>

//           <div className="sos-stat-card">
//             <div className="sos-stat-icon purple">
//               <i className="fas fa-hourglass-half"></i>
//             </div>
//             <div>
//               <div className="sos-stat-num">{stats.unverified}</div>
//               <div className="sos-stat-label">Awaiting Review</div>
//             </div>
//           </div>

//           <div className="sos-stat-card">
//             <div className="sos-stat-icon green">
//               <i className="fas fa-circle-check"></i>
//             </div>
//             <div>
//               <div className="sos-stat-num">{stats.active}</div>
//               <div className="sos-stat-label">Active on Public Map</div>
//             </div>
//           </div>

//           <div className="sos-stat-card critical-card">
//             <div className="sos-stat-icon darkred">
//               <i className="fas fa-triangle-exclamation"></i>
//             </div>
//             <div>
//               <div className="sos-stat-num critical-text">{stats.critical}</div>
//               <div className="sos-stat-label">Critical Severity</div>
//             </div>
//           </div>
//         </div>

//         {loading ? (
//           <div className="sos-empty">Loading incidents...</div>
//         ) : incidents.length === 0 ? (
//           <div className="sos-empty">
//             No incidents found for the selected status.
//           </div>
//         ) : (
//           <div className="incident-list">
//             {incidents.map((item) => {
//               const isBusy = busyId === item._id;

//               return (
//                 <article key={item._id} className="incident-card">
//                   <div className="incident-card-header">
//                     <div>
//                       <div className="incident-title-row">
//                         <h3>{item.title || formatType(item.type)}</h3>
//                         <span className={`incident-severity ${item.severity || 'medium'}`}>
//                           {(item.severity || 'medium').toUpperCase()}
//                         </span>
//                       </div>
//                       <div className="incident-meta">
//                         <span>
//                           <i className="fas fa-location-dot"></i>{' '}
//                           {item.locationText || 'Unknown location'}
//                         </span>
//                         <span>
//                           <i className="fas fa-tag"></i> {formatType(item.type)}
//                         </span>
//                         <span>
//                           <i className="fas fa-clock"></i> {formatDate(item.createdAt)}
//                         </span>
//                       </div>
//                     </div>

//                     <span className={`status-badge ${item.status || 'unverified'}`}>
//                       {String(item.status || 'unverified').replace('_', ' ')}
//                     </span>
//                   </div>

//                   <div className="incident-body">
//                     {item.imageUrl ? (
//                       <div className="incident-image-wrap">
//                         <img
//                           className="incident-image"
//                           src={item.imageUrl}
//                           alt={item.title || item.type}
//                         />
//                       </div>
//                     ) : null}

//                     <div className="incident-details">
//                       <p className="incident-description">
//                         {item.description || 'No description provided.'}
//                       </p>

//                       <div className="incident-data-grid">
//                         <div>
//                           <strong>Source</strong>
//                           <span>{item.source || 'citizen'}</span>
//                         </div>
//                         <div>
//                           <strong>Confidence</strong>
//                           <span>
//                             {item.confidence != null ? `${item.confidence}%` : 'Pending'}
//                           </span>
//                         </div>
//                         <div>
//                           <strong>Radius</strong>
//                           <span>{item.alertRadiusMeters || 500} m</span>
//                         </div>
//                         <div>
//                           <strong>Verified</strong>
//                           <span>{item.verifiedAt ? formatDate(item.verifiedAt) : 'Not yet'}</span>
//                         </div>
//                       </div>

//                       <div className="incident-actions">
//                         <button
//                           className="sos-btn dispatch"
//                           disabled={isBusy}
//                           onClick={() => updateStatus(item._id, 'active')}
//                         >
//                           Verify & Activate
//                         </button>
//                         <button
//                           className="sos-btn resolve"
//                           disabled={isBusy}
//                           onClick={() => updateStatus(item._id, 'resolved')}
//                         >
//                           Resolve
//                         </button>
//                         <button
//                           className="sos-btn incident-false-btn"
//                           disabled={isBusy}
//                           onClick={() => updateStatus(item._id, 'false_report')}
//                         >
//                           False Report
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 </article>
//               );
//             })}
//           </div>
//         )}
//       </div>
//     </section>
//   );
// }


import { useEffect, useMemo, useState } from 'react';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://aidalert.onrender.com';

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'false_report', label: 'False Report' },
];

function formatType(type = '') {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
}

export default function IncidentReviewPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  async function loadIncidents() {
    setLoading(true);
    try {
      const query =
        statusFilter === 'all' ? '' : `?status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(`${API_BASE}/api/incidents${query}`);
      const data = await res.json();
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load incidents', err);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    setBusyId(id);
    try {
      await fetch(`${API_BASE}/api/incidents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await loadIncidents();
    } catch (err) {
      console.error('Failed to update incident', err);
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, [statusFilter]);

  const stats = useMemo(() => {
    return {
      total: incidents.length,
      unverified: incidents.filter((item) => item.status === 'unverified').length,
      active: incidents.filter((item) => item.status === 'active').length,
      critical: incidents.filter((item) => item.severity === 'critical').length,
    };
  }, [incidents]);

  return (
    <section className="section active">
      <div className="container">
        <div className="section-header">
          <div>
            <h2>Incident Review</h2>
            <span className="sos-subtitle">
              Review citizen hazard reports and activate only verified public alerts.
            </span>
          </div>

          <div className="toolbar-actions">
            <select
              className="incident-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button className="sos-refresh-btn" onClick={loadIncidents}>
              <i className="fas fa-rotate-right"></i> Refresh
            </button>
          </div>
        </div>

        <div className="sos-stats">
          <div className="sos-stat-card">
            <div className="sos-stat-icon blue">
              <i className="fas fa-layer-group"></i>
            </div>
            <div>
              <div className="sos-stat-num">{stats.total}</div>
              <div className="sos-stat-label">Visible Incidents</div>
            </div>
          </div>

          <div className="sos-stat-card">
            <div className="sos-stat-icon purple">
              <i className="fas fa-hourglass-half"></i>
            </div>
            <div>
              <div className="sos-stat-num">{stats.unverified}</div>
              <div className="sos-stat-label">Awaiting Review</div>
            </div>
          </div>

          <div className="sos-stat-card">
            <div className="sos-stat-icon green">
              <i className="fas fa-circle-check"></i>
            </div>
            <div>
              <div className="sos-stat-num">{stats.active}</div>
              <div className="sos-stat-label">Active on Public Map</div>
            </div>
          </div>

          <div className="sos-stat-card critical-card">
            <div className="sos-stat-icon darkred">
              <i className="fas fa-triangle-exclamation"></i>
            </div>
            <div>
              <div className="sos-stat-num critical-text">{stats.critical}</div>
              <div className="sos-stat-label">Critical Severity</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="sos-empty">Loading incidents...</div>
        ) : incidents.length === 0 ? (
          <div className="sos-empty">No incidents found for the selected status.</div>
        ) : (
          <div className="incident-list">
            {incidents.map((item) => {
              const isBusy = busyId === item._id;

              return (
                <article key={item._id} className="incident-card">
                  <div className="incident-card-header">
                    <div>
                      <div className="incident-title-row">
                        <h3>{item.title || formatType(item.type)}</h3>
                        <span className={`incident-severity ${item.severity || 'medium'}`}>
                          {(item.severity || 'medium').toUpperCase()}
                        </span>
                      </div>
                      <div className="incident-meta">
                        <span><i className="fas fa-location-dot"></i> {item.locationText || 'Unknown location'}</span>
                        <span><i className="fas fa-tag"></i> {formatType(item.type)}</span>
                        <span><i className="fas fa-clock"></i> {formatDate(item.createdAt)}</span>
                      </div>
                    </div>

                    <span className={`status-badge ${item.status || 'unverified'}`}>
                      {String(item.status || 'unverified').replace('_', ' ')}
                    </span>
                  </div>

                  <div className="incident-body">
                    {item.imageUrl ? (
                      <div className="incident-image-wrap">
                        <img className="incident-image" src={item.imageUrl} alt={item.title || item.type} />
                      </div>
                    ) : null}

                    <div className="incident-details">
                      <p className="incident-description">
                        {item.description || 'No description provided.'}
                      </p>

                      <div className="incident-data-grid">
                        <div><strong>Source</strong><span>{item.source || 'citizen'}</span></div>
                        <div><strong>Confidence</strong><span>{item.confidence != null ? `${item.confidence}%` : 'Pending'}</span></div>
                        <div><strong>Radius</strong><span>{item.alertRadiusMeters || 500} m</span></div>
                        <div><strong>Verified</strong><span>{item.verifiedAt ? formatDate(item.verifiedAt) : 'Not yet'}</span></div>
                      </div>

                      <div className="incident-actions">
                        <button
                          className="sos-btn dispatch"
                          disabled={isBusy}
                          onClick={() => updateStatus(item._id, 'active')}
                        >
                          Verify & Activate
                        </button>
                        <button
                          className="sos-btn resolve"
                          disabled={isBusy}
                          onClick={() => updateStatus(item._id, 'resolved')}
                        >
                          Resolve
                        </button>
                        <button
                          className="sos-btn incident-false-btn"
                          disabled={isBusy}
                          onClick={() => updateStatus(item._id, 'false_report')}
                        >
                          False Report
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
