
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WeldingResult {
  amperage?: number;
  voltage?: number;
  wireSpeed?: number;
  gasFlow?: number;
  travelSpeed?: number;
  heatInput?: number;
  recommendations?: string[];
}

export function WeldingCalculator() {
  const [weldingType, setWeldingType] = useState<string>('mig');
  const [materialThickness, setMaterialThickness] = useState<string>('');
  const [materialType, setMaterialType] = useState<string>('steel');
  const [currentType, setCurrentType] = useState<string>('dc');
  const [voltage, setVoltage] = useState<string>('');
  const [amperage, setAmperage] = useState<string>('');
  const [result, setResult] = useState<WeldingResult | null>(null);

  const calculateMIG = (): WeldingResult => {
    const thickness = parseFloat(materialThickness);
    const baseAmperage = thickness * 40; // Rule of thumb: 40A per mm of steel
    
    let adjustedAmperage = baseAmperage;
    let voltage = 18 + (baseAmperage - 80) * 0.04; // Start at 18V for 80A
    
    // Material adjustments
    if (materialType === 'aluminum') {
      adjustedAmperage *= 1.2;
      voltage += 2;
    } else if (materialType === 'stainless') {
      adjustedAmperage *= 0.9;
      voltage -= 1;
    }

    const wireSpeed = adjustedAmperage * 2.5; // Inches per minute
    const gasFlow = Math.max(15, Math.min(25, thickness * 8)); // CFH
    const travelSpeed = Math.max(5, 15 - thickness * 2); // IPM
    const heatInput = (voltage * adjustedAmperage * 60) / travelSpeed; // Joules per inch

    const recommendations = [
      `Use ${currentType.toUpperCase()} current`,
      `Wire diameter: ${thickness <= 3 ? '0.030"' : thickness <= 6 ? '0.035"' : '0.045"'}`,
      `Joint prep: ${thickness > 6 ? 'Bevel edges' : 'Square butt or fillet'}`,
      materialType === 'aluminum' ? 'Use push technique' : 'Use push or pull technique'
    ];

    return {
      amperage: Math.round(adjustedAmperage),
      voltage: Math.round(voltage * 10) / 10,
      wireSpeed: Math.round(wireSpeed),
      gasFlow: Math.round(gasFlow),
      travelSpeed: Math.round(travelSpeed),
      heatInput: Math.round(heatInput),
      recommendations
    };
  };

  const calculateTIG = (): WeldingResult => {
    const thickness = parseFloat(materialThickness);
    let baseAmperage = thickness * 35; // TIG typically uses less current than MIG
    
    // AC/DC adjustments
    if (currentType === 'ac') {
      if (materialType === 'aluminum') {
        baseAmperage = thickness * 25; // AC for aluminum
      } else {
        baseAmperage *= 0.8; // AC typically uses less current
      }
    }

    const voltage = currentType === 'ac' ? 12 + baseAmperage * 0.02 : 10 + baseAmperage * 0.015;
    const gasFlow = Math.max(8, Math.min(20, thickness * 5)); // CFH - less than MIG
    const travelSpeed = Math.max(3, 10 - thickness * 1.5); // IPM - slower than MIG
    const heatInput = (voltage * baseAmperage * 60) / travelSpeed;

    const recommendations = [
      `Use ${currentType.toUpperCase()} current`,
      materialType === 'aluminum' ? 'Use AC for aluminum' : 'Use DC for steel/stainless',
      `Tungsten: ${materialType === 'aluminum' ? 'Pure or Zirconated' : '2% Thoriated or Lanthanated'}`,
      `Filler rod: ${thickness <= 2 ? '1/16"' : thickness <= 4 ? '3/32"' : '1/8"'}`,
      'Maintain tight arc length (1/8" or less)'
    ];

    return {
      amperage: Math.round(baseAmperage),
      voltage: Math.round(voltage * 10) / 10,
      gasFlow: Math.round(gasFlow),
      travelSpeed: Math.round(travelSpeed),
      heatInput: Math.round(heatInput),
      recommendations
    };
  };

  const calculateStick = (): WeldingResult => {
    const thickness = parseFloat(materialThickness);
    const baseAmperage = thickness * 30 + 20; // Stick welding formula
    
    // Current type affects electrode selection more than amperage
    const voltage = 20 + baseAmperage * 0.04; // Open circuit voltage
    const travelSpeed = Math.max(4, 8 - thickness * 0.5); // IPM
    const heatInput = (25 * baseAmperage * 60) / travelSpeed; // Use arc voltage ~25V

    const recommendations = [
      `Use ${currentType.toUpperCase()} current`,
      `Electrode: ${thickness <= 3 ? '1/8"' : thickness <= 6 ? '5/32"' : '3/16"'}`,
      currentType === 'ac' ? 'Good for general purpose, less penetration' : 'Better penetration and control',
      `Rod type: ${materialType === 'steel' ? '7018 or 6013' : materialType === 'stainless' ? '308L or 316L' : 'Specialized rod required'}`,
      'Maintain proper arc length (rod diameter distance)'
    ];

    return {
      amperage: Math.round(baseAmperage),
      voltage: Math.round(voltage * 10) / 10,
      travelSpeed: Math.round(travelSpeed),
      heatInput: Math.round(heatInput),
      recommendations
    };
  };

  const calculateVoltageAmperage = (): WeldingResult => {
    const inputVoltage = parseFloat(voltage);
    const inputAmperage = parseFloat(amperage);
    
    if (inputVoltage && !inputAmperage) {
      // Calculate amperage from voltage
      const calculatedAmperage = currentType === 'ac' ? 
        (inputVoltage - 10) / 0.04 : 
        (inputVoltage - 8) / 0.035;
      
      return {
        amperage: Math.round(calculatedAmperage),
        voltage: inputVoltage,
        recommendations: [
          `Power: ${Math.round(inputVoltage * calculatedAmperage)} watts`,
          `${currentType.toUpperCase()} characteristics applied`,
          'Voltage-amperage relationship calculated'
        ]
      };
    } else if (inputAmperage && !inputVoltage) {
      // Calculate voltage from amperage
      const calculatedVoltage = currentType === 'ac' ? 
        10 + inputAmperage * 0.04 : 
        8 + inputAmperage * 0.035;
      
      return {
        amperage: inputAmperage,
        voltage: Math.round(calculatedVoltage * 10) / 10,
        recommendations: [
          `Power: ${Math.round(calculatedVoltage * inputAmperage)} watts`,
          `${currentType.toUpperCase()} characteristics applied`,
          'Voltage-amperage relationship calculated'
        ]
      };
    } else if (inputVoltage && inputAmperage) {
      const power = inputVoltage * inputAmperage;
      return {
        amperage: inputAmperage,
        voltage: inputVoltage,
        recommendations: [
          `Power: ${Math.round(power)} watts`,
          `Efficiency: ${currentType === 'dc' ? '85-90%' : '75-80%'}`,
          `${currentType.toUpperCase()} current type`,
          power > 5000 ? 'High power - ensure adequate cooling' : 'Standard power range'
        ]
      };
    }

    return { recommendations: ['Please enter voltage or amperage values'] };
  };

  const handleCalculate = () => {
    let calculationResult: WeldingResult;
    
    switch (weldingType) {
      case 'mig':
        calculationResult = calculateMIG();
        break;
      case 'tig':
        calculationResult = calculateTIG();
        break;
      case 'stick':
        calculationResult = calculateStick();
        break;
      case 'voltage':
        calculationResult = calculateVoltageAmperage();
        break;
      default:
        calculationResult = { recommendations: ['Select a welding type'] };
    }
    
    setResult(calculationResult);
  };

  const resetCalculator = () => {
    setMaterialThickness('');
    setVoltage('');
    setAmperage('');
    setResult(null);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Professional Welding Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={weldingType} onValueChange={setWeldingType} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mig">MIG/GMAW</TabsTrigger>
            <TabsTrigger value="tig">TIG/GTAW</TabsTrigger>
            <TabsTrigger value="stick">Stick/SMAW</TabsTrigger>
            <TabsTrigger value="voltage">Voltage/Current</TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            {/* Common Controls */}
            <div className="grid grid-cols-2 gap-4">
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
              
              {weldingType !== 'voltage' && (
                <div>
                  <Label htmlFor="materialType">Material Type</Label>
                  <Select value={materialType} onValueChange={setMaterialType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="steel">Carbon Steel</SelectItem>
                      <SelectItem value="stainless">Stainless Steel</SelectItem>
                      <SelectItem value="aluminum">Aluminum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <TabsContent value="mig" className="space-y-4">
              <div>
                <Label htmlFor="thickness">Material Thickness (mm)</Label>
                <Input
                  id="thickness"
                  type="number"
                  step="0.1"
                  value={materialThickness}
                  onChange={(e) => setMaterialThickness(e.target.value)}
                  placeholder="Enter thickness in mm"
                />
              </div>
            </TabsContent>

            <TabsContent value="tig" className="space-y-4">
              <div>
                <Label htmlFor="thickness">Material Thickness (mm)</Label>
                <Input
                  id="thickness"
                  type="number"
                  step="0.1"
                  value={materialThickness}
                  onChange={(e) => setMaterialThickness(e.target.value)}
                  placeholder="Enter thickness in mm"
                />
              </div>
            </TabsContent>

            <TabsContent value="stick" className="space-y-4">
              <div>
                <Label htmlFor="thickness">Material Thickness (mm)</Label>
                <Input
                  id="thickness"
                  type="number"
                  step="0.1"
                  value={materialThickness}
                  onChange={(e) => setMaterialThickness(e.target.value)}
                  placeholder="Enter thickness in mm"
                />
              </div>
            </TabsContent>

            <TabsContent value="voltage" className="space-y-4">
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
                  <Label htmlFor="amperage">Amperage (A)</Label>
                  <Input
                    id="amperage"
                    type="number"
                    step="1"
                    value={amperage}
                    onChange={(e) => setAmperage(e.target.value)}
                    placeholder="Enter amperage"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter either voltage or amperage (or both) to calculate the relationship
              </p>
            </TabsContent>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleCalculate} className="flex-1">
                Calculate Parameters
              </Button>
              <Button variant="outline" onClick={resetCalculator}>
                Reset
              </Button>
            </div>

            {/* Results Display */}
            {result && (
              <Card className="mt-6 bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Welding Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {result.amperage && (
                      <div className="text-center p-3 bg-background rounded-lg">
                        <div className="text-2xl font-bold text-primary">{result.amperage}A</div>
                        <div className="text-sm text-muted-foreground">Amperage</div>
                      </div>
                    )}
                    {result.voltage && (
                      <div className="text-center p-3 bg-background rounded-lg">
                        <div className="text-2xl font-bold text-primary">{result.voltage}V</div>
                        <div className="text-sm text-muted-foreground">Voltage</div>
                      </div>
                    )}
                    {result.wireSpeed && (
                      <div className="text-center p-3 bg-background rounded-lg">
                        <div className="text-2xl font-bold text-primary">{result.wireSpeed}</div>
                        <div className="text-sm text-muted-foreground">Wire Speed (IPM)</div>
                      </div>
                    )}
                    {result.gasFlow && (
                      <div className="text-center p-3 bg-background rounded-lg">
                        <div className="text-2xl font-bold text-primary">{result.gasFlow}</div>
                        <div className="text-sm text-muted-foreground">Gas Flow (CFH)</div>
                      </div>
                    )}
                    {result.travelSpeed && (
                      <div className="text-center p-3 bg-background rounded-lg">
                        <div className="text-2xl font-bold text-primary">{result.travelSpeed}</div>
                        <div className="text-sm text-muted-foreground">Travel Speed (IPM)</div>
                      </div>
                    )}
                    {result.heatInput && (
                      <div className="text-center p-3 bg-background rounded-lg">
                        <div className="text-2xl font-bold text-primary">{result.heatInput}</div>
                        <div className="text-sm text-muted-foreground">Heat Input (J/in)</div>
                      </div>
                    )}
                  </div>

                  {result.recommendations && result.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations:</h4>
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
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
