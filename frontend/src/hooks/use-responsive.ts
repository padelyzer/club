'use client';

import { useState, useEffect } from 'react';

export function useResponsive() {
  const [isClient, setIsClient] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    setIsClient(true);
    
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const isDesktop = isClient && windowWidth >= 1024;
  const isTablet = isClient && windowWidth >= 768 && windowWidth < 1024;
  const isMobile = isClient && windowWidth < 768;

  return {
    isClient,
    windowWidth,
    isDesktop,
    isTablet,
    isMobile
  };
}