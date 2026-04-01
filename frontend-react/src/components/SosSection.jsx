// import { useMemo, useState } from 'react';
// import { API_BASE } from '../api/config';
// import { useAppData } from '../context/AppDataContext';

// export default function SosSection() {
//   const {
//     helpRequests,
//     stats,
//     loading,
//     refreshRequests,
//     refreshStats,
//     refreshAll,
//   } = useAppData();

//   const [filterStatus, setFilterStatus] = useState('');
//   const [filterUrgency, setFilterUrgency] = useState('');
//   const [filterType, setFilterType] = useState('');
//   const [searchQuery, setSearchQuery] = useState('');

//   async function updateStatus(id, status) {
//     try {
//       await fetch(`${API_BASE}/helprequests/${id}/status`, {
//         method: 'PATCH',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status }),
//       });

//       await Promise.all([refreshRequests(), refreshStats()]);
//     } catch (err) {
//       console.error('Status update failed:', err);
//       alert('Failed to update request status');
//     }
//   }

//   async function closeHelpRequest(id) {
//     const ok = window.confirm('Close this request?');
//     if (!ok) return;

//     try {
//       await fetch(`${API_BASE}/helprequests/${id}`, {
//         method: 'DELETE',
//       });

//       await Promise.all([refreshRequests(), refreshStats()]);
//     } catch (err) {
//       console.error('Delete failed:', err);
//       alert('Failed to close request');
//     }
//   }

//   async function recalculateScores() {
//     try {
//       await fetch(`${API_BASE}/helprequests/recalculate-scores`, {
//         method: 'POST',
//       });

//       await refreshAll();
//     } catch (err) {
//       console.error('Recalculate failed:', err);
//       alert('Failed to recalculate scores');
//     }
//   }

//   const filteredRequests = useMemo(() => {
//     return helpRequests.filter((req) => {
//       const reqUrgency = (req.urgency || 'medium').toLowerCase();
//       const matchStatus = !filterStatus || req.status === filterStatus;
//       const matchUrgency =
//         !filterUrgency || reqUrgency === filterUrgency.toLowerCase();
//       const matchType =
//         !filterType ||
//         (req.type && req.type.toLowerCase() === filterType.toLowerCase());
//       const matchSearch =
//         !searchQuery ||
//         (req.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
//         (req.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
//         (req.phone || '').includes(searchQuery);

//       return matchStatus && matchUrgency && matchType && matchSearch;
//     });
//   }, [helpRequests, filterStatus, filterUrgency, filterType, searchQuery]);

//   const urgencyColors = {
//     critical: '#e74c3c',
//     high: '#e67e22',
//     medium: '#f1c40f',
//     low: '#27ae60',
//   };

//   const pending =
//     stats.pending ?? helpRequests.filter((r) => r.status === 'pending').length;
//   const assigned =
//     stats.assigned ?? helpRequests.filter((r) => r.status === 'assigned').length;
//   const resolved =
//     stats.resolved ?? helpRequests.filter((r) => r.status === 'resolved').length;
//   const total = stats.total ?? helpRequests.length;
//   const critical = stats.critical ?? 0;

//   return (
//     <section id="reports" className="section">
//       <div className="container">
//         <h2>
//           <i className="fas fa-bell"></i> Incoming SOS Requests
//         </h2>
//         <span className="sos-subtitle">
//           Live citizen distress signals from the mobile app
//         </span>

//         <div className="sos-stats">
//           <div className="sos-stat-card">
//             <div className="sos-stat-icon red">
//               <i className="fas fa-satellite-dish"></i>
//             </div>
//             <div>
//               <div className="sos-stat-num">{pending}</div>
//               <div className="sos-stat-label">Pending</div>
//             </div>
//           </div>

//           <div className="sos-stat-card">
//             <div className="sos-stat-icon blue">
//               <i className="fas fa-paper-plane"></i>
//             </div>
//             <div>
//               <div className="sos-stat-num">{assigned}</div>
//               <div className="sos-stat-label">Dispatched</div>
//             </div>
//           </div>

//           <div className="sos-stat-card">
//             <div className="sos-stat-icon green">
//               <i className="fas fa-check-circle"></i>
//             </div>
//             <div>
//               <div className="sos-stat-num">{resolved}</div>
//               <div className="sos-stat-label">Resolved</div>
//             </div>
//           </div>

//           <div className="sos-stat-card">
//             <div className="sos-stat-icon purple">
//               <i className="fas fa-list"></i>
//             </div>
//             <div>
//               <div className="sos-stat-num">{total}</div>
//               <div className="sos-stat-label">Total</div>
//             </div>
//           </div>

