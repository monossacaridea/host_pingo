import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { DEFAULT_CONFIG, DeviceConfig, sendConfig, parseDevice } from './deviceService';

// Ajuste para a tarifa local de água+esgoto (R$ por litro). 0,0065 R$/L = R$ 6,50/m³.
export const TARIFF_BRL_PER_LITER = 0.0065;

export type WaterUsageConfig = Pick<DeviceConfig, 'reuseRinse' | 'reuseMainWash' | 'reuseFinalSpin'>;

const CACHE_KEY = '@pingo_water_config';
const CAPACITY_KEY = '@pingo_machine_capacity';

async function currentDeviceId(): Promise<string | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return (snap.data()?.deviceId as string) ?? null;
}

export const litersToBRL = (liters: number) => (liters * TARIFF_BRL_PER_LITER).toFixed(2);

// Usadas pela FlowSelectionScreen (sem alterações nela)
export async function getWaterConfig(): Promise<WaterUsageConfig> {
  try {
    const id = await currentDeviceId();
    if (id) {
      const d = await getDoc(doc(db, 'devices', id));
      if (d.exists()) {
        const { reuseRinse, reuseMainWash, reuseFinalSpin } = parseDevice(d.data()).config;
        const cfg = { reuseRinse, reuseMainWash, reuseFinalSpin };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cfg));
        return cfg;
      }
    }
  } catch {}
  const cached = await AsyncStorage.getItem(CACHE_KEY);
  const { reuseRinse, reuseMainWash, reuseFinalSpin } = DEFAULT_CONFIG;
  return cached ? JSON.parse(cached) : { reuseRinse, reuseMainWash, reuseFinalSpin };
}

export async function saveWaterConfig(cfg: WaterUsageConfig) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cfg));
  const id = await currentDeviceId();
  if (id) await sendConfig(id, cfg); // US10
}

// Usada pela MachineSetupScreen (troque o AsyncStorage.setItem por esta função)
export async function saveMachineCapacity(kg: number) {
  await AsyncStorage.setItem(CAPACITY_KEY, String(kg));
  const id = await currentDeviceId();
  if (id) await sendConfig(id, { machineKg: kg }); // US10
}
