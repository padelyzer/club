'use client';

import { useEffect, useState } from 'react';

export function SystemHealth() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, [setMounted, true]);

  // Don't render anything on server to avoid hydration issues
  if (!mounted) {
    return null;
  }

  // For now, just return null to avoid any issues
  return null;
}