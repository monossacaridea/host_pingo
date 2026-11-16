import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, increment, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const ONLINE_TIMEOUT_MS = 45_000; // ESP32 envia heartbeat a cada ~30 s

export type CycleConfig = { id: string; name: string; durationMin: number; enabled: boolean };

export type DeviceConfig = {
  autoMode: boolean;
  reuseRinse: boolean;
  reuseMainWash: boolean;
  reuseFinalSpin: boolean;
  quickCycle: boolean;
  extraCycle: boolean;
  machineKg: number | null;
  cycles: CycleConfig[];
};

export type DeviceStatus = {
  valveOn: boolean;
  lastSeen: Date | null;
  rssi: number | null;
  firmware: string | null;
  totalLiters: number;
};

export type DeviceSnapshot = {
  ownerUid: string;
  commandValveOn: boolean;
  config: DeviceConfig;
  status: DeviceStatus;
};

export const DEFAULT_CONFIG: DeviceConfig = {
  autoMode: true,
  reuseRinse: true,
  reuseMainWash: false,
  reuseFinalSpin: false,
  quickCycle: true,
  extraCycle: false,
  machineKg: null,
  cycles: [],
};

const deviceRef = (id: string) => doc(db, 'devices', id);

export function parseDevice(data: any): DeviceSnapshot {
  const s = data?.status ?? {};
  const ls = s.lastSeen instanceof Timestamp ? s.lastSeen.toDate() : null;
  return {
    ownerUid: data?.ownerUid,
    commandValveOn: !!data?.command?.valveOn,
    config: { ...DEFAULT_CONFIG, ...(data?.config ?? {}) },
    status: {
      valveOn: !!s.valveOn,
      lastSeen: ls,
      rssi: typeof s.rssi === 'number' ? s.rssi : null,
      firmware: s.firmware ?? null,
      totalLiters: Number(s.totalLiters ?? 0),
    },
  };
}

export const isOnline = (lastSeen: Date | null) =>
  !!lastSeen && Date.now() - lastSeen.getTime() < ONLINE_TIMEOUT_MS;

export const normalizeDeviceId = (raw: string) => raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

// Vincula o ESP32 (pelo ID exibido no portal de configuração) à conta do usuário.
export async function linkDevice(uid: string, rawId: string) {
  const deviceId = normalizeDeviceId(rawId);
  if (deviceId.length < 6) throw new Error('ID do dispositivo inválido.');

  const existing = await getDoc(deviceRef(deviceId));
  if (existing.exists()) {
    if (existing.data().ownerUid !== uid) {
      throw new Error('Este dispositivo já está vinculado a outra conta.');
    }
  } else {
    await setDoc(deviceRef(deviceId), {
      ownerUid: uid,
      createdAt: serverTimestamp(),
      command: { valveOn: false, seq: 0 },
      config: DEFAULT_CONFIG,
      status: { valveOn: false, totalLiters: 0 },
    });
  }
  await updateDoc(doc(db, 'users', uid), { deviceId });
  return deviceId;
}

export async function unlinkDevice(uid: string) {
  await updateDoc(doc(db, 'users', uid), { deviceId: null });
}

export function subscribeUserDeviceId(uid: string, cb: (id: string | null) => void) {
  return onSnapshot(doc(db, 'users', uid), (s) => cb((s.data()?.deviceId as string) ?? null), () => cb(null));
}

export function subscribeDevice(id: string, cb: (d: DeviceSnapshot | null) => void) {
  return onSnapshot(deviceRef(id), (s) => cb(s.exists() ? parseDevice(s.data()) : null), () => cb(null));
}

// US05: o ESP32 lê command.valveOn e confirma em status.valveOn.
export async function setValve(deviceId: string, on: boolean) {
  await updateDoc(deviceRef(deviceId), {
    'command.valveOn': on,
    'command.seq': increment(1),
    'command.updatedAt': serverTimestamp(),
  });
}

// US10: envia configurações (parciais) ao dispositivo.
export async function sendConfig(deviceId: string, partial: Partial<DeviceConfig>) {
  const payload: Record<string, any> = {};
  Object.entries(partial).forEach(([k, v]) => { payload[`config.${k}`] = v; });
  await updateDoc(deviceRef(deviceId), payload);
}
