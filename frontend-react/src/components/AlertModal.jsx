// import { useState } from 'react';
// import { API_BASE } from '../api/config';

// export default function AlertModal({ open, onClose, onCreated }) {
//   const [form, setForm] = useState({
//     type: '',
//     location: '',
//     severity: 'medium',
//     description: '',
//   });
//   const [saving, setSaving] = useState(false);

//   if (!open) return null;

//   function updateField(e) {
//     const { name, value } = e.target;
//     setForm((prev) => ({ ...prev, [name]: value }));
//   }

//   async function handleSubmit(e) {
//     e.preventDefault();
//     setSaving(true);

//     let latitude = null;
//     let longitude = null;

//     try {
//       const geoRes = await fetch(
//         `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.location)}&limit=1`
//       );
//       const geoData = await geoRes.json();

//       if (Array.isArray(geoData) && geoData.length > 0) {
//         latitude = parseFloat(geoData[0].lat);
//         longitude = parseFloat(geoData[0].lon);
//       }

//       const payload = {
//         type: form.type,
//         location: form.location,
//         latitude,
//         longitude,
//         severity: form.severity,
//         description: form.description,
//       };

//       const res = await fetch(`${API_BASE}/alerts`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         throw new Error(`Server responded with ${res.status}`);
//       }

//       setForm({
//         type: '',
//         location: '',
//         severity: 'medium',
//         description: '',
//       });

//       onCreated?.();
//       onClose();
//     } catch (err) {
//       console.error('Alert create failed:', err);
//       alert('Failed to create alert');
//     } finally {
//       setSaving(false);
//     }
//   }

//   return (
//     <div className="modal-backdrop" onClick={onClose}>
//       <div className="modal-card" onClick={(e) => e.stopPropagation()}>
//         <div className="modal-header-row">
//           <h3>Create New Alert</h3>
//           <button className="modal-close-btn" onClick={onClose}>
//             ×
//           </button>
//         </div>

//         <form onSubmit={handleSubmit} className="alert-form">
//           <div className="form-group">
//             <label>Disaster Type</label>
//             <select name="type" value={form.type} onChange={updateField} required>
//               <option value="">Select Disaster Type</option>
//               <option value="flood">Flood</option>
//               <option value="earthquake">Earthquake</option>
//               <option value="fire">Fire</option>
//               <option value="road_damage">Road Damage / Pothole</option>
//             </select>
//           </div>

//           <div className="form-group">
//             <label>Location</label>
//             <input
//               type="text"
//               name="location"
//               value={form.location}
//               onChange={updateField}
//               placeholder="Address or Coordinates"
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label>Severity</label>
//             <select
//               name="severity"
//               value={form.severity}
//               onChange={updateField}
//               required
//             >
//               <option value="low">Low</option>
//               <option value="medium">Medium</option>
//               <option value="high">High</option>
//               <option value="critical">Critical</option>
//             </select>
//           </div>

//           <div className="form-group">
//             <label>Description</label>
//             <textarea
//               name="description"
//               rows="4"
//               value={form.description}
//               onChange={updateField}
//               required
//             />
//           </div>

//           <button type="submit" className="btn btn-primary modal-submit-btn" disabled={saving}>
//             {saving ? 'Saving...' : 'Submit Official Alert'}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }
import { useState } from 'react';
import { API_BASE } from '../api/config';
import { useToast } from '../context/ToastContext';

export default function AlertModal({ open, onClose, onCreated }) {
  const toast = useToast();

  const [form, setForm] = useState({
    type: '',
    location: '',
    severity: 'medium',
    description: '',
  });

  // const [selectedFile, setSelectedFile] = useState(null);
  // const [aiScanning, setAiScanning] = useState(false);
  // const [aiStatus, setAiStatus] = useState('');
  // const [saving, setSaving] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function updateField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // function handleFileChange(e) {
  //   const file = e.target.files?.[0] || null;
  //   setSelectedFile(file);
  // }

  // async function runAiScan() {
  //   if (!selectedFile) {
  //     toast.warning('Please select an image first');
  //     return;
  //   }

  //   setAiScanning(true);
  //   setAiStatus('AI is scanning...');

  //   try {
  //     const formData = new FormData();
  //     formData.append('image', selectedFile);
  //     formData.append('location', form.location || 'Detected by AI');

  //     const response = await fetch(`${API_BASE}/pothole-detect`, {
  //       method: 'POST',
  //       body: formData,
  //     });

  //     const result = await response.json();

  //     if (!response.ok) {
  //       throw new Error(result?.error || `Server responded with ${response.status}`);
  //     }

  //     if (result.pothole) {
  //       setForm((prev) => ({
  //         ...prev,
  //         type: 'road_damage',
  //         severity: result.confidence > 75 ? 'high' : 'medium',
  //         description: `[AI VERIFIED] Pothole detected with ${result.confidence}% confidence.`,
  //       }));

  //       setAiStatus(`Pothole found (${result.confidence}%)`);
  //       toast.success(`Pothole detected (${result.confidence}%)`);
  //     } else {
  //       setAiStatus('Road looks safe');
  //       toast.info('No pothole detected');
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     setAiStatus('AI scan failed');
  //     toast.error('AI scan failed');
  //   } finally {
  //     setAiScanning(false);
  //   }
  // }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    let latitude = null;
    let longitude = null;

    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.location)}&limit=1`
      );
      const geoData = await geoRes.json();

      if (Array.isArray(geoData) && geoData.length > 0) {
        latitude = parseFloat(geoData[0].lat);
        longitude = parseFloat(geoData[0].lon);
      }

      const res = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          latitude,
          longitude,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      toast.success('Alert created successfully');
      onCreated?.();
      onClose();

      setForm({
        type: '',
        location: '',
        severity: 'medium',
        description: '',
      });
      // setSelectedFile(null);
      // setAiStatus('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create alert');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <h3>Create New Alert</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="alert-form">
          {/* <div className="ai-scan-box">
            <label className="ai-label">
              <i className="fas fa-robot"></i> AI Pothole / Damage Scan
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />

            <button
              type="button"
              className="btn btn-warning modal-submit-btn"
              onClick={runAiScan}
              disabled={aiScanning}
            >
              {aiScanning ? 'Analyzing...' : 'Run AI Analysis'}
            </button>

            {aiStatus ? <p className="ai-status">{aiStatus}</p> : null}
          </div> */}

          <div className="form-group">
            <label>Disaster Type</label>
            <select name="type" value={form.type} onChange={updateField} required>
              <option value="">Select Disaster Type</option>
              <option value="flood">Flood</option>
              <option value="earthquake">Earthquake</option>
              <option value="fire">Fire</option>
              {/* <option value="road_damage">Road Damage / Pothole</option> */}
            </select>
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              name="location"
              value={form.location}
              onChange={updateField}
              placeholder="Address or Coordinates"
              required
            />
          </div>

          <div className="form-group">
            <label>Severity</label>
            <select
              name="severity"
              value={form.severity}
              onChange={updateField}
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              rows="4"
              value={form.description}
              onChange={updateField}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary modal-submit-btn"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Submit Official Alert'}
          </button>
        </form>
      </div>
    </div>
  );
}