//           {critical > 0 && (
//             <div className="sos-stat-card critical-card">
//               <div className="sos-stat-icon darkred">
//                 <i className="fas fa-skull-crossbones"></i>
//               </div>
//               <div>
//                 <div className="sos-stat-num critical-text">{critical}</div>
//                 <div className="sos-stat-label">Critical</div>
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="sos-toolbar">
//           <h3>
//             <i className="fas fa-list"></i> All Requests
//             <span className="sos-count-badge">
//               {filteredRequests.length < total
//                 ? `${filteredRequests.length} of ${total}`
//                 : total}
//             </span>
//           </h3>

//           <div className="toolbar-actions">
//             <button className="sos-refresh-btn" onClick={refreshAll}>
//               <i className="fas fa-sync-alt"></i> Refresh
//             </button>
//             <button className="sos-refresh-btn danger" onClick={recalculateScores}>
//               <i className="fas fa-calculator"></i> Recalc Scores
//             </button>
//           </div>
//         </div>

//         <div id="sosFilterBar" className="sos-filter-bar">
//           <input
//             type="text"
//             placeholder="Search name / location / phone..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//           />

//           <select
//             value={filterStatus}
//             onChange={(e) => setFilterStatus(e.target.value)}
//           >
//             <option value="">All Status</option>
//             <option value="pending">Pending</option>
//             <option value="assigned">Dispatched</option>
//             <option value="resolved">Resolved</option>
//           </select>

//           <select
//             value={filterUrgency}
//             onChange={(e) => setFilterUrgency(e.target.value)}
//           >
//             <option value="">All Urgency</option>
//             <option value="critical">Critical</option>
//             <option value="high">High</option>
//             <option value="medium">Medium</option>
//             <option value="low">Low</option>
//           </select>

//           <select
//             value={filterType}
//             onChange={(e) => setFilterType(e.target.value)}
//           >
//             <option value="">All Types</option>
//             <option value="Medical">Medical</option>
//             <option value="Rescue">Rescue</option>
//             <option value="Supplies">Supplies</option>
//             <option value="Other">Other</option>
//           </select>

//           <button
//             className="clear-btn"
//             onClick={() => {
//               setFilterStatus('');
//               setFilterUrgency('');
//               setFilterType('');
//               setSearchQuery('');
//             }}
//           >
//             Clear
//           </button>
//         </div>

//         {loading ? (
//           <p>Loading requests...</p>
//         ) : filteredRequests.length === 0 ? (
//           <div className="sos-empty">
//             <i className="fas fa-satellite-dish"></i>
//             <p>No SOS requests found</p>
//             <small>Citizen app requests will appear here</small>
//           </div>
//         ) : (
//           <div id="recentRequests">
//             {filteredRequests.map((req) => {
//               const urgency = (req.urgency || 'medium').toLowerCase();
//               const urgencyColor = urgencyColors[urgency] || '#e67e22';
//               const score = req.priorityScore || 0;
//               const isAssigned = req.status === 'assigned';
//               const isResolved = req.status === 'resolved';

//               return (
//                 <div key={req._id} className="sos-card">
//                   <div className="sos-card-header">
//                     <div>
//                       <div className="sos-card-name">
//                         {req.name || 'Unknown Citizen'}
//                       </div>
//                       <div className="sos-card-type">
//                         {(req.type || 'Other').toUpperCase()} REQUEST
//                       </div>
//                     </div>

//                     <div className="sos-card-right">
//                       <span className={`status-badge ${req.status || 'pending'}`}>
//                         {req.status || 'pending'}
//                       </span>
//                       <span className="score-badge">{score} pts</span>
//                     </div>
//                   </div>

//                   <div className="sos-info-grid">
//                     <div>
//                       <strong>Phone:</strong> {req.phone || '—'}
//                     </div>
//                     <div>
//                       <strong>Urgency:</strong>{' '}
//                       <span style={{ color: urgencyColor }}>
//                         {(req.urgency || 'medium').toUpperCase()}
//                       </span>
//                     </div>
//                     <div>
//                       <strong>Location:</strong> {req.location || 'Unknown'}
//                     </div>
//                     <div>
//                       <strong>Received:</strong>{' '}
//                       {new Date(req.timestamp).toLocaleString('en-IN')}
//                     </div>

//                     {req.description && (
//                       <div className="full-width">
//                         <strong>Details:</strong> {req.description}
//                       </div>
//                     )}
//                   </div>

