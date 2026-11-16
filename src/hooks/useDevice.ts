import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  DeviceSnapshot, subscribeDevice, subscribeUserDeviceId, isOnline,
} from '../services/deviceService';

export function useDevice() {
  const { user } = useAuth();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    return subscribeUserDeviceId(user.uid, (id) => {
      setDeviceId(id);
      if (!id) { setDevice(null); setLoading(false); }
    });
  }, [user]);

  useEffect(() => {
    if (!deviceId) return;
    setLoading(true);
    return subscribeDevice(deviceId, (d) => { setDevice(d); setLoading(false); });
  }, [deviceId]);

  // reavalia "online/offline" mesmo sem novos snapshots (heartbeat parou)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  return { deviceId, device, loading, online: isOnline(device?.status.lastSeen ?? null) };
}
