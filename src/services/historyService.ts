import { collection, onSnapshot, orderBy, limit, query, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export type HistoryEntry = {
  id: string;
  cycleName: string;
  endedAt: Date;
  liters: number;
  durationMin: number;
};

// US09: o ESP32 cria um documento ao fechar a válvula (devices/{id}/history)
export function subscribeHistory(deviceId: string, cb: (h: HistoryEntry[]) => void, max = 50) {
  return onSnapshot(
    query(collection(db, 'devices', deviceId, 'history'), orderBy('endedAt', 'desc'), limit(max)),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const v = d.data();
          return {
            id: d.id,
            cycleName: v.cycleName ?? 'Ciclo',
            endedAt: v.endedAt instanceof Timestamp ? v.endedAt.toDate() : new Date(),
            liters: Number(v.liters ?? 0),
            durationMin: Number(v.durationMin ?? 0),
          };
        }),
      ),
    () => cb([]),
  );
}
