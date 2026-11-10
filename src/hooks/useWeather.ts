import { useState, useEffect, useCallback } from 'react';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  rain?: number; // Probabilité de pluie en %
  rainVolume?: number; // Volume de pluie en mm
  windSpeed: number;
  location: string;
}

interface WeatherError {
  message: string;
}

// Utiliser l'API Open-Meteo (gratuite, sans clé API)
const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/reverse';

// Mapper les codes météo WMO vers des descriptions en français
const getWeatherDescription = (weatherCode: number): string => {
  // Codes WMO Weather interpretation codes (WW)
  const descriptions: Record<number, string> = {
    0: 'Ciel dégagé',
    1: 'Principalement dégagé',
    2: 'Partiellement nuageux',
    3: 'Couvert',
    45: 'Brouillard',
    48: 'Brouillard givrant',
    51: 'Bruine légère',
    53: 'Bruine modérée',
    55: 'Bruine dense',
    56: 'Bruine verglaçante légère',
    57: 'Bruine verglaçante dense',
    61: 'Pluie légère',
    63: 'Pluie modérée',
    65: 'Pluie forte',
    66: 'Pluie verglaçante légère',
    67: 'Pluie verglaçante forte',
    71: 'Chute de neige légère',
    73: 'Chute de neige modérée',
    75: 'Chute de neige forte',
    77: 'Grains de neige',
    80: 'Averses de pluie légères',
    81: 'Averses de pluie modérées',
    82: 'Averses de pluie violentes',
    85: 'Averses de neige légères',
    86: 'Averses de neige fortes',
    95: 'Orage',
    96: 'Orage avec grêle',
    99: 'Orage avec grêle violente',
  };
  return descriptions[weatherCode] || 'Conditions variables';
};

// Mapper les codes météo vers des icônes
const getWeatherIcon = (weatherCode: number): string => {
  if (weatherCode === 0 || weatherCode === 1) return '01'; // Clear sky
  if (weatherCode === 2 || weatherCode === 3) return '02'; // Partly cloudy
  if (weatherCode >= 45 && weatherCode <= 48) return '50'; // Fog
  if (weatherCode >= 51 && weatherCode <= 67) return '10'; // Rain
  if (weatherCode >= 71 && weatherCode <= 77) return '13'; // Snow
  if (weatherCode >= 80 && weatherCode <= 86) return '09'; // Showers
  if (weatherCode >= 95 && weatherCode <= 99) return '11'; // Thunderstorm
  return '02'; // Default
};

export function useWeather(lat?: number, lng?: number) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<WeatherError | null>(null);

  const fetchWeather = useCallback(async (latitude: number, longitude: number) => {
    setIsLoading(true);
    setError(null);

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('Hors-ligne: données météo non disponibles');
      }

      // Récupérer les données météo actuelles et les prévisions horaires
      const response = await fetch(
        `${OPEN_METEO_BASE_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=precipitation_probability,precipitation,relativehumidity_2m&timezone=auto`
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données météo');
      }

      const data = await response.json();

      if (!data.current_weather) {
        throw new Error('Données météo non disponibles');
      }

      const current = data.current_weather;
      const hourly = data.hourly;

      // Résoudre un nom de ville lisible (best effort, fallback sur "Position actuelle")
      let locationLabel = 'Position actuelle';
      try {
        const geocodingResponse = await fetch(
          `${OPEN_METEO_GEOCODING_URL}?latitude=${latitude}&longitude=${longitude}&language=fr&count=1`
        );
        if (geocodingResponse.ok) {
          const geocodingData = await geocodingResponse.json();
          const best = Array.isArray(geocodingData?.results) ? geocodingData.results[0] : null;
          if (best?.name) {
            locationLabel = [best.name, best.admin1].filter(Boolean).join(', ');
          }
        }
      } catch {
        // Ignore: fallback sur "Position actuelle"
      }

      // Prendre la première prévision horaire pour la probabilité de pluie
      const rainProbability = hourly?.precipitation_probability?.[0] || 0;
      const rainVolume = hourly?.precipitation?.[0] || 0;
      const humidity = hourly?.relativehumidity_2m?.[0] || 0;

      // Calculer la température ressentie (approximation simple)
      // Formule simplifiée basée sur la température et le vent
      const windChill = current.windspeed > 0 
        ? current.temperature - (current.windspeed * 0.7)
        : current.temperature;
      const feelsLike = Math.round(windChill);

      const weatherInfo: WeatherData = {
        temperature: Math.round(current.temperature),
        feelsLike: feelsLike,
        humidity: humidity,
        description: getWeatherDescription(current.weathercode),
        icon: getWeatherIcon(current.weathercode),
        rain: rainProbability,
        rainVolume: rainVolume,
        windSpeed: Math.round(current.windspeed * 3.6), // Convertir m/s en km/h
        location: locationLabel,
      };

      setWeather(weatherInfo);
    } catch (err: any) {
      console.error('Error fetching weather:', err);
      setError({
        message: err.message || 'Impossible de récupérer les données météo',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (lat && lng) {
      fetchWeather(lat, lng);
    }
  }, [lat, lng, fetchWeather]);

  return {
    weather,
    isLoading,
    error,
    refetch: () => lat && lng ? fetchWeather(lat, lng) : undefined,
  };
}
