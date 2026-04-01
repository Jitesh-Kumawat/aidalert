import { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE } from '../api/config';

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  async function refreshAlerts() {
    const res = await fetch(`${API_BASE}/alerts`);
    const data = await res.json();
    setAlerts(Array.isArray(data) ? data : []);
  }

  async function refreshRequests() {
    const res = await fetch(`${API_BASE}/helprequests?page=1&limit=200`);
    const data = await res.json();
    setHelpRequests(Array.isArray(data) ? data : (data.data || []));
  }

  async function refreshStats() {
    const res = await fetch(`${API_BASE}/helprequests/stats`);
    const data = await res.json();
    setStats(data || {});
  }

  async function refreshAll() {
    try {
      await Promise.all([refreshAlerts(), refreshRequests(), refreshStats()]);
    } catch (err) {
      console.error('Shared data refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    const timer = setInterval(refreshAll, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        alerts,
        helpRequests,
        stats,
        loading,
        refreshAlerts,
        refreshRequests,
        refreshStats,
        refreshAll,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider');
  }
  return context;
}
