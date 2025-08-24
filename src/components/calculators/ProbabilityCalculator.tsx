import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download } from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';

export function ProbabilityCalculator() {
  const [data, setData] = useState<string>('');
  const [n, setN] = useState<string>('');
  const [r, setR] = useState<string>('');
  const [results, setResults] = useState<any>(null);

  const calculateStatistics = () => {
    const numbers = data.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
    
    if (numbers.length === 0) return;

    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    const median = sortedNumbers.length % 2 === 0
      ? (sortedNumbers[sortedNumbers.length / 2 - 1] + sortedNumbers[sortedNumbers.length / 2]) / 2
      : sortedNumbers[Math.floor(sortedNumbers.length / 2)];

    const frequency: { [key: number]: number } = {};
    numbers.forEach(n => frequency[n] = (frequency[n] || 0) + 1);
    const maxFreq = Math.max(...Object.values(frequency));
    const mode = Object.keys(frequency).filter(k => frequency[Number(k)] === maxFreq).map(Number);

    const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
    const stdDev = Math.sqrt(variance);

    setResults({
      mean: mean.toFixed(2),
      median: median.toFixed(2),
      mode: mode.join(', '),
      standardDeviation: stdDev.toFixed(2),
      variance: variance.toFixed(2),
      count: numbers.length,
      min: Math.min(...numbers),
      max: Math.max(...numbers)
    });
  };

  const calculateCombinations = () => {
    const nVal = parseInt(n);
    const rVal = parseInt(r);
    
    if (nVal > 0 && rVal >= 0 && rVal <= nVal) {
      const factorial = (num: number): number => num <= 1 ? 1 : num * factorial(num - 1);
      
      const combinations = factorial(nVal) / (factorial(rVal) * factorial(nVal - rVal));
      const permutations = factorial(nVal) / factorial(nVal - rVal);
      
      setResults({
        combinations: combinations.toLocaleString(),
        permutations: permutations.toLocaleString(),
        probability: `1 in ${combinations.toLocaleString()}`
      });
    }
  };

  const exportResults = () => {
    if (!results) return;

    exportToPDF({
      title: 'Probability & Statistics Calculator Results',
      module: 'Probability',
      data: {
        'Input Data': data || `n=${n}, r=${r}`,
        'Calculation Type': data ? 'Statistical Analysis' : 'Combinations/Permutations'
      },
      calculations: results,
      recommendations: [
        'Statistical analysis helps understand data distribution and trends',
        'Use combinations for selection problems where order doesn\'t matter',
        'Use permutations for arrangement problems where order matters',
        'Standard deviation indicates how spread out your data is'
      ]
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Probability & Statistics Calculator</CardTitle>
          {results && (
            <Button onClick={exportResults} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="statistics" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="combinations">Combinations</TabsTrigger>
          </TabsList>

          <TabsContent value="statistics" className="space-y-4">
            <div>
              <Label htmlFor="data">Data (comma-separated numbers)</Label>
              <Input
                id="data"
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="1, 2, 3, 4, 5, 6, 7, 8, 9, 10"
              />
            </div>
            <Button onClick={calculateStatistics} className="w-full">
              Calculate Statistics
            </Button>
          </TabsContent>

          <TabsContent value="combinations" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="n">Total Items (n)</Label>
                <Input
                  id="n"
                  type="number"
                  value={n}
                  onChange={(e) => setN(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div>
                <Label htmlFor="r">Items to Choose (r)</Label>
                <Input
                  id="r"
                  type="number"
                  value={r}
                  onChange={(e) => setR(e.target.value)}
                  placeholder="3"
                />
              </div>
            </div>
            <Button onClick={calculateCombinations} className="w-full">
              Calculate Combinations & Permutations
            </Button>
          </TabsContent>

          {results && (
            <Card className="mt-6 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(results).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-2 bg-background rounded">
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="text-muted-foreground">{String(value)}</span>
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
