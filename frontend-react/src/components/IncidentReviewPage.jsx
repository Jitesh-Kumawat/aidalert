import { useEffect, useState } from 'react';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://aidalert.onrender.com';

export default function IncidentReviewPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadIncidents() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/incidents`);
      const data = await res.json();
      setIncidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    await fetch(`${API_BASE}/api/incidents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadIncidents();
  }

  useEffect(() => {
    loadIncidents();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading incidents...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Incident Review</h2>
      <div style={{ display: 'grid', gap: 16 }}>
        {incidents.map((item) => (
          <div
            key={item._id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 12,
              padding: 16,
              background: '#fff',
            }}
          >
            <h3>{item.title}</h3>
            <p><strong>Type:</strong> {item.type}</p>
            <p><strong>Status:</strong> {item.status}</p>
            <p><strong>Severity:</strong> {item.severity}</p>
            <p><strong>Location:</strong> {item.locationText}</p>
            <p><strong>Description:</strong> {item.description}</p>
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                style={{ width: 220, borderRadius: 8, marginBottom: 12 }}
              />
            ) : null}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => updateStatus(item._id, 'active')}>
                Verify & Activate
              </button>
              <button onClick={() => updateStatus(item._id, 'resolved')}>
                Resolve
              </button>
              <button onClick={() => updateStatus(item._id, 'false_report')}>
                False Report
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
