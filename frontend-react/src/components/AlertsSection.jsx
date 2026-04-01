import { useState } from 'react';
import { API_BASE } from '../api/config';
import AlertModal from './AlertModal';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';

export default function AlertsSection() {
  const { alerts, loading, refreshAlerts } = useAppData();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  async function deleteAlert(id) {
    const ok = window.confirm('Delete this alert?');
    if (!ok) return;

    setDeletingId(id);
    try {
      await fetch(`${API_BASE}/alerts/${id}`, { method: 'DELETE' });
      await refreshAlerts();
      toast.success('Alert deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete alert');
    } finally {
      setDeletingId('');
    }
  }

  return (
    <section id="alerts" className="section">
      <div className="container">
        <div className="section-header">
          <h2>Emergency Alerts</h2>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <i className="fas fa-plus"></i> New Alert
          </button>
        </div>

        {loading ? <p>Loading alerts...</p> : (
          <div className="alerts-grid">
            {alerts.map((alert) => (
              <div key={alert._id || alert.id} className="card alert-card">
                <h4>{String(alert.type || 'unknown').toUpperCase()}</h4>
                <p>{alert.location || alert.locationText || 'Unknown location'}</p>
                <p><strong>Severity:</strong> {alert.severity || 'N/A'}</p>
                <p>{alert.description || 'No description'}</p>
                <button
                  className="btn delete-btn"
                  onClick={() => deleteAlert(alert._id)}
                  disabled={deletingId === alert._id}
                >
                  {deletingId === alert._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}

        <AlertModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={refreshAlerts}
        />
      </div>
    </section>
  );
}