//                   {!isResolved && (
//                     <div className="sos-actions">
//                       {!isAssigned && (
//                         <button
//                           className="sos-btn dispatch"
//                           onClick={() => updateStatus(req._id, 'assigned')}
//                         >
//                           Dispatch Team
//                         </button>
//                       )}

//                       <button
//                         className="sos-btn resolve"
//                         onClick={() => closeHelpRequest(req._id)}
//                       >
//                         Mark Resolved
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//     </section>
//   );
// }
import { useMemo, useState } from 'react';
import { API_BASE } from '../api/config';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';

export default function SosSection({ onOpenDispatchMap }) {
    const { helpRequests, stats, loading, refreshRequests, refreshStats, refreshAll } =
        useAppData();
    const toast = useToast();

    const [filterStatus, setFilterStatus] = useState('');
    const [filterUrgency, setFilterUrgency] = useState('');
    const [filterType, setFilterType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [dispatchingId, setDispatchingId] = useState('');
    const [closingId, setClosingId] = useState('');
    const [recalcLoading, setRecalcLoading] = useState(false);

    const [refreshing, setRefreshing] = useState(false);

    async function updateStatus(id, status) {
        setDispatchingId(id);
        try {
            await fetch(`${API_BASE}/helprequests/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            await Promise.all([refreshRequests(), refreshStats()]);
            toast.success('Team dispatched');

            if (status === 'assigned' && onOpenDispatchMap) {
                onOpenDispatchMap(id);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to update status');
        } finally {
            setDispatchingId('');
        }
    }

    async function closeHelpRequest(id) {
        const ok = window.confirm('Close this request?');
        if (!ok) return;

        setClosingId(id);
        try {
            await fetch(`${API_BASE}/helprequests/${id}`, { method: 'DELETE' });
            await Promise.all([refreshRequests(), refreshStats()]);
            toast.success('Request resolved');
        } catch (err) {
            console.error(err);
            toast.error('Failed to close request');
        } finally {
            setClosingId('');
        }
    }

    async function recalculateScores() {
        setRecalcLoading(true);
        try {
            await fetch(`${API_BASE}/helprequests/recalculate-scores`, { method: 'POST' });
            await refreshAll();
            toast.success('Priority scores updated');
        } catch (err) {
            console.error(err);
            toast.error('Failed to recalculate scores');
        } finally {
            setRecalcLoading(false);
        }
    }
    async function handleRefresh() {
        setRefreshing(true);
        try {
            await Promise.all([refreshRequests(), refreshStats()]);
            toast.success('SOS requests refreshed');
        } catch (err) {
            console.error(err);
            toast.error('Refresh failed');
        } finally {
            setRefreshing(false);
        }
    }


    const filteredRequests = useMemo(() => {
        return helpRequests.filter((req) => {
            const reqUrgency = (req.urgency || 'medium').toLowerCase();
            const matchStatus = !filterStatus || req.status === filterStatus;
            const matchUrgency = !filterUrgency || reqUrgency === filterUrgency.toLowerCase();
            const matchType =
                !filterType ||
                (req.type && req.type.toLowerCase() === filterType.toLowerCase());
            const matchSearch =
                !searchQuery ||
                (req.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (req.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (req.phone || '').includes(searchQuery);

            return matchStatus && matchUrgency && matchType && matchSearch;
        });
    }, [helpRequests, filterStatus, filterUrgency, filterType, searchQuery]);

    const urgencyColors = {
        critical: '#e74c3c',
        high: '#e67e22',
        medium: '#f1c40f',
        low: '#27ae60',
    };

    const pending = stats.pending ?? helpRequests.filter((r) => r.status === 'pending').length;
    const assigned = stats.assigned ?? helpRequests.filter((r) => r.status === 'assigned').length;
    const resolved = stats.resolved ?? helpRequests.filter((r) => r.status === 'resolved').length;
    const total = stats.total ?? helpRequests.length;
    const critical = stats.critical ?? 0;

    return (
        <section id="reports" className="section">
            <div className="container">
                <h2>
                    <i className="fas fa-bell"></i> Incoming SOS Requests
                </h2>
                <span className="sos-subtitle">Live citizen distress signals from the mobile app</span>

                <div className="sos-stats">
                    <div className="sos-stat-card"><div className="sos-stat-icon red"><i className="fas fa-satellite-dish"></i></div><div><div className="sos-stat-num">{pending}</div><div className="sos-stat-label">Pending</div></div></div>
                    <div className="sos-stat-card"><div className="sos-stat-icon blue"><i className="fas fa-paper-plane"></i></div><div><div className="sos-stat-num">{assigned}</div><div className="sos-stat-label">Dispatched</div></div></div>
                    <div className="sos-stat-card"><div className="sos-stat-icon green"><i className="fas fa-check-circle"></i></div><div><div className="sos-stat-num">{resolved}</div><div className="sos-stat-label">Resolved</div></div></div>
                    <div className="sos-stat-card"><div className="sos-stat-icon purple"><i className="fas fa-list"></i></div><div><div className="sos-stat-num">{total}</div><div className="sos-stat-label">Total</div></div></div>
                    {critical > 0 && <div className="sos-stat-card critical-card"><div className="sos-stat-icon darkred"><i className="fas fa-skull-crossbones"></i></div><div><div className="sos-stat-num critical-text">{critical}</div><div className="sos-stat-label">Critical</div></div></div>}
                </div>

                <div className="sos-toolbar">
                    <h3>
                        <i className="fas fa-list"></i> All Requests
                        <span className="sos-count-badge">
                            {filteredRequests.length < total ? `${filteredRequests.length} of ${total}` : total}
                        </span>
                    </h3>

                    <div className="toolbar-actions">
                        <button
                            className="sos-refresh-btn"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <i className="fas fa-sync-alt"></i>{' '}
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>

                        <button className="sos-refresh-btn danger" onClick={recalculateScores} disabled={recalcLoading}>
                            <i className="fas fa-calculator"></i> {recalcLoading ? 'Recalculating...' : 'Recalc Scores'}
                        </button>
                    </div>
                </div>

                <div className="sos-filter-bar">
                    <input type="text" placeholder="Search name / location / phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="assigned">Dispatched</option>
                        <option value="resolved">Resolved</option>
                    </select>
                    <select value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)}>
                        <option value="">All Urgency</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="">All Types</option>
                        <option value="Medical">Medical</option>
                        <option value="Rescue">Rescue</option>
                        <option value="Supplies">Supplies</option>
                        <option value="Other">Other</option>
                    </select>
                    <button className="clear-btn" onClick={() => {
                        setFilterStatus('');
                        setFilterUrgency('');
                        setFilterType('');
                        setSearchQuery('');
                    }}>
                        Clear
                    </button>
                </div>

                {loading ? (
                    <p>Loading requests...</p>
                ) : filteredRequests.length === 0 ? (
                    <div className="sos-empty">
                        <i className="fas fa-satellite-dish"></i>
                        <p>No SOS requests found</p>
                        <small>Citizen app requests will appear here</small>
                    </div>
                ) : (
                    <div id="recentRequests">
                        {filteredRequests.map((req) => {
                            const urgency = (req.urgency || 'medium').toLowerCase();
                            const urgencyColor = urgencyColors[urgency] || '#e67e22';
                            const score = req.priorityScore || 0;
                            const isAssigned = req.status === 'assigned';
                            const isResolved = req.status === 'resolved';

                            return (
                                <div key={req._id} className="sos-card">
                                    <div className="sos-card-header">
                                        <div>
                                            <div className="sos-card-name">{req.name || 'Unknown Citizen'}</div>
                                            <div className="sos-card-type">{(req.type || 'Other').toUpperCase()} REQUEST</div>
                                        </div>

                                        <div className="sos-card-right">
                                            <span className={`status-badge ${req.status || 'pending'}`}>{req.status || 'pending'}</span>
                                            <span className="score-badge">{score} pts</span>
                                        </div>
                                    </div>

                                    <div className="sos-info-grid">
                                        <div><strong>Phone:</strong> {req.phone || '—'}</div>
                                        <div><strong>Urgency:</strong> <span style={{ color: urgencyColor }}>{(req.urgency || 'medium').toUpperCase()}</span></div>
                                        <div><strong>Location:</strong> {req.location || 'Unknown'}</div>
                                        <div><strong>Received:</strong> {new Date(req.timestamp).toLocaleString('en-IN')}</div>
                                        {req.description && <div className="full-width"><strong>Details:</strong> {req.description}</div>}
                                    </div>

                                    {!isResolved && (
                                        <div className="sos-actions">
                                            {!isAssigned && (
                                                <button
                                                    className="sos-btn dispatch"
                                                    onClick={() => updateStatus(req._id, 'assigned')}
                                                    disabled={dispatchingId === req._id}
                                                >
                                                    {dispatchingId === req._id ? 'Dispatching...' : 'Dispatch Team'}
                                                </button>
                                            )}

                                            <button
                                                className="sos-btn resolve"
                                                onClick={() => closeHelpRequest(req._id)}
                                                disabled={closingId === req._id}
                                            >
                                                {closingId === req._id ? 'Closing...' : 'Mark Resolved'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
