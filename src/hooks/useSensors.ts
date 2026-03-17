import { useState, useEffect, useCallback, useRef } from 'react';

export interface GPSData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface MotionData {
  acceleration: { x: number; y: number; z: number };
  rotationRate: { alpha: number; beta: number; gamma: number };
  interval: number;
}

export interface OrientationData {
  alpha: number | null; // compass direction
  beta: number | null;  // front-to-back tilt
  gamma: number | null; // left-to-right tilt
}

export function useGPS() {
  const [data, setData] = useState<GPSData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setError(null);
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setData({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        setError(err.message);
        setIsTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => () => stopTracking(), [stopTracking]);

  return { data, error, isTracking, startTracking, stopTracking };
}

export function useAccelerometer() {
  const [data, setData] = useState<MotionData | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handler = useCallback((e: DeviceMotionEvent) => {
    const acc = e.acceleration || { x: 0, y: 0, z: 0 };
    const rot = e.rotationRate || { alpha: 0, beta: 0, gamma: 0 };
    setData({
      acceleration: { x: acc.x ?? 0, y: acc.y ?? 0, z: acc.z ?? 0 },
      rotationRate: { alpha: rot.alpha ?? 0, beta: rot.beta ?? 0, gamma: rot.gamma ?? 0 },
      interval: e.interval,
    });
  }, []);

  const start = useCallback(async () => {
    if (typeof DeviceMotionEvent === 'undefined') {
      setError('DeviceMotion not supported');
      return;
    }
    // iOS 13+ requires permission
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const perm = await (DeviceMotionEvent as any).requestPermission();
        if (perm !== 'granted') { setError('Permission denied'); return; }
      } catch { setError('Permission request failed'); return; }
    }
    window.addEventListener('devicemotion', handler);
    setIsActive(true);
    setError(null);
  }, [handler]);

  const stop = useCallback(() => {
    window.removeEventListener('devicemotion', handler);
    setIsActive(false);
  }, [handler]);

  useEffect(() => () => stop(), [stop]);

  return { data, isActive, error, start, stop };
}

export function useGyroscope() {
  const [data, setData] = useState<OrientationData | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handler = useCallback((e: DeviceOrientationEvent) => {
    setData({ alpha: e.alpha, beta: e.beta, gamma: e.gamma });
  }, []);

  const start = useCallback(async () => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setError('DeviceOrientation not supported');
      return;
    }
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const perm = await (DeviceOrientationEvent as any).requestPermission();
        if (perm !== 'granted') { setError('Permission denied'); return; }
      } catch { setError('Permission request failed'); return; }
    }
    window.addEventListener('deviceorientation', handler);
    setIsActive(true);
    setError(null);
  }, [handler]);

  const stop = useCallback(() => {
    window.removeEventListener('deviceorientation', handler);
    setIsActive(false);
  }, [handler]);

  useEffect(() => () => stop(), [stop]);

  return { data, isActive, error, start, stop };
}

export function useBattery() {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('getBattery' in navigator)) {
      setError('Battery API not supported');
      return;
    }
    (navigator as any).getBattery().then((battery: any) => {
      const update = () => {
        setLevel(battery.level);
        setCharging(battery.charging);
      };
      update();
      battery.addEventListener('levelchange', update);
      battery.addEventListener('chargingchange', update);
      return () => {
        battery.removeEventListener('levelchange', update);
        battery.removeEventListener('chargingchange', update);
      };
    }).catch(() => setError('Battery API unavailable'));
  }, []);

  return { level, charging, error };
}

export function useNetworkInfo() {
  const [info, setInfo] = useState<{
    online: boolean;
    type: string;
    downlink: number | null;
    rtt: number | null;
  }>({ online: navigator.onLine, type: 'unknown', downlink: null, rtt: null });

  useEffect(() => {
    const update = () => {
      const conn = (navigator as any).connection;
      setInfo({
        online: navigator.onLine,
        type: conn?.effectiveType || 'unknown',
        downlink: conn?.downlink ?? null,
        rtt: conn?.rtt ?? null,
      });
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    (navigator as any).connection?.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      (navigator as any).connection?.removeEventListener?.('change', update);
    };
  }, []);

  return info;
}

export function useAmbientLight() {
  const [lux, setLux] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sensorRef = useRef<any>(null);

  const start = useCallback(() => {
    if (!('AmbientLightSensor' in window)) {
      setError('AmbientLightSensor not supported (Chrome Android only)');
      return;
    }
    try {
      const sensor = new (window as any).AmbientLightSensor();
      sensor.addEventListener('reading', () => setLux(sensor.illuminance));
      sensor.addEventListener('error', (e: any) => setError(e.error?.message || 'Sensor error'));
      sensor.start();
      sensorRef.current = sensor;
      setIsActive(true);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to start light sensor');
    }
  }, []);

  const stop = useCallback(() => {
    if (sensorRef.current) {
      sensorRef.current.stop();
      sensorRef.current = null;
    }
    setIsActive(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { lux, isActive, error, start, stop };
}

export function useShakeDetection(onShake: () => void, threshold = 15) {
  const lastAccRef = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const last = lastAccRef.current;
      const delta = Math.abs(acc.x - last.x) + Math.abs(acc.y - last.y) + Math.abs(acc.z - last.z);
      lastAccRef.current = { x: acc.x, y: acc.y, z: acc.z };

      if (delta > threshold) {
        onShake();
      }
    };

    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }, [onShake, threshold]);
}
