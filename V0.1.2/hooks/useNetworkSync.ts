import { useEffect, useRef } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { pullAll, subscribeToFamily } from '../services/sync/supabaseSync';
import { useAuthStore } from '../store/authStore';

export function useNetworkSync() {
  const familyId = useAuthStore((s) => s.familyId);
  const db = useSQLiteContext();
  const hasPulled = useRef(false);
  const wasOnline = useRef<boolean | null>(null);

  useEffect(() => {
    if (!familyId) return;

    let unsubscribeRealtime: (() => void) | undefined;

    const runFirstPull = () => {
      if (hasPulled.current) return;
      hasPulled.current = true;
      pullAll(db).catch(console.error);
      unsubscribeRealtime = subscribeToFamily(familyId, db);
    };

    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable);

      if (online) {
        if (!hasPulled.current) {
          runFirstPull();
        } else if (wasOnline.current === false) {
          // Reconnect na een offline-onderbreking: pull en heractiveer realtime.
          pullAll(db).catch(console.error);
          if (!unsubscribeRealtime) {
            unsubscribeRealtime = subscribeToFamily(familyId, db);
          }
        }
      } else if (wasOnline.current !== false) {
        unsubscribeRealtime?.();
        unsubscribeRealtime = undefined;
      }
      wasOnline.current = online;
    });

    // Vangnet: als de NetInfo-callback nooit afvuurt (zou niet mogen op een
    // bestaand toestel) zorgen we toch dat de eerste pull start.
    if (!hasPulled.current) runFirstPull();

    return () => {
      unsubscribeNetwork();
      unsubscribeRealtime?.();
      hasPulled.current = false;
      wasOnline.current = null;
    };
  }, [familyId, db]);
}
