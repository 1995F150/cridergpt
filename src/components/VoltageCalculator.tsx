
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VoltageResult {
  result?: number;
  unit?: string;
  calculations?: { [key: string]: number };
  recommendations?: string[];
}

export function VoltageCalculator() {
  const [voltage, setVoltage] = useState<string>('');
  const [current, setCurrent] = useState<string>('');
  const [resistance, setResistance] = useState<string>('');
  const [power, setPower] = useState<string>('');
  const [frequency, setFrequency] = useState<string>('');
  const [phase, setPhase] = useState<string>('single');
  const [currentType, setCurrentType] = useState<string>('dc');
  const [result, setResult] = useState<VoltageResult | null>(null);

  const calculateOhmsLaw = (): VoltageResult => {
    const v = parseFloat(voltage);
    const i = parseFloat(current);
    const r = parseFloat(resistance);
    
    let calculatedValue: number;
    let calculatedUnit: string;
    let calculationType: string;
    
    if (!isNaN(v) && !isNaN(i) && isNaN(r)) {
      // Calculate Resistance: R = V / I
      calculatedValue = v / i;
      calculatedUnit = 'Ω';
      calculationType = 'Resistance';
    } else if (!isNaN(v) && isNaN(i) && !isNaN(r)) {
      // Calculate Current: I = V / R
      calculatedValue = v / r;
      calculatedUnit = 'A';
      calculationType = 'Current';
    } else if (isNaN(v) && !isNaN(i) && !isNaN(r)) {
      // Calculate Voltage: V = I × R
      calculatedValue = i * r;
      calculatedUnit = 'V';
      calculationType = 'Voltage';
    } else {
      return { recommendations: ['Please enter exactly two values to calculate the third'] };
    }

    const p = v * i; // Power calculation
    
    return {
      result: calculatedValue,
      unit: calculatedUnit,
      calculations: {
        'Voltage': v || calculatedValue,
        'Current': i || calculatedValue,
        'Resistance': r || calculatedValue,
        'Power': p || (calculatedValue * (calculationType === 'Voltage' ? i : calculationType === 'Current' ? v : v * i / r))
      },
      recommendations: [
        `Calculated ${calculationType}: ${calculatedValue.toFixed(2)} ${calculatedUnit}`,
        'Ohm\'s Law: V = I × R',
        'Power = V × I',
        calculatedValue > 240 && calculationType === 'Voltage' ? 'High voltage - safety precautions required' : '',
        calculatedValue > 20 && calculationType === 'Current' ? 'High current - check conductor capacity' : ''
      ].filter(Boolean)
    };
  };

  const calculatePower = (): VoltageResult => {
    const v = parseFloat(voltage);
    const i = parseFloat(current);
    const p = parseFloat(power);
    
    if (!isNaN(v) && !isNaN(i)) {
      const calculatedPower = v * i;
      const efficiency = currentType === 'ac' ? 0.85 : 0.95;
      const realPower = calculatedPower * efficiency;
      
      return {
        result: calculatedPower,
        unit: 'W',
        calculations: {
          'Voltage': v,
          'Current': i,
          'Apparent Power': calculatedPower,
          'Real Power': realPower,
          'Efficiency': efficiency * 100
        },
        recommendations: [
          `Power = Voltage × Current`,
          `${currentType.toUpperCase()} efficiency: ${(efficiency * 100).toFixed(1)}%`,
          calculatedPower > 1000 ? 'High power - ensure adequate cooling and protection' : 'Standard power range',
          currentType === 'ac' ? 'Consider power factor for AC calculations' : ''
        ].filter(Boolean)
      };
    }
    
    return { recommendations: ['Please enter voltage and current values'] };
  };

  const calculateACProperties = (): VoltageResult => {
    const v = parseFloat(voltage);
    const f = parseFloat(frequency);
    const i = parseFloat(current);
    
    if (isNaN(v) || isNaN(f)) {
      return { recommendations: ['Please enter voltage and frequency values'] };
    }

    const vPeak = v * Math.sqrt(2); // Peak voltage
    const vRMS = v; // RMS voltage (input assumed to be RMS)
    const period = 1 / f; // Period in seconds
    const angularFreq = 2 * Math.PI * f; // Angular frequency
    
    let phaseFactor = 1;
    if (phase === 'three') {
      phaseFactor = Math.sqrt(3);
    }
    
    const lineCurrent = i || 0;
    const phaseCurrent = phase === 'three' ? lineCurrent / phaseFactor : lineCurrent;
    
    return {
      result: vPeak,
      unit: 'V (peak)',
      calculations: {
        'RMS Voltage': vRMS,
        'Peak Voltage': vPeak,
        'Frequency': f,
        'Period': period * 1000, // in milliseconds
        'Angular Frequency': angularFreq,
        ...(phase === 'three' && {
          'Line Voltage': v,
          'Phase Voltage': v / phaseFactor,
          'Phase Factor': phaseFactor
        })
      },
      recommendations: [
        `AC ${phase}-phase system`,
        `Peak voltage is √2 × RMS = ${vPeak.toFixed(1)}V`,
        f === 50 ? 'European standard frequency' : f === 60 ? 'North American standard frequency' : 'Non-standard frequency',
        phase === 'three' ? 'Three-phase provides more efficient power transmission' : 'Single-phase system'
      ]
    };
  };

  const calculateVoltageDrop = (): VoltageResult => {
    const v = parseFloat(voltage);
    const i = parseFloat(current);
    const r = parseFloat(resistance);
    
    if (isNaN(v) || isNaN(i) || isNaN(r)) {
      return { recommendations: ['Please enter voltage, current, and resistance values'] };
    }

    const voltageDrop = i * r;
    const voltageAtLoad = v - voltageDrop;
    const dropPercentage = (voltageDrop / v) * 100;
    const powerLoss = Math.pow(i, 2) * r;
    
    return {
      result: voltageDrop,
      unit: 'V',
      calculations: {
        'Source Voltage': v,
        'Current': i,
        'Conductor Resistance': r,
        'Voltage Drop': voltageDrop,
        'Voltage at Load': voltageAtLoad,
        'Drop Percentage': dropPercentage,
        'Power Loss': powerLoss
      },
      recommendations: [
        `Voltage drop: ${voltageDrop.toFixed(2)}V (${dropPercentage.toFixed(1)}%)`,
        dropPercentage > 5 ? 'Excessive voltage drop - consider larger conductors' : 'Acceptable voltage drop',
        dropPercentage > 3 ? 'May cause equipment malfunction' : 'Within acceptable limits',
        `Power loss in conductors: ${powerLoss.toFixed(2)}W`
      ]
    };
  };

  const resetCalculator = () => {
    setVoltage('');
    setCurrent('');
    setResistance('');
    setPower('');
    setFrequency('');
    setResult(null);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Voltage & Electrical Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ohms" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ohms">Ohm's Law</TabsTrigger>
            <TabsTrigger value="power">Power</TabsTrigger>
            <TabsTrigger value="ac">AC Properties</TabsTrigger>
            <TabsTrigger value="drop">Voltage Drop</TabsTrigger>
          </TabsList>

          {/* Common Controls */}
          <div className="grid grid-cols-2 gap-4 mt-4 mb-6">
            <div>
              <Label htmlFor="currentType">Current Type</Label>
              <Select value={currentType} onValueChange={setCurrentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dc">DC (Direct Current)</SelectItem>
                  <SelectItem value="ac">AC (Alternating Current)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {currentType === 'ac' && (
              <div>
                <Label htmlFor="phase">Phase Configuration</Label>
                <Select value={phase} onValueChange={setPhase}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Phase</SelectItem>
                    <SelectItem value="three">Three Phase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <TabsContent value="ohms" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="voltage">Voltage (V)</Label>
                <Input
                  id="voltage"
                  type="number"
                  step="0.1"
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                  placeholder="Enter voltage"
                />
              </div>
              <div>
                <Label htmlFor="current">Current (A)</Label>
                <Input
                  id="current"
                  type="number"
                  step="0.1"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Enter current"
                />
              </div>
              <div>
                <Label htmlFor="resistance">Resistance (Ω)</Label>
                <Input
                  id="resistance"
                  type="number"
                  step="0.1"
                  value={resistance}
                  onChange={(e) => setResistance(e.target.value)}
                  placeholder="Enter resistance"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter any two values to calculate the third using Ohm's Law
            </p>
            <Button onClick={calculateOhmsLaw} className="w-full">Calculate Missing Value</Button>
          </TabsContent>

          <TabsContent value="power" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="voltage">Voltage (V)</Label>
                <Input
                  id="voltage"
                  type="number"
                  step="0.1"
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                  placeholder="Enter voltage"
                />
              </div>
              <div>
                <Label htmlFor="current">Current (A)</Label>
                <Input
                  id="current"
                  type="number"
                  step="0.1"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Enter current"
                />
              </div>
            </div>
            <Button onClick={calculatePower} className="w-full">Calculate Power</Button>
          </TabsContent>

          <TabsContent value="ac" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="voltage">RMS Voltage (V)</Label>
                <Input
                  id="voltage"
                  type="number"
                  step="0.1"
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                  placeholder="Enter RMS voltage"
                />
              </div>
              <div>
                <Label htmlFor="frequency">Frequency (Hz)</Label>
                <Input
                  id="frequency"
                  type="number"
                  step="0.1"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="Enter frequency"
                />
              </div>
              <div>
                <Label htmlFor="current">Current (A)</Label>
                <Input
                  id="current"
                  type="number"
                  step="0.1"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Optional current"
                />
              </div>
            </div>
            <Button onClick={calculateACProperties} className="w-full">Calculate AC Properties</Button>
          </TabsContent>

          <TabsContent value="drop" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="voltage">Source Voltage (V)</Label>
                <Input
                  id="voltage"
                  type="number"
                  step="0.1"
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                  placeholder="Enter source voltage"
                />
              </div>
              <div>
                <Label htmlFor="current">Load Current (A)</Label>
                <Input
                  id="current"
                  type="number"
                  step="0.1"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Enter load current"
                />
              </div>
              <div>
                <Label htmlFor="resistance">Conductor Resistance (Ω)</Label>
                <Input
                  id="resistance"
                  type="number"
                  step="0.001"
                  value={resistance}
                  onChange={(e) => setResistance(e.target.value)}
                  placeholder="Enter conductor resistance"
                />
              </div>
            </div>
            <Button onClick={calculateVoltageDrop} className="w-full">Calculate Voltage Drop</Button>
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
                      {result.result.toFixed(3)} {result.unit}
                    </div>
                  </div>
                )}

                {result.calculations && (
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(result.calculations).map(([key, value]) => (
                      <div key={key} className="text-center p-2 bg-background rounded">
                        <div className="font-semibold text-sm">{key}</div>
                        <div className="text-muted-foreground">
                          {typeof value === 'number' ? value.toFixed(3) : value}
                          {key.includes('Voltage') ? 'V' : 
                           key.includes('Current') ? 'A' : 
                           key.includes('Resistance') ? 'Ω' : 
                           key.includes('Power') ? 'W' : 
                           key.includes('Frequency') ? 'Hz' : 
                           key.includes('Period') ? 'ms' : 
                           key.includes('Percentage') ? '%' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {result.recommendations && (
                  <div>
                    <h4 className="font-semibold mb-2">Analysis & Recommendations:</h4>
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
