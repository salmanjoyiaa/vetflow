'use client';

import { useEffect, useState } from 'react';
import { listCameraDevicesAction, createCameraDeviceAction } from '@/lib/services/camera-actions';
import { Loader2, Plus, Video } from 'lucide-react';

export default function CameraDevicesClient() {
  const [devices, setDevices] = useState<
    Array<{ id: string; name: string; snapshot_url: string | null; stream_url: string | null }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [snapshotUrl, setSnapshotUrl] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    listCameraDevicesAction().then((res) => {
      if (res.success) setDevices(res.devices);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const addDevice = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);
    const res = await createCameraDeviceAction({
      name: name.trim(),
      snapshotUrl,
      streamUrl,
    });
    if (res.success) {
      setName('');
      setSnapshotUrl('');
      setStreamUrl('');
      load();
      setMessage('Camera device added.');
    } else {
      setMessage(res.error || 'Failed to add device');
    }
    setSaving(false);
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin" />;

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 space-y-4">
      <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
        <Video className="w-4 h-4 text-primary" />
        Camera devices
      </h3>
      <p className="text-xs text-on-surface-variant">
        Configure snapshot or stream URLs for live camera feeds on dashboards.
      </p>

      {devices.length > 0 && (
        <ul className="space-y-2 text-xs">
          {devices.map((d) => (
            <li key={d.id} className="p-3 rounded-xl border border-outline-variant/40">
              <span className="font-bold">{d.name}</span>
              {d.snapshot_url && (
                <span className="text-[10px] text-on-surface-variant block truncate">
                  Snapshot: {d.snapshot_url}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="grid sm:grid-cols-3 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Device name"
          className="px-3 py-2 border border-outline-variant rounded-xl text-xs"
        />
        <input
          value={snapshotUrl}
          onChange={(e) => setSnapshotUrl(e.target.value)}
          placeholder="Snapshot URL (optional)"
          className="px-3 py-2 border border-outline-variant rounded-xl text-xs"
        />
        <input
          value={streamUrl}
          onChange={(e) => setStreamUrl(e.target.value)}
          placeholder="Stream URL (optional)"
          className="px-3 py-2 border border-outline-variant rounded-xl text-xs"
        />
      </div>
      <button
        type="button"
        onClick={addDevice}
        disabled={saving}
        className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Add camera
      </button>
      {message && <p className="text-xs text-primary">{message}</p>}
    </div>
  );
}
