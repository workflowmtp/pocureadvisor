'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';

export function BadgeUpdater() {
  const updateBadges = useAppStore((s) => s.updateBadges);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const res = await fetch('/api/notifications?countOnly=true');
        if (res.ok) {
          const data = await res.json();
          updateBadges({
            unreadNotifs: data.unreadNotifs ?? 0,
            openAnomalies: data.openAnomalies ?? 0,
            lateOrders: data.lateOrders ?? 0,
            suppliersAtRisk: data.suppliersAtRisk ?? 0,
          });
        }
      } catch {
        // Silently fail — badges just won't update
      }
    }

    fetchBadges();
    const interval = setInterval(fetchBadges, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, [updateBadges]);

  return null;
}
