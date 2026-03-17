import { useState, useEffect, useCallback } from 'react';

export interface WeatherData {
  temperature: number; // Fahrenheit
  temperatureC: number;
  windSpeed: number; // mph
  windDirection: number;
  weatherCode: number;
  humidity?: number;
  isDay: boolean;
  description: string;
  lastUpdated: number;
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm w/ hail',
  99: 'Thunderstorm w/ heavy hail',
};

export function useWeather(latitude: number | null, longitude: number | null) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWeather = useCallback(async () => {
    if (latitude === null || longitude === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day&temperature_unit=fahrenheit&wind_speed_unit=mph`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather API error');
      const json = await res.json();
      const c = json.current;

      setData({
        temperature: c.temperature_2m,
        temperatureC: Math.round((c.temperature_2m - 32) * 5 / 9 * 10) / 10,
        windSpeed: c.wind_speed_10m,
        windDirection: c.wind_direction_10m,
        weatherCode: c.weather_code,
        humidity: c.relative_humidity_2m,
        isDay: c.is_day === 1,
        description: WEATHER_CODES[c.weather_code] || 'Unknown',
        lastUpdated: Date.now(),
      });
    } catch (e: any) {
      setError(e.message || 'Failed to fetch weather');
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude]);

  // Auto-fetch when coordinates change
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      fetchWeather();
    }
  }, [latitude, longitude, fetchWeather]);

  return { data, error, isLoading, refresh: fetchWeather };
}
