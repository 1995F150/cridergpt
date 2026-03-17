import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MapPin, Activity, Compass, BatteryCharging, Wifi,
  Play, Square, AlertTriangle
} from 'lucide-react';
import { useGPS, useAccelerometer, useGyroscope, useBattery, useNetworkInfo } from '@/hooks/useSensors';

function SensorCard({ title, icon: Icon, active, error, onStart, onStop, children }: {
  title: string;
  icon: React.ElementType;
  active: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={active ? 'default' : 'secondary'} className="text-xs">
              {active ? 'Active' : 'Off'}
            </Badge>
            <Button
              size="sm"
              variant={active ? 'destructive' : 'default'}
              onClick={active ? onStop : onStart}
              className="h-7 px-2"
            >
              {active ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error && (
          <div className="flex items-center gap-2 text-destructive text-xs mb-2">
            <AlertTriangle className="h-3 w-3" /> {error}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

function DataRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value ?? '—'}</span>
    </div>
  );
}

export function SensorDashboard() {
  const gps = useGPS();
  const accel = useAccelerometer();
  const gyro = useGyroscope();
  const battery = useBattery();
  const network = useNetworkInfo();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Phone Sensors</h2>
        <p className="text-sm text-muted-foreground">
          Real-time access to device sensors via browser APIs
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* GPS */}
        <SensorCard
          title="GPS / Location"
          icon={MapPin}
          active={gps.isTracking}
          error={gps.error}
          onStart={gps.startTracking}
          onStop={gps.stopTracking}
        >
          {gps.data ? (
            <div>
              <DataRow label="Latitude" value={gps.data.latitude.toFixed(6)} />
              <DataRow label="Longitude" value={gps.data.longitude.toFixed(6)} />
              <DataRow label="Altitude" value={gps.data.altitude ? `${gps.data.altitude.toFixed(1)}m` : null} />
              <DataRow label="Accuracy" value={`±${gps.data.accuracy.toFixed(0)}m`} />
              <DataRow label="Speed" value={gps.data.speed ? `${(gps.data.speed * 2.237).toFixed(1)} mph` : null} />
              <DataRow label="Heading" value={gps.data.heading ? `${gps.data.heading.toFixed(0)}°` : null} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Tap play to start tracking</p>
          )}
        </SensorCard>

        {/* Accelerometer */}
        <SensorCard
          title="Accelerometer"
          icon={Activity}
          active={accel.isActive}
          error={accel.error}
          onStart={accel.start}
          onStop={accel.stop}
        >
          {accel.data ? (
            <div>
              <DataRow label="X" value={accel.data.acceleration.x.toFixed(2)} />
              <DataRow label="Y" value={accel.data.acceleration.y.toFixed(2)} />
              <DataRow label="Z" value={accel.data.acceleration.z.toFixed(2)} />
              <DataRow label="Rotation α" value={accel.data.rotationRate.alpha.toFixed(1)} />
              <DataRow label="Rotation β" value={accel.data.rotationRate.beta.toFixed(1)} />
              <DataRow label="Rotation γ" value={accel.data.rotationRate.gamma.toFixed(1)} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Tap play to read motion data</p>
          )}
        </SensorCard>

        {/* Gyroscope / Orientation */}
        <SensorCard
          title="Gyroscope / Orientation"
          icon={Compass}
          active={gyro.isActive}
          error={gyro.error}
          onStart={gyro.start}
          onStop={gyro.stop}
        >
          {gyro.data ? (
            <div>
              <DataRow label="Compass (α)" value={gyro.data.alpha ? `${gyro.data.alpha.toFixed(1)}°` : null} />
              <DataRow label="Tilt F/B (β)" value={gyro.data.beta ? `${gyro.data.beta.toFixed(1)}°` : null} />
              <DataRow label="Tilt L/R (γ)" value={gyro.data.gamma ? `${gyro.data.gamma.toFixed(1)}°` : null} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Tap play to read orientation</p>
          )}
        </SensorCard>

        {/* Battery */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BatteryCharging className="h-4 w-4 text-primary" />
              Battery
              {battery.charging !== null && (
                <Badge variant={battery.charging ? 'default' : 'secondary'} className="text-xs ml-auto">
                  {battery.charging ? 'Charging' : 'Discharging'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {battery.error ? (
              <div className="flex items-center gap-2 text-destructive text-xs">
                <AlertTriangle className="h-3 w-3" /> {battery.error}
              </div>
            ) : battery.level !== null ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Level</span>
                  <span className="font-mono text-foreground">{Math.round(battery.level * 100)}%</span>
                </div>
                <Progress value={battery.level * 100} className="h-2" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Reading battery…</p>
            )}
          </CardContent>
        </Card>

        {/* Network */}
        <Card className="border-border sm:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4 text-primary" />
              Network
              <Badge variant={network.online ? 'default' : 'destructive'} className="text-xs ml-auto">
                {network.online ? 'Online' : 'Offline'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-mono text-foreground">{network.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Downlink</p>
                <p className="text-sm font-mono text-foreground">
                  {network.downlink ? `${network.downlink} Mbps` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Latency</p>
                <p className="text-sm font-mono text-foreground">
                  {network.rtt ? `${network.rtt}ms` : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Native-only sensors</strong> (available in the Android APK via Capacitor plugins):
            NFC Tag Scanner, Bluetooth LE, Biometric Auth, Barcode/QR Scanner, and Haptic Feedback.
            Build the APK to access these.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
