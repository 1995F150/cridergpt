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
    
    if (isNaN(thickness) || thickness <= 0) {
      return { recommendations: ['Please enter a valid positive thickness value'] };
    }

    // Base calculation: 40A per mm for steel
    let baseAmperage = thickness * 40;
    let voltage = 18 + (baseAmperage - 80) * 0.04;
    
    // Ensure minimum values
    if (baseAmperage < 80) {
      baseAmperage = 80;
      voltage = 18;
    }
    
    // Material adjustments
    let adjustedAmperage = baseAmperage;
    if (materialType === 'aluminum') {
      adjustedAmperage = baseAmperage * 1.25; // Aluminum needs more current
      voltage += 2; // Higher voltage for aluminum
    } else if (materialType === 'stainless') {
      adjustedAmperage = baseAmperage * 0.95; // Slightly less for stainless
      voltage -= 0.5; // Slightly lower voltage
    }

    // Wire speed calculation (IPM - Inches Per Minute)
    const wireSpeed = Math.max(150, adjustedAmperage * 2.2);
    
    // Gas flow calculation (CFH - Cubic Feet per Hour)
    const gasFlow = Math.max(15, Math.min(35, thickness * 8 + 10));
    
    // Travel speed (IPM)
    const travelSpeed = Math.max(8, 18 - thickness * 1.5);
    
    // Heat input calculation (Joules per inch)
    const heatInput = (voltage * adjustedAmperage * 60) / (travelSpeed * 1000);

    const recommendations = [
      `Use ${currentType.toUpperCase()} current with ${currentType === 'dc' ? 'electrode positive' : 'standard polarity'}`,
      `Wire diameter: ${thickness <= 2 ? '0.030"' : thickness <= 4 ? '0.035"' : thickness <= 8 ? '0.045"' : '1/16"'} recommended`,
      `Joint preparation: ${thickness > 6 ? 'Bevel edges for full penetration' : thickness > 3 ? 'Square butt or fillet joint' : 'No prep needed for thin material'}`,
      materialType === 'aluminum' ? 'Use push technique and aluminum-specific wire' : 'Push or pull technique acceptable',
      `Gas: ${materialType === 'aluminum' ? '100% Argon' : materialType === 'stainless' ? 'Tri-mix (Ar/He/CO2)' : '75/25 Argon/CO2'}`,
      heatInput > 2.5 ? 'High heat input - consider preheating and interpass temperature control' : 'Standard heat input range'
    ];

    return {
      amperage: Math.round(adjustedAmperage),
      voltage: Math.round(voltage * 10) / 10,
      wireSpeed: Math.round(wireSpeed),
      gasFlow: Math.round(gasFlow),
      travelSpeed: Math.round(travelSpeed * 10) / 10,
      heatInput: Math.round(heatInput * 1000) / 1000,
      recommendations
    };
  };

  const calculateTIG = (): WeldingResult => {
    const thickness = parseFloat(materialThickness);
    
    if (isNaN(thickness) || thickness <= 0) {
      return { recommendations: ['Please enter a valid positive thickness value'] };
    }

    // Base amperage for TIG (typically lower than MIG)
    let baseAmperage = thickness * 35;
    
    // Current type and material adjustments
    if (materialType === 'aluminum') {
      if (currentType === 'ac') {
        baseAmperage = thickness * 25; // AC for aluminum
      } else {
        baseAmperage = thickness * 30; // DC can work but AC preferred
      }
    } else if (materialType === 'stainless') {
      baseAmperage = thickness * 30; // Stainless needs careful heat control
    }

    // Voltage calculation
    const voltage = currentType === 'ac' ? 
      12 + baseAmperage * 0.025 : 
      10 + baseAmperage * 0.02;

    // Gas flow (Argon typically)
    const gasFlow = Math.max(8, Math.min(25, thickness * 4 + 5));
    
    // Travel speed (slower than MIG)
    const travelSpeed = Math.max(3, 12 - thickness * 1.8);
    
    // Heat input
    const heatInput = (voltage * baseAmperage * 60) / (travelSpeed * 1000);

    const recommendations = [
      `Use ${currentType.toUpperCase()} current`,
      materialType === 'aluminum' ? 'AC current recommended for aluminum (cleaning action)' : 'DC electrode negative (DCEN) for steel/stainless',
      `Tungsten electrode: ${materialType === 'aluminum' ? 'Pure tungsten or AC-specific (green/red tip)' : currentType === 'dc' ? '2% Thoriated (red) or Lanthanated (blue)' : 'AC tungsten'}`,
      `Tungsten diameter: ${thickness <= 1.5 ? '1/16"' : thickness <= 3 ? '3/32"' : thickness <= 6 ? '1/8"' : '5/32"'}`,
      `Filler rod: ${thickness <= 1 ? '1/16"' : thickness <= 3 ? '3/32"' : '1/8"'} diameter`,
      'Maintain tight arc length (tungsten diameter distance)',
      `Gas: ${materialType === 'aluminum' ? '100% Argon' : materialType === 'stainless' ? '100% Argon' : '100% Argon or Argon/Hydrogen mix'}`,
      heatInput > 1.5 ? 'Monitor heat buildup - use backing bars or heat sinks' : 'Good heat input for penetration'
    ];

    return {
      amperage: Math.round(baseAmperage),
      voltage: Math.round(voltage * 10) / 10,
      gasFlow: Math.round(gasFlow),
      travelSpeed: Math.round(travelSpeed * 10) / 10,
      heatInput: Math.round(heatInput * 1000) / 1000,
      recommendations
    };
  };

  const calculateStick = (): WeldingResult => {
    const thickness = parseFloat(materialThickness);
    
    if (isNaN(thickness) || thickness <= 0) {
      return { recommendations: ['Please enter a valid positive thickness value'] };
    }

    // Stick welding amperage rule: 30-50A per mm + base
    const baseAmperage = Math.max(80, thickness * 35 + 15);
    
    // Arc voltage (typically 20-30V depending on electrode)
    const voltage = 22 + baseAmperage * 0.035;
    
    // Travel speed
    const travelSpeed = Math.max(4, 10 - thickness * 0.8);
    
    // Heat input
    const heatInput = (voltage * baseAmperage * 60) / (travelSpeed * 1000);

    // Electrode selection based on thickness
    let electrodeSize = '1/8"';
    if (thickness <= 2) electrodeSize = '5/64"';
    else if (thickness <= 4) electrodeSize = '3/32"';
    else if (thickness <= 8) electrodeSize = '1/8"';
    else electrodeSize = '5/32"';

    const recommendations = [
      `Use ${currentType.toUpperCase()} current`,
      `Electrode size: ${electrodeSize} recommended for ${thickness}mm material`,
      currentType === 'dc' ? 'DCEP (electrode positive) for better penetration' : 'AC suitable for general welding',
      `Electrode type: ${materialType === 'steel' ? 'E7018 (low hydrogen) or E6013 (general purpose)' : materialType === 'stainless' ? 'E308L-16 or E316L-16' : 'Consult electrode manufacturer'}`,
      'Maintain arc length equal to electrode diameter',
      `Root opening: ${thickness > 6 ? '2-3mm with backing' : thickness > 3 ? '1-2mm' : 'Tight fit-up'}`,
      `Preheat: ${thickness > 25 ? '150-200°C recommended' : thickness > 12 ? '100°C may be beneficial' : 'No preheat required'}`,
      heatInput > 2.0 ? 'High heat input - monitor interpass temperature' : 'Acceptable heat input'
    ];

    return {
      amperage: Math.round(baseAmperage),
      voltage: Math.round(voltage * 10) / 10,
      travelSpeed: Math.round(travelSpeed * 10) / 10,
      heatInput: Math.round(heatInput * 1000) / 1000,
      recommendations
    };
  };

  const calculateVoltageAmperage = (): WeldingResult => {
    const inputVoltage = parseFloat(voltage);
    const inputAmperage = parseFloat(amperage);
    
    if (isNaN(inputVoltage) && isNaN(inputAmperage)) {
      return { recommendations: ['Please enter at least one value (voltage or amperage)'] };
    }

    if (!isNaN(inputVoltage) && inputVoltage < 0) {
      return { recommendations: ['Voltage cannot be negative'] };
    }

    if (!isNaN(inputAmperage) && inputAmperage < 0) {
      return { recommendations: ['Amperage cannot be negative'] };
    }
    
    if (!isNaN(inputVoltage) && isNaN(inputAmperage)) {
      // Calculate typical amperage range from voltage
      const minAmperage = currentType === 'ac' ? 
        Math.max(20, (inputVoltage - 15) / 0.04) : 
        Math.max(20, (inputVoltage - 12) / 0.035);
      const maxAmperage = minAmperage * 1.5;
      
      return {
        voltage: inputVoltage,
        amperage: Math.round((minAmperage + maxAmperage) / 2),
        recommendations: [
          `For ${inputVoltage}V, typical amperage range: ${Math.round(minAmperage)}-${Math.round(maxAmperage)}A`,
          `Suggested amperage: ${Math.round((minAmperage + maxAmperage) / 2)}A`,
          `Power range: ${Math.round(inputVoltage * minAmperage)}-${Math.round(inputVoltage * maxAmperage)}W`,
          `${currentType.toUpperCase()} characteristics applied`
        ]
      };
    } else if (isNaN(inputVoltage) && !isNaN(inputAmperage)) {
      // Calculate voltage from amperage
      const calculatedVoltage = currentType === 'ac' ? 
        15 + inputAmperage * 0.04 : 
        12 + inputAmperage * 0.035;
      
      return {
        amperage: inputAmperage,
        voltage: Math.round(calculatedVoltage * 10) / 10,
        recommendations: [
          `For ${inputAmperage}A, calculated voltage: ${calculatedVoltage.toFixed(1)}V`,
          `Power: ${Math.round(calculatedVoltage * inputAmperage)}W`,
          `${currentType.toUpperCase()} voltage-current relationship`,
          inputAmperage > 200 ? 'High amperage - ensure adequate machine capacity' : 'Standard amperage range'
        ]
      };
    } else {
      // Both values provided - analyze the combination
      const power = inputVoltage * inputAmperage;
      const efficiency = currentType === 'dc' ? 0.85 : 0.75;
      
      return {
        amperage: inputAmperage,
        voltage: inputVoltage,
        recommendations: [
          `Power: ${Math.round(power)}W`,
          `Estimated arc efficiency: ${(efficiency * 100).toFixed(0)}%`,
          `Actual power to arc: ${Math.round(power * efficiency)}W`,
          power > 8000 ? 'High power - industrial welding application' : power > 3000 ? 'Medium power - suitable for structural work' : 'Light power - suitable for sheet metal',
          `${currentType.toUpperCase()} welding parameters`
        ]
      };
    }
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
        calculationResult = { recommendations: ['Please select a welding type'] };
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
            <TabsTrigger value="voltage">Parameters</TabsTrigger>
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
                <Label htmlFor="thickness-mig">Material Thickness (mm)</Label>
                <Input
                  id="thickness-mig"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="50"
                  value={materialThickness}
                  onChange={(e) => setMaterialThickness(e.target.value)}
                  placeholder="Enter thickness (0.5-50mm)"
                />
              </div>
            </TabsContent>

            <TabsContent value="tig" className="space-y-4">
              <div>
                <Label htmlFor="thickness-tig">Material Thickness (mm)</Label>
                <Input
                  id="thickness-tig"
                  type="number"
                  step="0.1"
                  min="0.2"
                  max="25"
                  value={materialThickness}
                  onChange={(e) => setMaterialThickness(e.target.value)}
                  placeholder="Enter thickness (0.2-25mm)"
                />
              </div>
            </TabsContent>

            <TabsContent value="stick" className="space-y-4">
              <div>
                <Label htmlFor="thickness-stick">Material Thickness (mm)</Label>
                <Input
                  id="thickness-stick"
                  type="number"
                  step="0.5"
                  min="2"
                  max="100"
                  value={materialThickness}
                  onChange={(e) => setMaterialThickness(e.target.value)}
                  placeholder="Enter thickness (2-100mm)"
                />
              </div>
            </TabsContent>

            <TabsContent value="voltage" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="voltage-input">Voltage (V)</Label>
                  <Input
                    id="voltage-input"
                    type="number"
                    step="0.1"
                    min="10"
                    max="50"
                    value={voltage}
                    onChange={(e) => setVoltage(e.target.value)}
                    placeholder="10-50V"
                  />
                </div>
                <div>
                  <Label htmlFor="amperage-input">Amperage (A)</Label>
                  <Input
                    id="amperage-input"
                    type="number"
                    step="1"
                    min="20"
                    max="500"
                    value={amperage}
                    onChange={(e) => setAmperage(e.target.value)}
                    placeholder="20-500A"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter voltage, amperage, or both to analyze welding parameters
              </p>
            </TabsContent>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleCalculate} className="flex-1" disabled={
                (weldingType !== 'voltage' && !materialThickness) || 
                (weldingType === 'voltage' && !voltage && !amperage)
              }>
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
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <div className="text-2xl font-bold text-primary">{result.amperage}A</div>
                        <div className="text-sm text-muted-foreground">Amperage</div>
                      </div>
                    )}
                    {result.voltage && (
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <div className="text-2xl font-bold text-primary">{result.voltage}V</div>
                        <div className="text-sm text-muted-foreground">Voltage</div>
                      </div>
                    )}
                    {result.wireSpeed && (
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <div className="text-2xl font-bold text-primary">{result.wireSpeed}</div>
                        <div className="text-sm text-muted-foreground">Wire Speed (IPM)</div>
                      </div>
                    )}
                    {result.gasFlow && (
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <div className="text-2xl font-bold text-primary">{result.gasFlow}</div>
                        <div className="text-sm text-muted-foreground">Gas Flow (CFH)</div>
                      </div>
                    )}
                    {result.travelSpeed && (
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <div className="text-2xl font-bold text-primary">{result.travelSpeed}</div>
                        <div className="text-sm text-muted-foreground">Travel Speed (IPM)</div>
                      </div>
                    )}
                    {result.heatInput && (
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <div className="text-2xl font-bold text-primary">{result.heatInput}</div>
                        <div className="text-sm text-muted-foreground">Heat Input (kJ/in)</div>
                      </div>
                    )}
                  </div>

                  {result.recommendations && result.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Setup Recommendations:</h4>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start">
                            <span className="mr-2 mt-0.5">•</span>
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
