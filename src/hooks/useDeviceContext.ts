import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface DeviceContext {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: Orientation;
  width: number;
  height: number;
  // Contexte d'utilisation suggéré
  useCase: 'field' | 'office';
}

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function useDeviceContext(): DeviceContext {
  const [deviceContext, setDeviceContext] = useState<DeviceContext>(() => {
    // Initialisation avec les valeurs du serveur (fallback)
    const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const height = typeof window !== 'undefined' ? window.innerHeight : 1080;
    
    const isMobile = width < MOBILE_BREAKPOINT;
    const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
    const isDesktop = width >= TABLET_BREAKPOINT;
    
    const deviceType: DeviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    const orientation: Orientation = width > height ? 'landscape' : 'portrait';
    const useCase: 'field' | 'office' = isMobile ? 'field' : 'office';
    
    return {
      deviceType,
      isMobile,
      isTablet,
      isDesktop,
      orientation,
      width,
      height,
      useCase,
    };
  });

  useEffect(() => {
    const updateDeviceContext = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const isMobile = width < MOBILE_BREAKPOINT;
      const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
      const isDesktop = width >= TABLET_BREAKPOINT;
      
      const deviceType: DeviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
      const orientation: Orientation = width > height ? 'landscape' : 'portrait';
      const useCase: 'field' | 'office' = isMobile ? 'field' : 'office';
      
      setDeviceContext({
        deviceType,
        isMobile,
        isTablet,
        isDesktop,
        orientation,
        width,
        height,
        useCase,
      });
    };

    updateDeviceContext();
    window.addEventListener('resize', updateDeviceContext);
    window.addEventListener('orientationchange', updateDeviceContext);

    return () => {
      window.removeEventListener('resize', updateDeviceContext);
      window.removeEventListener('orientationchange', updateDeviceContext);
    };
  }, []);

  return deviceContext;
}
