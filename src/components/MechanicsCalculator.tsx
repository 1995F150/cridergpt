
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MechanicsResult {
  result?: number;
  unit?: string;
  recommendations?: string[];
  calculations?: { [key: string]: number };
}

export function MechanicsCalculator() {
  const [force, setForce] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [mass, setMass] = useState<string>('');
  const [acceleration, setAcceleration] = useState<string>('');
  const [radius, setRadius] = useState<string>('');
  const [result, setResult] = useState<MechanicsResult | null>(null);

  const calculateTorque = () => {
    const f = parseFloat(force);
    const r = parseFloat(radius);
    
    if (isNaN(f) || isNaN(r) || f <= 0 || r <= 0) {
      setResult({ recommendations: ['Please enter valid positive force and radius values'] });
      return;
    }

    const torque = f * r;
    
    setResult({
      result: torque,
      unit: 'N⋅m',
      calculations: {
        'Force (N)': f,
        'Radius (m)': r,
        'Torque (N⋅m)': torque
      },
      recommendations: [
        'Torque = Force × Radius',
        `Applied force: ${f} N at distance ${r} m`,
        torque > 100 ? 'High torque - ensure proper safety measures' : 'Standard torque range',
        'Always use proper torque wrench for precision work'
      ]
    });
  };

  const calculatePower = () => {
    const f = parseFloat(force);
    const d = parseFloat(distance);
    const t = parseFloat(time);
    
    if (isNaN(f) || isNaN(d) || isNaN(t) || f <= 0 || d <= 0 || t <= 0) {
      setResult({ recommendations: ['Please enter valid positive values for force, distance, and time'] });
      return;
    }

    const work = f * d;
    const power = work / t;
    
    setResult({
      result: power,
      unit: 'W',
      calculations: {
        'Force (N)': f,
        'Distance (m)': d,
        'Time (s)': t,
        'Work (J)': work,
        'Power (W)': power
      },
      recommendations: [
        'Power = Work ÷ Time = (Force × Distance) ÷ Time',
        `Work done: ${work.toFixed(2)} J over ${t} seconds`,
        power > 1000 ? 'High power output - consider cooling requirements' : 'Standard power range',
        power < 100 ? 'Low power - suitable for precision work' : ''
      ].filter(Boolean)
    });
  };

  const calculateForce = () => {
    const m = parseFloat(mass);
    const a = parseFloat(acceleration);
    
    if (isNaN(m) || isNaN(a) || m <= 0) {
      setResult({ recommendations: ['Please enter valid positive mass and acceleration values'] });
      return;
    }

    const f = m * a;
    
    setResult({
      result: f,
      unit: 'N',
      calculations: {
        'Mass (kg)': m,
        'Acceleration (m/s²)': a,
        'Force (N)': f
      },
      recommendations: [
        'Force = Mass × Acceleration (Newton\'s Second Law)',
        `Object mass: ${m} kg with acceleration: ${a} m/s²`,
        f > 1000 ? 'High force - ensure structural integrity' : 'Standard force range',
        a === 9.81 ? 'Standard gravity acceleration detected' : ''
      ].filter(Boolean)
    });
  };

  const calculateVelocity = () => {
    const d = parseFloat(distance);
    const t = parseFloat(time);
    
    if (isNaN(d) || isNaN(t) || t <= 0) {
      setResult({ recommendations: ['Please enter valid distance and positive time values'] });
      return;
    }

    const v = d / t;
    const a = parseFloat(acceleration);
    let finalVelocity = v;
    let calculations: { [key: string]: number } = {
      'Distance (m)': d,
      'Time (s)': t,
      'Average Velocity (m/s)': v
    };
    
    if (!isNaN(a)) {
      finalVelocity = v + (a * t);
      calculations = {
        ...calculations,
        'Acceleration (m/s²)': a,
        'Final Velocity (m/s)': finalVelocity
      };
    }
    
    setResult({
      result: finalVelocity,
      unit: 'm/s',
      calculations,
      recommendations: [
        'Velocity = Distance ÷ Time',
        !isNaN(a) ? 'Final Velocity = Initial Velocity + (Acceleration × Time)' : 'Constant velocity calculation',
        `Average speed: ${v.toFixed(2)} m/s`,
        finalVelocity > 50 ? 'High velocity - consider safety factors' : 'Safe velocity range',
        Math.abs(finalVelocity - v) > 10 ? 'Significant acceleration effect detected' : ''
      ].filter(Boolean)
    });
  };

  const resetCalculator = () => {
    setForce('');
    setDistance('');
    setTime('');
    setMass('');
    setAcceleration('');
    setRadius('');
    setResult(null);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Mechanics Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="torque" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="torque">Torque</TabsTrigger>
            <TabsTrigger value="power">Power</TabsTrigger>
            <TabsTrigger value="force">Force</TabsTrigger>
            <TabsTrigger value="velocity">Velocity</TabsTrigger>
          </TabsList>

          <TabsContent value="torque" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="force-torque">Force (N)</Label>
                <Input
                  id="force-torque"
                  type="number"
                  step="0.1"
                  min="0"
                  value={force}
                  onChange={(e) => setForce(e.target.value)}
                  placeholder="Enter force in Newtons"
                />
              </div>
              <div>
                <Label htmlFor="radius">Radius/Lever Arm (m)</Label>
                <Input
                  id="radius"
                  type="number"
                  step="0.01"
                  min="0"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder="Enter radius in meters"
                />
              </div>
            </div>
            <Button onClick={calculateTorque} className="w-full">Calculate Torque</Button>
          </TabsContent>

          <TabsContent value="power" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="force-power">Force (N)</Label>
                <Input
                  id="force-power"
                  type="number"
                  step="0.1"
                  min="0"
                  value={force}
                  onChange={(e) => setForce(e.target.value)}
                  placeholder="Enter force"
                />
              </div>
              <div>
                <Label htmlFor="distance-power">Distance (m)</Label>
                <Input
                  id="distance-power"
                  type="number"
                  step="0.1"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="Enter distance"
                />
              </div>
              <div>
                <Label htmlFor="time-power">Time (s)</Label>
                <Input
                  id="time-power"
                  type="number"
                  step="0.1"
                  min="0.01"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="Enter time"
                />
              </div>
            </div>
            <Button onClick={calculatePower} className="w-full">Calculate Power</Button>
          </TabsContent>

          <TabsContent value="force" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mass">Mass (kg)</Label>
                <Input
                  id="mass"
                  type="number"
                  step="0.1"
                  min="0"
                  value={mass}
                  onChange={(e) => setMass(e.target.value)}
                  placeholder="Enter mass in kg"
                />
              </div>
              <div>
                <Label htmlFor="acceleration-force">Acceleration (m/s²)</Label>
                <Input
                  id="acceleration-force"
                  type="number"
                  step="0.1"
                  value={acceleration}
                  onChange={(e) => setAcceleration(e.target.value)}
                  placeholder="Enter acceleration (use 9.81 for gravity)"
                />
              </div>
            </div>
            <Button onClick={calculateForce} className="w-full">Calculate Force</Button>
          </TabsContent>

          <TabsContent value="velocity" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="distance-velocity">Distance (m)</Label>
                <Input
                  id="distance-velocity"
                  type="number"
                  step="0.1"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="Enter distance"
                />
              </div>
              <div>
                <Label htmlFor="time-velocity">Time (s)</Label>
                <Input
                  id="time-velocity"
                  type="number"
                  step="0.1"
                  min="0.01"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="Enter time"
                />
              </div>
              <div>
                <Label htmlFor="acceleration-velocity">Acceleration (m/s²)</Label>
                <Input
                  id="acceleration-velocity"
                  type="number"
                  step="0.1"
                  value={acceleration}
                  onChange={(e) => setAcceleration(e.target.value)}
                  placeholder="Optional acceleration"
                />
              </div>
            </div>
            <Button onClick={calculateVelocity} className="w-full">Calculate Velocity</Button>
          </TabsContent>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={resetCalculator} className="w-full">
              Reset All
            </Button>
          </div>

          {result && (
            <Card className="mt-6 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Calculation Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.result !== undefined && (
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="text-3xl font-bold text-primary">
                      {result.result.toFixed(3)} {result.unit}
                    </div>
                  </div>
                )}

                {result.calculations && (
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(result.calculations).map(([key, value]) => (
                      <div key={key} className="text-center p-2 bg-background rounded">
                        <div className="font-semibold text-sm">{key}</div>
                        <div className="text-muted-foreground">{value.toFixed(3)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {result.recommendations && (
                  <div>
                    <h4 className="font-semibold mb-2">Formula & Analysis:</h4>
                    <ul className="space-y-1">
                      {result.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start">
                          <span className="mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
