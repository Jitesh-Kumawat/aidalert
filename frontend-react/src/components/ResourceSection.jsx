// import { useState } from 'react';
// import { API_BASE } from '../api/config';
// import { useAppData } from '../context/AppDataContext';

// const RESOURCE_CONFIG = [
//   {
//     key: 'ambulance',
//     title: 'Ambulances',
//     icon: 'fas fa-truck-medical',
//     max: 20,
//     requestType: 'Medical',
//     requestName: 'Govt Ambulance Dispatch',
//   },
//   {
//     key: 'firetruck',
//     title: 'Fire Trucks',
//     icon: 'fas fa-fire-extinguisher',
//     max: 12,
//     requestType: 'Rescue',
//     requestName: 'Govt Fire Response',
//   },
//   {
//     key: 'rescue',
//     title: 'Rescue Teams',
//     icon: 'fas fa-hard-hat',
//     max: 30,
//     requestType: 'Rescue',
//     requestName: 'Govt Rescue Team Dispatch',
//   },
// ];

// export default function ResourceSection() {
//   const { helpRequests, refreshRequests, refreshStats } = useAppData();
//   const [loadingKey, setLoadingKey] = useState('');

//   function getAvailableCount(resourceKey, max) {
//     const assigned = helpRequests.filter((req) => {
//       if (req.status !== 'assigned') return false;

//       const type = String(req.type || '').toLowerCase();
//       const description = String(req.description || '').toLowerCase();
//       const name = String(req.name || '').toLowerCase();
//       const combined = `${type} ${description} ${name}`;

//       if (resourceKey === 'ambulance') {
//         return combined.includes('medical') || combined.includes('ambulance');
//       }

//       if (resourceKey === 'firetruck') {
//         return combined.includes('fire');
//       }

//       if (resourceKey === 'rescue') {
//         return combined.includes('rescue') || combined.includes('team');
//       }

//       return false;
//     }).length;

//     return Math.max(0, max - assigned);
//   }

//   async function dispatchResource(resource) {
//     const loc = window.prompt(`Enter target location for ${resource.title}:`, 'Bundi');
//     if (!loc) return;

//     setLoadingKey(resource.key);

//     try {
//       const createRes = await fetch(`${API_BASE}/helprequests`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           name: resource.requestName,
//           phone: 'N/A',
//           type: resource.requestType,
//           location: loc,
//           people: 1,
//           description: `Manual dispatch from Govt HQ for ${resource.title}`,
//         }),
//       });

//       if (!createRes.ok) {
//         throw new Error(`Create failed: ${createRes.status}`);
//       }

//       const created = await createRes.json();

//       const assignRes = await fetch(`${API_BASE}/helprequests/${created._id}/status`, {
//         method: 'PATCH',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status: 'assigned' }),
//       });

//       if (!assignRes.ok) {
//         throw new Error(`Assign failed: ${assignRes.status}`);
//       }

//       await Promise.all([refreshRequests(), refreshStats()]);
//       alert(`${resource.title} dispatched to ${loc}`);
//     } catch (err) {
//       console.error('Resource dispatch error:', err);
//       alert('Dispatch failed');
//     } finally {
//       setLoadingKey('');
//     }
//   }

//   const totalMax = RESOURCE_CONFIG.reduce((sum, item) => sum + item.max, 0);
//   const totalAvailable = RESOURCE_CONFIG.reduce(
//     (sum, item) => sum + getAvailableCount(item.key, item.max),
//     0
//   );
//   const overallPercent = Math.round((totalAvailable / totalMax) * 100);

//   return (
//     <section id="resources" className="section">
//       <div className="container">
//         <div className="section-header">
//           <h2>Resource Management</h2>
//           <div className="resource-summary">Overall availability: {overallPercent}%</div>
//         </div>

//         <div className="resources-grid">
//           {RESOURCE_CONFIG.map((resource) => {
//             const available = getAvailableCount(resource.key, resource.max);

