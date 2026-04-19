// import { useState } from 'react';
// import Header from './components/Header';
// import Dashboard from './components/Dashboard';
// import AlertsSection from './components/AlertsSection';
// import ResourceSection from './components/ResourceSection';
// import SosSection from './components/SosSection';
// import IncidentReviewPage from './components/IncidentReviewPage';

// export default function App() {
//   const [activeSection, setActiveSection] = useState('dashboard');
//   const [mapMode, setMapMode] = useState('hazards');
//   const [focusedRequestId, setFocusedRequestId] = useState(null);

//   function handleOpenDispatchMap(requestId) {
//     setActiveSection('dashboard');
//     setMapMode('sos');
//     setFocusedRequestId(requestId);
//   }

//   return (
//     <>
//       <Header activeSection={activeSection} onNavigate={setActiveSection} />

//       <main className="main page-shell">
//         {activeSection === 'dashboard' && (
//           <Dashboard
//             mapMode={mapMode}
//             setMapMode={setMapMode}
//             focusedRequestId={focusedRequestId}
//           />
//         )}

//         {activeSection === 'alerts' && <AlertsSection />}
//         {activeSection === 'incidents' && <IncidentReviewPage />}
//         {activeSection === 'resources' && <ResourceSection />}
//         {activeSection === 'reports' && (
//           <SosSection onOpenDispatchMap={handleOpenDispatchMap} />
//         )}
//       </main>
//     </>
//   );
// }

import { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AlertsSection from './components/AlertsSection';
import ResourceSection from './components/ResourceSection';
import SosSection from './components/SosSection';
import IncidentReviewPage from './components/IncidentReviewPage';

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [mapMode, setMapMode] = useState('hazards');
  const [focusedRequestId, setFocusedRequestId] = useState(null);

  function handleOpenDispatchMap(requestId) {
    setActiveSection('dashboard');
    setMapMode('sos');
    setFocusedRequestId(requestId);
  }

  return (
    <>
      <Header activeSection={activeSection} onNavigate={setActiveSection} />
      <main className="main page-shell">
        {activeSection === 'dashboard' && (
          <Dashboard
            mapMode={mapMode}
            setMapMode={setMapMode}
            focusedRequestId={focusedRequestId}
          />
        )}
        {activeSection === 'alerts' && <AlertsSection />}
        {activeSection === 'incidents' && <IncidentReviewPage />}
        {activeSection === 'resources' && <ResourceSection />}
        {activeSection === 'reports' && (
          <SosSection onOpenDispatchMap={handleOpenDispatchMap} />
        )}
      </main>
    </>
  );
}
