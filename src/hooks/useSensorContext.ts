import { useMemo } from 'react';
import type { GPSData } from './useSensors';
import type { WeatherData } from './useWeather';

interface SensorSnapshot {
  gps?: GPSData | null;
  weather?: WeatherData | null;
  batteryLevel?: number | null;
  batteryCharging?: boolean | null;
  networkOnline?: boolean;
  networkType?: string;
  ambientLight?: number | null;
}

/**
 * Aggregates all active sensor data into a concise summary string
 * suitable for injecting into the AI chat system prompt.
 */
export function buildSensorContext(snapshot: SensorSnapshot): string {
  const parts: string[] = [];

  if (snapshot.gps) {
    const g = snapshot.gps;
    parts.push(`📍 Location: ${g.latitude.toFixed(4)}°N, ${g.longitude.toFixed(4)}°W` +
      (g.altitude ? `, ${g.altitude.toFixed(0)}m altitude` : '') +
      (g.speed ? `, moving ${(g.speed * 2.237).toFixed(1)} mph` : ''));
  }

  if (snapshot.weather) {
    const w = snapshot.weather;
    parts.push(`🌡️ Weather: ${w.temperature}°F (${w.temperatureC}°C), ${w.description}` +
      (w.humidity ? `, ${w.humidity}% humidity` : '') +
      `, wind ${w.windSpeed} mph`);
  }

  if (snapshot.batteryLevel !== null && snapshot.batteryLevel !== undefined) {
    parts.push(`🔋 Battery: ${Math.round(snapshot.batteryLevel * 100)}%${snapshot.batteryCharging ? ' (charging)' : ''}`);
  }

  if (snapshot.networkOnline !== undefined) {
    parts.push(`📶 Network: ${snapshot.networkOnline ? 'Online' : 'Offline'}${snapshot.networkType && snapshot.networkType !== 'unknown' ? ` (${snapshot.networkType})` : ''}`);
  }

  if (snapshot.ambientLight !== null && snapshot.ambientLight !== undefined) {
    parts.push(`💡 Ambient light: ${snapshot.ambientLight.toFixed(0)} lux`);
  }

  if (parts.length === 0) return '';
  return `\n\n📱 DEVICE SENSOR DATA (real-time from user's phone):\n${parts.join('\n')}`;
}

export function useSensorContext(snapshot: SensorSnapshot): string {
  return useMemo(() => buildSensorContext(snapshot), [
    snapshot.gps?.latitude,
    snapshot.gps?.longitude,
    snapshot.weather?.temperature,
    snapshot.batteryLevel,
    snapshot.batteryCharging,
    snapshot.networkOnline,
    snapshot.networkType,
    snapshot.ambientLight,
  ]);
}
