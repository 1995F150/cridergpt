import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download } from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';

export function ScienceCalculator() {
  const [mass, setMass] = useState<string>('');
  const [molarMass, setMolarMass] = useState<string>('');
  const [volume, setVolume] = useState<string>('');
  const [density, setDensity] = useState<string>('');
  const [concentration, setConcentration] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [results, setResults] = useState<any>(null);

  const calculateMoles = () => {
    const m = parseFloat(mass);
    const mm = parseFloat(molarMass);

    if (m && mm) {
      const moles = m / mm;
      setResults({
        mass: `${m} g`,
        molarMass: `${mm} g/mol`,
        moles: `${moles.toFixed(4)} mol`,
        avogadroNumber: '6.022 × 10²³',
        numberOfMolecules: `${(moles * 6.022e23).toExponential(2)} molecules`
      });
    }
  };

  const calculateMolarity = () => {
    const moles = parseFloat(mass) / parseFloat(molarMass);
    const vol = parseFloat(volume);

    if (moles && vol) {
      const molarity = moles / vol;
      setResults({
        moles: `${moles.toFixed(4)} mol`,
        volume: `${vol} L`,
        molarity: `${molarity.toFixed(3)} M`,
        concentration: `${molarity.toFixed(3)} mol/L`,
        millimolar: `${(molarity * 1000).toFixed(1)} mM`
      });
    }
  };

  const calculateDensity = () => {
    const m = parseFloat(mass);
    const v = parseFloat(volume);

    if (m && v) {
      const d = m / v;
      setResults({
        mass: `${m} g`,
        volume: `${v} mL`,
        density: `${d.toFixed(3)} g/mL`,
        densityKgM3: `${(d * 1000).toFixed(1)} kg/m³`,
        specificGravity: d.toFixed(3)
      });
    }
  };

  const convertTemperature = () => {
    const temp = parseFloat(temperature);
    
    if (!isNaN(temp)) {
      const celsius = temp;
      const fahrenheit = (temp * 9/5) + 32;
      const kelvin = temp + 273.15;
      const rankine = fahrenheit + 459.67;

      setResults({
        celsius: `${celsius}°C`,
        fahrenheit: `${fahrenheit.toFixed(1)}°F`,
        kelvin: `${kelvin.toFixed(1)} K`,
        rankine: `${rankine.toFixed(1)}°R`,
        absoluteZero: '-273.15°C = 0 K'
      });
    }
  };

  const exportResults = () => {
    if (!results) return;

    exportToPDF({
      title: 'Science & Chemistry Calculator Results',
      module: 'Science',
      data: {
        'Mass': mass ? `${mass} g` : 'N/A',
        'Molar Mass': molarMass ? `${molarMass} g/mol` : 'N/A',
        'Volume': volume ? `${volume} L/mL` : 'N/A',
        'Temperature': temperature ? `${temperature}°C` : 'N/A',
        'Concentration': concentration || 'N/A'
      },
      calculations: results,
      recommendations: [
        'Always use proper units when performing calculations',
        'Double-check molecular formulas for accurate molar mass',
        'Temperature conversions are essential for gas law calculations',
        'Molarity is temperature-dependent, consider experimental conditions'
      ]
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Science & Chemistry Calculator</CardTitle>
          {results && (
            <Button onClick={exportResults} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="moles" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="moles">Moles</TabsTrigger>
            <TabsTrigger value="molarity">Molarity</TabsTrigger>
            <TabsTrigger value="density">Density</TabsTrigger>
            <TabsTrigger value="temperature">Temperature</TabsTrigger>
          </TabsList>

          <TabsContent value="moles" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mass">Mass (g)</Label>
                <Input
                  id="mass"
                  type="number"
                  step="0.01"
                  value={mass}
                  onChange={(e) => setMass(e.target.value)}
                  placeholder="18.0"
                />
              </div>
              <div>
                <Label htmlFor="molarMass">Molar Mass (g/mol)</Label>
                <Input
                  id="molarMass"
                  type="number"
                  step="0.01"
                  value={molarMass}
                  onChange={(e) => setMolarMass(e.target.value)}
                  placeholder="18.015"
                />
              </div>
            </div>
            <Button onClick={calculateMoles} className="w-full">
              Calculate Moles & Molecules
            </Button>
          </TabsContent>

          <TabsContent value="molarity" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="mass">Mass (g)</Label>
                <Input
                  id="mass"
                  type="number"
                  step="0.01"
                  value={mass}
                  onChange={(e) => setMass(e.target.value)}
                  placeholder="5.85"
                />
              </div>
              <div>
                <Label htmlFor="molarMass">Molar Mass (g/mol)</Label>
                <Input
                  id="molarMass"
                  type="number"
                  step="0.01"
                  value={molarMass}
                  onChange={(e) => setMolarMass(e.target.value)}
                  placeholder="58.44"
                />
              </div>
              <div>
                <Label htmlFor="volume">Volume (L)</Label>
                <Input
                  id="volume"
                  type="number"
                  step="0.001"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="0.1"
                />
              </div>
            </div>
            <Button onClick={calculateMolarity} className="w-full">
              Calculate Molarity & Concentration
            </Button>
          </TabsContent>

          <TabsContent value="density" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mass">Mass (g)</Label>
                <Input
                  id="mass"
                  type="number"
                  step="0.01"
                  value={mass}
                  onChange={(e) => setMass(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor="volume">Volume (mL)</Label>
                <Input
                  id="volume"
                  type="number"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="100"
                />
              </div>
            </div>
            <Button onClick={calculateDensity} className="w-full">
              Calculate Density & Specific Gravity
            </Button>
          </TabsContent>

          <TabsContent value="temperature" className="space-y-4">
            <div>
              <Label htmlFor="temperature">Temperature (°C)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="25"
              />
            </div>
            <Button onClick={convertTemperature} className="w-full">
              Convert Temperature Units
            </Button>
          </TabsContent>

          {results && (
            <Card className="mt-6 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Scientific Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(results).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-2 bg-background rounded">
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="text-muted-foreground font-mono">{String(value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
