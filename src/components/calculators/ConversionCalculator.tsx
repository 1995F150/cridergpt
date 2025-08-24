
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download } from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';

export function ConversionCalculator() {
  const [value, setValue] = useState<string>('');
  const [fromUnit, setFromUnit] = useState<string>('');
  const [toUnit, setToUnit] = useState<string>('');
  const [recipeValue, setRecipeValue] = useState<string>('');
  const [servings, setServings] = useState<string>('');
  const [newServings, setNewServings] = useState<string>('');
  const [results, setResults] = useState<any>(null);

  const lengthUnits = [
    { value: 'mm', label: 'Millimeters' },
    { value: 'cm', label: 'Centimeters' },
    { value: 'm', label: 'Meters' },
    { value: 'km', label: 'Kilometers' },
    { value: 'in', label: 'Inches' },
    { value: 'ft', label: 'Feet' },
    { value: 'yd', label: 'Yards' },
    { value: 'mi', label: 'Miles' }
  ];

  const weightUnits = [
    { value: 'mg', label: 'Milligrams' },
    { value: 'g', label: 'Grams' },
    { value: 'kg', label: 'Kilograms' },
    { value: 'oz', label: 'Ounces' },
    { value: 'lb', label: 'Pounds' },
    { value: 'ton', label: 'Tons' }
  ];

  const volumeUnits = [
    { value: 'ml', label: 'Milliliters' },
    { value: 'l', label: 'Liters' },
    { value: 'fl_oz', label: 'Fluid Ounces' },
    { value: 'cup', label: 'Cups' },
    { value: 'pint', label: 'Pints' },
    { value: 'qt', label: 'Quarts' },
    { value: 'gal', label: 'Gallons' }
  ];

  const temperatureUnits = [
    { value: 'c', label: 'Celsius' },
    { value: 'f', label: 'Fahrenheit' },
    { value: 'k', label: 'Kelvin' }
  ];

  const convertLength = () => {
    const val = parseFloat(value);
    if (!val || !fromUnit || !toUnit) return;

    // Convert to meters first
    const toMeters: { [key: string]: number } = {
      mm: 0.001, cm: 0.01, m: 1, km: 1000,
      in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34
    };

    const meters = val * toMeters[fromUnit];
    const result = meters / toMeters[toUnit];

    setResults({
      originalValue: `${val} ${fromUnit}`,
      convertedValue: `${result.toFixed(6)} ${toUnit}`,
      inMeters: `${meters.toFixed(6)} m`,
      conversionFactor: `1 ${fromUnit} = ${toMeters[fromUnit]} meters`
    });
  };

  const convertWeight = () => {
    const val = parseFloat(value);
    if (!val || !fromUnit || !toUnit) return;

    // Convert to grams first
    const toGrams: { [key: string]: number } = {
      mg: 0.001, g: 1, kg: 1000,
      oz: 28.3495, lb: 453.592, ton: 1000000
    };

    const grams = val * toGrams[fromUnit];
    const result = grams / toGrams[toUnit];

    setResults({
      originalValue: `${val} ${fromUnit}`,
      convertedValue: `${result.toFixed(6)} ${toUnit}`,
      inGrams: `${grams.toFixed(3)} g`,
      inKilograms: `${(grams / 1000).toFixed(6)} kg`
    });
  };

  const convertVolume = () => {
    const val = parseFloat(value);
    if (!val || !fromUnit || !toUnit) return;

    // Convert to milliliters first
    const toMilliliters: { [key: string]: number } = {
      ml: 1, l: 1000,
      fl_oz: 29.5735, cup: 236.588, pint: 473.176, qt: 946.353, gal: 3785.41
    };

    const milliliters = val * toMilliliters[fromUnit];
    const result = milliliters / toMilliliters[toUnit];

    setResults({
      originalValue: `${val} ${fromUnit}`,
      convertedValue: `${result.toFixed(6)} ${toUnit}`,
      inMilliliters: `${milliliters.toFixed(3)} ml`,
      inLiters: `${(milliliters / 1000).toFixed(6)} L`
    });
  };

  const convertTemperature = () => {
    const val = parseFloat(value);
    if (!val || !fromUnit || !toUnit) return;

    let celsius: number;
    
    // Convert to Celsius first
    switch (fromUnit) {
      case 'c': celsius = val; break;
      case 'f': celsius = (val - 32) * 5/9; break;
      case 'k': celsius = val - 273.15; break;
      default: return;
    }

    let result: number;
    switch (toUnit) {
      case 'c': result = celsius; break;
      case 'f': result = celsius * 9/5 + 32; break;
      case 'k': result = celsius + 273.15; break;
      default: return;
    }

    setResults({
      originalValue: `${val}°${fromUnit.toUpperCase()}`,
      convertedValue: `${result.toFixed(2)}°${toUnit.toUpperCase()}`,
      celsius: `${celsius.toFixed(2)}°C`,
      fahrenheit: `${(celsius * 9/5 + 32).toFixed(2)}°F`,
      kelvin: `${(celsius + 273.15).toFixed(2)}K`
    });
  };

  const scaleRecipe = () => {
    const val = parseFloat(recipeValue);
    const current = parseFloat(servings);
    const target = parseFloat(newServings);

    if (val && current && target) {
      const scaleFactor = target / current;
      const scaledValue = val * scaleFactor;

      setResults({
        originalRecipe: `${val} (serves ${current})`,
        scaledRecipe: `${scaledValue.toFixed(3)} (serves ${target})`,
        scaleFactor: `${scaleFactor.toFixed(3)}x`,
        percentage: `${(scaleFactor * 100).toFixed(1)}%`,
        direction: scaleFactor > 1 ? 'Scaling Up' : scaleFactor < 1 ? 'Scaling Down' : 'Same Size'
      });
    }
  };

  const exportResults = () => {
    if (!results) return;

    exportToPDF({
      title: 'Unit Conversion Results',
      module: 'Conversions',
      data: {
        'Original Value': value,
        'From Unit': fromUnit,
        'To Unit': toUnit,
        'Recipe Value': recipeValue || 'N/A',
        'Original Servings': servings || 'N/A',
        'New Servings': newServings || 'N/A'
      },
      calculations: results,
      recommendations: [
        'Always double-check conversions for critical applications',
        'Recipe scaling may require adjustments for seasonings and leavening agents',
        'Temperature conversions are exact, use appropriate precision',
        'Consider rounding to practical values for cooking and construction'
      ]
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Advanced Unit Conversions</CardTitle>
          {results && (
            <Button onClick={exportResults} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="length" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="length">Length</TabsTrigger>
            <TabsTrigger value="weight">Weight</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="temperature">Temperature</TabsTrigger>
            <TabsTrigger value="recipe">Recipe</TabsTrigger>
          </TabsList>

          <TabsContent value="length" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.001"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor="fromUnit">From</Label>
                <Select value={fromUnit} onValueChange={setFromUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {lengthUnits.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="toUnit">To</Label>
                <Select value={toUnit} onValueChange={setToUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {lengthUnits.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={convertLength} className="w-full">Convert Length</Button>
          </TabsContent>

          <TabsContent value="weight" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.001"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor="fromUnit">From</Label>
                <Select value={fromUnit} onValueChange={setFromUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {weightUnits.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="toUnit">To</Label>
                <Select value={toUnit} onValueChange={setToUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {weightUnits.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={convertWeight} className="w-full">Convert Weight</Button>
          </TabsContent>

          <TabsContent value="volume" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.001"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor="fromUnit">From</Label>
                <Select value={fromUnit} onValueChange={setFromUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {volumeUnits.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="toUnit">To</Label>
                <Select value={toUnit} onValueChange={setToUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {volumeUnits.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={convertVolume} className="w-full">Convert Volume</Button>
          </TabsContent>

          <TabsContent value="temperature" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.1"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="25"
                />
              </div>
              <div>
                <Label htmlFor="fromUnit">From</Label>
                <Select value={fromUnit} onValueChange={setFromUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {temperatureUnits.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="toUnit">To</Label>
                <Select value={toUnit} onValueChange={setToUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {temperatureUnits.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={convertTemperature} className="w-full">Convert Temperature</Button>
          </TabsContent>

          <TabsContent value="recipe" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="recipeValue">Ingredient Amount</Label>
                <Input
                  id="recipeValue"
                  type="number"
                  step="0.01"
                  value={recipeValue}
                  onChange={(e) => setRecipeValue(e.target.value)}
                  placeholder="2.5"
                />
              </div>
              <div>
                <Label htmlFor="servings">Current Servings</Label>
                <Input
                  id="servings"
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  placeholder="4"
                />
              </div>
              <div>
                <Label htmlFor="newServings">Desired Servings</Label>
                <Input
                  id="newServings"
                  type="number"
                  value={newServings}
                  onChange={(e) => setNewServings(e.target.value)}
                  placeholder="8"
                />
              </div>
            </div>
            <Button onClick={scaleRecipe} className="w-full">Scale Recipe</Button>
          </TabsContent>

          {results && (
            <Card className="mt-6 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Conversion Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(results).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-2 bg-background rounded">
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="text-muted-foreground font-mono">{value}</span>
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
