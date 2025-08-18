
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
    
    if (isNaN(f) || isNaN(r)) {
      setResult({ recommendations: ['Please enter valid force and radius values'] });
      return;
    }

    const torque = f * r;
    
    setResult({
      result: torque,
      unit: 'N⋅m',
      calculations: {
        'Force': f,
        'Radius': r,
        'Torque': torque
      },
      recommendations: [
        'Torque = Force × Radius',
        `Applied force: ${f} N`,
        `Lever arm: ${r} m`,
        torque > 100 ? 'High torque - ensure proper safety measures' : 'Standard torque range'
      ]
    });
  };

  const calculatePower = () => {
    const f = parseFloat(force);
    const d = parseFloat(distance);
    const t = parseFloat(time);
    
    if (isNaN(f) || isNaN(d) || isNaN(t)) {
      setResult({ recommendations: ['Please enter valid force, distance, and time values'] });
      return;
    }

    const work = f * d;
    const power = work / t;
    
    setResult({
      result: power,
      unit: 'W',
      calculations: {
        'Force': f,
        'Distance': d,
        'Time': t,
        'Work': work,
        'Power': power
      },
      recommendations: [
        'Power = Work ÷ Time = (Force × Distance) ÷ Time',
        `Work done: ${work.toFixed(2)} J`,
        `Time taken: ${t} s`,
        power > 1000 ? 'High power output - consider cooling' : 'Standard power range'
      ]
    });
  };

  const calculateForce = () => {
    const m = parseFloat(mass);
    const a = parseFloat(acceleration);
    
    if (isNaN(m) || isNaN(a)) {
      setResult({ recommendations: ['Please enter valid mass and acceleration values'] });
      return;
    }

    const f = m * a;
    
    setResult({
      result: f,
      unit: 'N',
      calculations: {
        'Mass': m,
        'Acceleration': a,
        'Force': f
      },
      recommendations: [
        'Force = Mass × Acceleration (Newton\'s Second Law)',
        `Object mass: ${m} kg`,
        `Acceleration: ${a} m/s²`,
        f > 1000 ? 'High force - ensure structural integrity' : 'Standard force range'
      ]
    });
  };

  const calculateVelocity = () => {
    const d = parseFloat(distance);
    const t = parseFloat(time);
    
    if (isNaN(d) || isNaN(t)) {
      setResult({ recommendations: ['Please enter valid distance and time values'] });
      return;
    }

    const v = d / t;
    const a = parseFloat(acceleration);
    let finalVelocity = v;
    
    if (!isNaN(a)) {
      finalVelocity = v + (a * t);
    }
    
    setResult({
      result: finalVelocity,
      unit: 'm/s',
      calculations: {
        'Distance': d,
        'Time': t,
        'Average Velocity': v,
        ...(a && { 'Acceleration': a, 'Final Velocity': finalVelocity })
      },
      recommendations: [
        'Velocity = Distance ÷ Time',
        a ? 'Final Velocity = Initial Velocity + (Acceleration × Time)' : '',
        `Average speed: ${v.toFixed(2)} m/s`,
        finalVelocity > 50 ? 'High velocity - consider safety factors' : 'Standard velocity range'
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
                <Label htmlFor="force">Force (N)</Label>
                <Input
                  id="force"
                  type="number"
                  step="0.1"
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
                <Label htmlFor="force">Force (N)</Label>
                <Input
                  id="force"
                  type="number"
                  step="0.1"
                  value={force}
                  onChange={(e) => setForce(e.target.value)}
                  placeholder="Enter force"
                />
              </div>
              <div>
                <Label htmlFor="distance">Distance (m)</Label>
                <Input
                  id="distance"
                  type="number"
                  step="0.1"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="Enter distance"
                />
              </div>
              <div>
                <Label htmlFor="time">Time (s)</Label>
                <Input
                  id="time"
                  type="number"
                  step="0.1"
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
                  value={mass}
                  onChange={(e) => setMass(e.target.value)}
                  placeholder="Enter mass in kg"
                />
              </div>
              <div>
                <Label htmlFor="acceleration">Acceleration (m/s²)</Label>
                <Input
                  id="acceleration"
                  type="number"
                  step="0.1"
                  value={acceleration}
                  onChange={(e) => setAcceleration(e.target.value)}
                  placeholder="Enter acceleration"
                />
              </div>
            </div>
            <Button onClick={calculateForce} className="w-full">Calculate Force</Button>
          </TabsContent>

          <TabsContent value="velocity" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="distance">Distance (m)</Label>
                <Input
                  id="distance"
                  type="number"
                  step="0.1"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="Enter distance"
                />
              </div>
              <div>
                <Label htmlFor="time">Time (s)</Label>
                <Input
                  id="time"
                  type="number"
                  step="0.1"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="Enter time"
                />
              </div>
              <div>
                <Label htmlFor="acceleration">Acceleration (m/s²)</Label>
                <Input
                  id="acceleration"
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
                {result.result && (
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="text-3xl font-bold text-primary">
                      {result.result.toFixed(2)} {result.unit}
                    </div>
                  </div>
                )}

                {result.calculations && (
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(result.calculations).map(([key, value]) => (
                      <div key={key} className="text-center p-2 bg-background rounded">
                        <div className="font-semibold">{key}</div>
                        <div className="text-muted-foreground">{value.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {result.recommendations && (
                  <div>
                    <h4 className="font-semibold mb-2">Formula & Notes:</h4>
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
