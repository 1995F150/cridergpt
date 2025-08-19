
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
    
    // Count how many values are provided
    const providedValues = [!isNaN(v), !isNaN(i), !isNaN(r)].filter(Boolean).length;
    
    if (providedValues !== 2) {
      return { recommendations: ['Please enter exactly two values to calculate the third'] };
    }

    let calculatedValue: number;
    let calculatedUnit: string;
    let calculationType: string;
    
    if (!isNaN(v) && !isNaN(i) && isNaN(r)) {
      // Calculate Resistance: R = V / I
      if (i === 0) {
        return { recommendations: ['Current cannot be zero for resistance calculation'] };
      }
      calculatedValue = v / i;
      calculatedUnit = 'Ω';
      calculationType = 'Resistance';
    } else if (!isNaN(v) && isNaN(i) && !isNaN(r)) {
      // Calculate Current: I = V / R
      if (r === 0) {
        return { recommendations: ['Resistance cannot be zero for current calculation'] };
      }
      calculatedValue = v / r;
      calculatedUnit = 'A';
      calculationType = 'Current';
    } else if (isNaN(v) && !isNaN(i) && !isNaN(r)) {
      // Calculate Voltage: V = I × R
      calculatedValue = i * r;
      calculatedUnit = 'V';
      calculationType = 'Voltage';
    } else {
      return { recommendations: ['Invalid combination of values provided'] };
    }

    // Calculate power with known values
    const finalV = !isNaN(v) ? v : calculatedValue;
    const finalI = !isNaN(i) ? i : (calculationType === 'Current' ? calculatedValue : finalV / r);
    const finalR = !isNaN(r) ? r : calculatedValue;
    const calculatedPower = finalV * finalI;
    
    return {
      result: calculatedValue,
      unit: calculatedUnit,
      calculations: {
        'Voltage (V)': finalV,
        'Current (A)': finalI,
        'Resistance (Ω)': finalR,
        'Power (W)': calculatedPower
      },
      recommendations: [
        `Calculated ${calculationType}: ${calculatedValue.toFixed(4)} ${calculatedUnit}`,
        'Ohm\'s Law: V = I × R',
        'Power = V × I = I²R = V²/R',
        calculatedPower > 1000 ? 'High power - ensure adequate heat dissipation' : '',
        finalV > 50 ? 'Caution: High voltage - follow safety protocols' : '',
        finalI > 10 ? 'High current - verify conductor ratings' : ''
      ].filter(Boolean)
    };
  };

  const calculatePower = (): VoltageResult => {
    const v = parseFloat(voltage);
    const i = parseFloat(current);
    
    if (isNaN(v) || isNaN(i) || v < 0 || i < 0) {
      return { recommendations: ['Please enter valid positive voltage and current values'] };
    }

    const apparentPower = v * i;
    const efficiency = currentType === 'ac' ? 0.85 : 0.95;
    const realPower = apparentPower * efficiency;
    const powerFactor = currentType === 'ac' ? 0.85 : 1.0;
    
    return {
      result: apparentPower,
      unit: 'W',
      calculations: {
        'Voltage (V)': v,
        'Current (A)': i,
        'Apparent Power (VA)': apparentPower,
        'Real Power (W)': realPower,
        'Power Factor': powerFactor,
        'Efficiency (%)': efficiency * 100
      },
      recommendations: [
        `Apparent Power = Voltage × Current = ${apparentPower.toFixed(2)} W`,
        `${currentType.toUpperCase()} efficiency: ${(efficiency * 100).toFixed(1)}%`,
        currentType === 'ac' ? `Power factor assumed: ${powerFactor}` : 'DC power calculation (100% power factor)',
        apparentPower > 1000 ? 'High power - ensure adequate cooling and protection' : 'Standard power range',
        currentType === 'ac' ? 'Consider reactive power for complete AC analysis' : ''
      ].filter(Boolean)
    };
  };

  const calculateACProperties = (): VoltageResult => {
    const v = parseFloat(voltage);
    const f = parseFloat(frequency);
    const i = parseFloat(current);
    
    if (isNaN(v) || isNaN(f) || v < 0 || f <= 0) {
      return { recommendations: ['Please enter valid positive voltage and frequency values'] };
    }

    const vPeak = v * Math.sqrt(2); // Peak voltage from RMS
    const vRMS = v; // Input assumed to be RMS
    const period = 1 / f; // Period in seconds
    const angularFreq = 2 * Math.PI * f; // Angular frequency (ω)
    
    let phaseFactor = 1;
    let lineVoltage = v;
    let phaseVoltage = v;
    
    if (phase === 'three') {
      phaseFactor = Math.sqrt(3);
      phaseVoltage = v / phaseFactor; // Assuming input is line voltage
      lineVoltage = v;
    }
    
    const calculations: { [key: string]: number } = {
      'RMS Voltage (V)': vRMS,
      'Peak Voltage (V)': vPeak,
      'Frequency (Hz)': f,
      'Period (ms)': period * 1000,
      'Angular Frequency (rad/s)': angularFreq
    };

    if (phase === 'three') {
      calculations['Line Voltage (V)'] = lineVoltage;
      calculations['Phase Voltage (V)'] = phaseVoltage;
      calculations['√3 Factor'] = phaseFactor;
    }

    if (!isNaN(i) && i > 0) {
      const lineCurrent = i;
      const phaseCurrent = phase === 'three' ? lineCurrent / phaseFactor : lineCurrent;
      calculations['Line Current (A)'] = lineCurrent;
      if (phase === 'three') {
        calculations['Phase Current (A)'] = phaseCurrent;
      }
    }
    
    return {
      result: vPeak,
      unit: 'V (peak)',
      calculations,
      recommendations: [
        `AC ${phase}-phase system at ${f} Hz`,
        `Peak voltage = √2 × RMS = ${vPeak.toFixed(1)}V`,
        `Period = ${(period * 1000).toFixed(2)} milliseconds`,
        f === 50 ? 'European/International standard (50 Hz)' : f === 60 ? 'North American standard (60 Hz)' : 'Non-standard frequency',
        phase === 'three' ? 'Three-phase provides more efficient power transmission' : 'Single-phase system',
        phase === 'three' ? `Phase voltage = Line voltage ÷ √3 = ${phaseVoltage.toFixed(1)}V` : ''
      ].filter(Boolean)
    };
  };

  const calculateVoltageDrop = (): VoltageResult => {
    const v = parseFloat(voltage);
    const i = parseFloat(current);
    const r = parseFloat(resistance);
    
    if (isNaN(v) || isNaN(i) || isNaN(r) || v <= 0 || i < 0 || r < 0) {
      return { recommendations: ['Please enter valid positive values for source voltage, current, and resistance'] };
    }

    const voltageDrop = i * r;
    const voltageAtLoad = v - voltageDrop;
    const dropPercentage = (voltageDrop / v) * 100;
    const powerLoss = Math.pow(i, 2) * r;
    const efficiency = (voltageAtLoad / v) * 100;
    
    return {
      result: voltageDrop,
      unit: 'V',
      calculations: {
        'Source Voltage (V)': v,
        'Load Current (A)': i,
        'Conductor Resistance (Ω)': r,
        'Voltage Drop (V)': voltageDrop,
        'Voltage at Load (V)': voltageAtLoad,
        'Drop Percentage (%)': dropPercentage,
        'Power Loss (W)': powerLoss,
        'Efficiency (%)': efficiency
      },
      recommendations: [
        `Voltage drop: ${voltageDrop.toFixed(3)}V (${dropPercentage.toFixed(2)}%)`,
        dropPercentage > 5 ? '⚠️ Excessive voltage drop - increase conductor size' : dropPercentage > 3 ? '⚠️ High voltage drop - monitor performance' : '✓ Acceptable voltage drop',
        voltageAtLoad < v * 0.9 ? 'Load voltage may be insufficient for proper operation' : '',
        `Power loss in conductors: ${powerLoss.toFixed(2)}W`,
        `System efficiency: ${efficiency.toFixed(1)}%`,
        dropPercentage > 3 ? 'Consider using larger conductors or higher voltage' : ''
      ].filter(Boolean)
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
        <CardTitle className="text-center">Electrical Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ohms" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ohms">Ohm's Law</TabsTrigger>
            <TabsTrigger value="power">Power</TabsTrigger>
            <TabsTrigger value="ac">AC Analysis</TabsTrigger>
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
                <Label htmlFor="voltage-ohms">Voltage (V)</Label>
                <Input
                  id="voltage-ohms"
                  type="number"
                  step="0.1"
                  min="0"
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                  placeholder="Enter voltage"
                />
              </div>
              <div>
                <Label htmlFor="current-ohms">Current (A)</Label>
                <Input
                  id="current-ohms"
                  type="number"
                  step="0.001"
                  min="0"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Enter current"
                />
              </div>
              <div>
                <Label htmlFor="resistance-ohms">Resistance (Ω)</Label>
                <Input
                  id="resistance-ohms"
                  type="number"
                  step="0.001"
                  min="0"
                  value={resistance}
                  onChange={(e) => setResistance(e.target.value)}
                  placeholder="Enter resistance"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter any two values to calculate the third using Ohm's Law (V = I × R)
            </p>
            <Button onClick={calculateOhmsLaw} className="w-full">Calculate Missing Value</Button>
          </TabsContent>

          <TabsContent value="power" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="voltage-power">Voltage (V)</Label>
                <Input
                  id="voltage-power"
                  type="number"
                  step="0.1"
                  min="0"
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                  placeholder="Enter voltage"
                />
              </div>
              <div>
                <Label htmlFor="current-power">Current (A)</Label>
                <Input
                  id="current-power"
                  type="number"
                  step="0.001"
                  min="0"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Enter current"
                />
              </div>
            </div>
            <Button onClick={calculatePower} className="w-full">Calculate Power & Efficiency</Button>
          </TabsContent>

          <TabsContent value="ac" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="voltage-ac">RMS Voltage (V)</Label>
                <Input
                  id="voltage-ac"
                  type="number"
                  step="0.1"
                  min="0"
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
                  min="0"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="50 or 60"
                />
              </div>
              <div>
                <Label htmlFor="current-ac">Current (A) - Optional</Label>
                <Input
                  id="current-ac"
                  type="number"
                  step="0.001"
                  min="0"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Optional current"
                />
              </div>
            </div>
            <Button onClick={calculateACProperties} className="w-full">Analyze AC Properties</Button>
          </TabsContent>

          <TabsContent value="drop" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="voltage-drop">Source Voltage (V)</Label>
                <Input
                  id="voltage-drop"
                  type="number"
                  step="0.1"
                  min="0"
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                  placeholder="Enter source voltage"
                />
              </div>
              <div>
                <Label htmlFor="current-drop">Load Current (A)</Label>
                <Input
                  id="current-drop"
                  type="number"
                  step="0.001"
                  min="0"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Enter load current"
                />
              </div>
              <div>
                <Label htmlFor="resistance-drop">Wire Resistance (Ω)</Label>
                <Input
                  id="resistance-drop"
                  type="number"
                  step="0.001"
                  min="0"
                  value={resistance}
                  onChange={(e) => setResistance(e.target.value)}
                  placeholder="Total wire resistance"
                />
              </div>
            </div>
            <Button onClick={calculateVoltageDrop} className="w-full">Calculate Voltage Drop</Button>
          </TabsContent>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={resetCalculator} className="w-full">
              Reset All Values
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
                      {result.result.toFixed(4)} {result.unit}
                    </div>
                  </div>
                )}

                {result.calculations && (
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(result.calculations).map(([key, value]) => (
                      <div key={key} className="text-center p-2 bg-background rounded">
                        <div className="font-semibold text-sm">{key}</div>
                        <div className="text-muted-foreground">
                          {value.toFixed(4)}
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