//             return (
//               <div className="resource-card" key={resource.key}>
//                 <i className={resource.icon}></i>
//                 <h3>{resource.title}</h3>
//                 <p>
//                   <strong>{available}</strong>/{resource.max} Available
//                 </p>
//                 <button
//                   className="btn btn-secondary"
//                   onClick={() => dispatchResource(resource)}
//                   disabled={loadingKey === resource.key}
//                 >
//                   {loadingKey === resource.key ? 'Dispatching...' : 'Dispatch'}
//                 </button>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </section>
//   );
// }
import { useState } from 'react';
import { API_BASE } from '../api/config';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';

const RESOURCE_CONFIG = [
  { key: 'ambulance', title: 'Ambulances', icon: 'fas fa-truck-medical', max: 20, requestType: 'Medical', requestName: 'Govt Ambulance Dispatch' },
  { key: 'firetruck', title: 'Fire Trucks', icon: 'fas fa-fire-extinguisher', max: 12, requestType: 'Rescue', requestName: 'Govt Fire Response' },
  { key: 'rescue', title: 'Rescue Teams', icon: 'fas fa-hard-hat', max: 30, requestType: 'Rescue', requestName: 'Govt Rescue Team Dispatch' },
];

export default function ResourceSection() {
  const { helpRequests, refreshRequests, refreshStats } = useAppData();
  const toast = useToast();
  const [loadingKey, setLoadingKey] = useState('');

  function getAvailableCount(resourceKey, max) {
    const assigned = helpRequests.filter((req) => {
      if (req.status !== 'assigned') return false;
      const combined = `${req.type || ''} ${req.description || ''} ${req.name || ''}`.toLowerCase();
      if (resourceKey === 'ambulance') return combined.includes('medical') || combined.includes('ambulance');
      if (resourceKey === 'firetruck') return combined.includes('fire');
      if (resourceKey === 'rescue') return combined.includes('rescue') || combined.includes('team');
      return false;
    }).length;

    return Math.max(0, max - assigned);
  }

  async function dispatchResource(resource) {
    const loc = window.prompt(`Enter target location for ${resource.title}:`, 'Bundi');
    if (!loc) return;

    setLoadingKey(resource.key);

    try {
      const createRes = await fetch(`${API_BASE}/helprequests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: resource.requestName,
          phone: 'N/A',
          type: resource.requestType,
          location: loc,
          people: 1,
          description: `Manual dispatch from Govt HQ for ${resource.title}`,
        }),
      });

      if (!createRes.ok) throw new Error(`Create failed: ${createRes.status}`);
      const created = await createRes.json();

      const assignRes = await fetch(`${API_BASE}/helprequests/${created._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'assigned' }),
      });

      if (!assignRes.ok) throw new Error(`Assign failed: ${assignRes.status}`);

      await Promise.all([refreshRequests(), refreshStats()]);
      toast.success(`${resource.title} dispatched to ${loc}`);
    } catch (err) {
      console.error(err);
      toast.error('Dispatch failed');
    } finally {
      setLoadingKey('');
    }
  }

  const totalMax = RESOURCE_CONFIG.reduce((sum, item) => sum + item.max, 0);
  const totalAvailable = RESOURCE_CONFIG.reduce((sum, item) => sum + getAvailableCount(item.key, item.max), 0);
  const overallPercent = Math.round((totalAvailable / totalMax) * 100);

  return (
    <section id="resources" className="section">
      <div className="container">
        <div className="section-header">
          <h2>Resource Management</h2>
          <div className="resource-summary">Overall availability: {overallPercent}%</div>
        </div>

        <div className="resources-grid">
          {RESOURCE_CONFIG.map((resource) => {
            const available = getAvailableCount(resource.key, resource.max);

            return (
              <div className="resource-card" key={resource.key}>
                <i className={resource.icon}></i>
                <h3>{resource.title}</h3>
                <p><strong>{available}</strong>/{resource.max} Available</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => dispatchResource(resource)}
                  disabled={loadingKey === resource.key}
                >
                  {loadingKey === resource.key ? 'Dispatching...' : 'Dispatch'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
