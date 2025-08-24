import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Dice1, Coins } from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';

export function RandomMathCalculator() {
  const [equation, setEquation] = useState<string>('');
  const [minRange, setMinRange] = useState<string>('');
  const [maxRange, setMaxRange] = useState<string>('');
  const [diceCount, setDiceCount] = useState<string>('');
  const [diceSides, setDiceSides] = useState<string>('');
  const [results, setResults] = useState<any>(null);

  const solveEquation = () => {
    try {
      // Basic equation solver (for demonstration - in production, use a proper math parser)
      const cleanEquation = equation.replace(/[^0-9+\-*/().x\s]/g, '');
      
      // Simple linear equation solver (ax + b = c)
      if (cleanEquation.includes('x')) {
        const parts = cleanEquation.split('=');
        if (parts.length === 2) {
          // This is a simplified solver - real implementation would use a proper math library
          setResults({
            equation: equation,
            type: 'Linear Equation',
            solution: 'Use a dedicated math solver for complex equations',
            steps: [
              'Parse the equation',
              'Isolate variables',
              'Solve for x',
              'Verify solution'
            ]
          });
        }
      } else {
        // Simple expression evaluation
        const result = Function(`"use strict"; return (${cleanEquation})`)();
        setResults({
          expression: equation,
          result: result.toString(),
          type: 'Expression Evaluation'
        });
      }
    } catch (error) {
      setResults({
        equation: equation,
        error: 'Invalid equation format',
        suggestion: 'Please enter a valid mathematical expression'
      });
    }
  };

  const generateRandomNumber = () => {
    const min = parseInt(minRange) || 1;
    const max = parseInt(maxRange) || 100;
    
    if (min > max) {
      setResults({
        error: 'Minimum cannot be greater than maximum',
        range: `${min} - ${max}`
      });
      return;
    }

    const randomNumbers = Array.from({length: 10}, () => 
      Math.floor(Math.random() * (max - min + 1)) + min
    );

    setResults({
      range: `${min} - ${max}`,
      singleRandom: randomNumbers[0],
      tenRandomNumbers: randomNumbers.join(', '),
      mean: (randomNumbers.reduce((a, b) => a + b, 0) / randomNumbers.length).toFixed(2),
      min: Math.min(...randomNumbers),
      max: Math.max(...randomNumbers)
    });
  };

  const rollDice = () => {
    const count = parseInt(diceCount) || 1;
    const sides = parseInt(diceSides) || 6;

    if (count > 100 || sides > 100) {
      setResults({
        error: 'Maximum 100 dice with 100 sides each',
        suggestion: 'Use reasonable values for dice simulation'
      });
      return;
    }

    const rolls = Array.from({length: count}, () => 
      Math.floor(Math.random() * sides) + 1
    );

    const sum = rolls.reduce((a, b) => a + b, 0);
    const average = sum / count;
    
    // Calculate probabilities for common outcomes
    const minSum = count;
    const maxSum = count * sides;

    setResults({
      diceConfiguration: `${count}d${sides}`,
      individualRolls: rolls.join(', '),
      totalSum: sum,
      average: average.toFixed(2),
      minimumPossible: minSum,
      maximumPossible: maxSum,
      probability: `${((1 / Math.pow(sides, count)) * 100).toFixed(4)}% for any specific combination`
    });
  };

  const flipCoins = () => {
    const flips = Array.from({length: 20}, () => 
      Math.random() < 0.5 ? 'Heads' : 'Tails'
    );

    const headsCount = flips.filter(flip => flip === 'Heads').length;
    const tailsCount = flips.length - headsCount;

    setResults({
      totalFlips: flips.length,
      results: flips.join(', '),
      headsCount,
      tailsCount,
      headsPercentage: `${((headsCount / flips.length) * 100).toFixed(1)}%`,
      tailsPercentage: `${((tailsCount / flips.length) * 100).toFixed(1)}%`,
      expectedProbability: '50% each for fair coin'
    });
  };

  const exportResults = () => {
    if (!results) return;

    exportToPDF({
      title: 'Random Math Tools Results',
      module: 'RandomMath',
      data: {
        'Equation': equation || 'N/A',
        'Number Range': `${minRange || 1} - ${maxRange || 100}`,
        'Dice Configuration': `${diceCount || 1}d${diceSides || 6}`,
        'Generated At': new Date().toLocaleString()
      },
      calculations: results,
      recommendations: [
        'Random numbers are pseudorandom for computational purposes',
        'Use appropriate ranges for your specific needs',
        'Dice probabilities assume fair dice',
        'Statistical outcomes approach theoretical probabilities with larger samples'
      ]
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Random Math Tools</CardTitle>
          {results && (
            <Button onClick={exportResults} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="equation" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="equation">Equation Solver</TabsTrigger>
            <TabsTrigger value="random">Random Numbers</TabsTrigger>
            <TabsTrigger value="dice">Dice Roller</TabsTrigger>
            <TabsTrigger value="coins">Coin Flip</TabsTrigger>
          </TabsList>

          <TabsContent value="equation" className="space-y-4">
            <div>
              <Label htmlFor="equation">Mathematical Expression</Label>
              <Input
                id="equation"
                value={equation}
                onChange={(e) => setEquation(e.target.value)}
                placeholder="2 + 3 * 4 or 2x + 5 = 11"
              />
            </div>
            <Button onClick={solveEquation} className="w-full">
              Solve Equation
            </Button>
          </TabsContent>

          <TabsContent value="random" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minRange">Minimum Value</Label>
                <Input
                  id="minRange"
                  type="number"
                  value={minRange}
                  onChange={(e) => setMinRange(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor="maxRange">Maximum Value</Label>
                <Input
                  id="maxRange"
                  type="number"
                  value={maxRange}
                  onChange={(e) => setMaxRange(e.target.value)}
                  placeholder="100"
                />
              </div>
            </div>
            <Button onClick={generateRandomNumber} className="w-full">
              Generate Random Numbers
            </Button>
          </TabsContent>

          <TabsContent value="dice" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="diceCount">Number of Dice</Label>
                <Input
                  id="diceCount"
                  type="number"
                  value={diceCount}
                  onChange={(e) => setDiceCount(e.target.value)}
                  placeholder="2"
                />
              </div>
              <div>
                <Label htmlFor="diceSides">Sides per Die</Label>
                <Input
                  id="diceSides"
                  type="number"
                  value={diceSides}
                  onChange={(e) => setDiceSides(e.target.value)}
                  placeholder="6"
                />
              </div>
            </div>
            <Button onClick={rollDice} className="w-full">
              <Dice1 className="w-4 h-4 mr-2" />
              Roll Dice
            </Button>
          </TabsContent>

          <TabsContent value="coins" className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-muted-foreground mb-4">
                Simulate 20 coin flips and analyze the results
              </p>
              <Button onClick={flipCoins} className="w-full">
                <Coins className="w-4 h-4 mr-2" />
                Flip 20 Coins
              </Button>
            </div>
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
