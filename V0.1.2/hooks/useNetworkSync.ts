import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { pullAll, subscribeToFamily } from '../services/sync/supabaseSync';
import { useAuthStore } from '../store/authStore';

export function useNetworkSync() {
  const familyId = useAuthStore((s) => s.familyId);

  useEffect(() => {
    if (!familyId) return;

    let unsubscribeRealtime: (() => void) | undefined;

    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        pullAll().catch(console.error);
        if (!unsubscribeRealtime) {
          unsubscribeRealtime = subscribeToFamily(familyId);
        }
      } else {
        unsubscribeRealtime?.();
        unsubscribeRealtime = undefined;
      }
    });

    pullAll().catch(console.error);
    unsubscribeRealtime = subscribeToFamily(familyId);

    return () => {
      unsubscribeNetwork();
      unsubscribeRealtime?.();
    };
  }, [familyId]);
}
