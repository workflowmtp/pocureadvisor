'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';

export function BadgeUpdater() {
  const updateBadges = useAppStore((s) => s.updateBadges);
  const updateBadgesRef = useRef(updateBadges);
  updateBadgesRef.current = updateBadges;

  useEffect(() => {
    async function fetchBadges() {
      try {
        const res = await fetch('/api/notifications?countOnly=true');
        if (res.ok) {
          const data = await res.json();
          updateBadgesRef.current({
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
    const interval = setInterval(fetchBadges, 120000); // Poll every 2min
    return () => clearInterval(interval);
  }, []); // Empty deps — stable ref via useRef

  return null;
}
