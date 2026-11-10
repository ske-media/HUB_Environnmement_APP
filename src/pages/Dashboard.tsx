import { useEffect, useState } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useDeviceContext } from '../hooks/useDeviceContext';
import { DashboardMobile } from '../components/dashboard/DashboardMobile';
import { DashboardDesktop } from '../components/dashboard/DashboardDesktop';

export function Dashboard() {
  const { getPosition } = useGeolocation();
  const { isMobile } = useDeviceContext();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Récupérer la position de l'utilisateur
  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const position = await getPosition();
        setUserLocation({ lat: position.lat, lng: position.lng });
      } catch (error) {
        console.error('Erreur lors de la récupération de la position:', error);
      }
    };

    fetchUserLocation();
  }, [getPosition]);

  // Router vers le bon dashboard selon le contexte
  if (isMobile) {
    return <DashboardMobile userLocation={userLocation} />;
  }

  return <DashboardDesktop userLocation={userLocation} />;
}
