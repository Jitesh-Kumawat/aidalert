import { useAppData } from '../context/AppDataContext';
import MapPanel from './MapPanel';

export default function Dashboard({ mapMode, setMapMode, focusedRequestId }) {
  const { alerts, loading } = useAppData();

  return (
    <section id="dashboard" className="section active">
      <div className="container">
        <h2>Dashboard Overview</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <i className="fas fa-exclamation-triangle"></i>
            <div>
              <h3>{alerts.length}</h3>
              <p>Active Alerts</p>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="card">
            <h3>
              <i className="fas fa-map-marker-alt"></i> Live Map
            </h3>
            <MapPanel
              mode={mapMode}
              setMode={setMapMode}
              focusedRequestId={focusedRequestId}
            />
          </div>

          <div className="card">
            <h3>
              <i className="fas fa-history"></i> Recent Alerts
            </h3>

            {loading ? (
              <p>Loading alerts...</p>
            ) : alerts.length === 0 ? (
              <p>No alerts available</p>
            ) : (
              <ul className="alert-list">
                {alerts.slice(0, 5).map((alert) => (
                  <li key={alert._id || alert.id} className="alert-item">
                    <strong>{String(alert.type || 'unknown').toUpperCase()}</strong>
                    {' - '}
                    {alert.location || alert.locationText || 'Unknown location'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
