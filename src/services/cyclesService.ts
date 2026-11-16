import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CycleConfig } from './deviceService';

export type CustomCycle = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  enabled: boolean;
};

const col = (uid: string) => collection(db, 'users', uid, 'cycles');

// US08: ciclos do usuário em tempo real
export function subscribeCycles(uid: string, cb: (c: CustomCycle[]) => void) {
  return onSnapshot(
    query(col(uid), orderBy('createdAt', 'asc')),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const v = d.data();
          return {
            id: d.id,
            name: v.name,
            description: v.description ?? '',
            durationMin: Number(v.durationMin ?? 0),
            enabled: !!v.enabled,
          };
        }),
      ),
    () => cb([]),
  );
}

export const addCycle = (uid: string, c: { name: string; description: string; durationMin: number }) =>
  addDoc(col(uid), { ...c, enabled: false, createdAt: serverTimestamp() });

export const setCycleEnabled = (uid: string, id: string, enabled: boolean) =>
  updateDoc(doc(db, 'users', uid, 'cycles', id), { enabled });

export const removeCycle = (uid: string, id: string) => deleteDoc(doc(db, 'users', uid, 'cycles', id));

// formato enviado ao ESP32 (config.cycles)
export const toDeviceCycles = (list: CustomCycle[]): CycleConfig[] =>
  list.map(({ id, name, durationMin, enabled }) => ({ id, name, durationMin, enabled }));
