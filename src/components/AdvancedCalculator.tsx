
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function AdvancedCalculator() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [memory, setMemory] = useState(0);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  const { plan, isActive } = useSubscriptionStatus();
  const hasProAccess = isActive && (plan === 'plus' || plan === 'pro');

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      case '^':
        return Math.pow(firstValue, secondValue);
      case '%':
        return firstValue % secondValue;
      default:
        return secondValue;
    }
  };

  const performFunction = (func: string) => {
    if (!hasProAccess && ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', '^'].includes(func)) {
      setShowUpgradeDialog(true);
      return;
    }

    const value = parseFloat(display);
    let result: number;

    switch (func) {
      case 'sin':
        result = Math.sin(value * Math.PI / 180);
        break;
      case 'cos':
        result = Math.cos(value * Math.PI / 180);
        break;
      case 'tan':
        result = Math.tan(value * Math.PI / 180);
        break;
      case 'log':
        result = Math.log10(value);
        break;
      case 'ln':
        result = Math.log(value);
        break;
      case 'sqrt':
        result = Math.sqrt(value);
        break;
      case '1/x':
        result = 1 / value;
        break;
      case 'x²':
        result = value * value;
        break;
      case '±':
        result = -value;
        break;
      case 'tax':
        // Tax calculation: value * tax rate (assuming 8.25% default)
        result = value * 0.0825;
        break;
      case 'discount':
        // 10% discount
        result = value * 0.10;
        break;
      case 'tip15':
        // 15% tip
        result = value * 0.15;
        break;
      case 'tip20':
        // 20% tip
        result = value * 0.20;
        break;
      case 'compound':
        // Simple compound interest for 1 year at 5%
        result = value * Math.pow(1.05, 1);
        break;
      default:
        return;
    }

    setDisplay(String(result));
    setWaitingForOperand(true);
  };

  const performEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const memoryStore = () => {
    setMemory(parseFloat(display));
  };

  const memoryRecall = () => {
    setDisplay(String(memory));
    setWaitingForOperand(true);
  };

  const memoryClear = () => {
    setMemory(0);
  };

  const memoryAdd = () => {
    setMemory(memory + parseFloat(display));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Advanced Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="scientific">
                Scientific {!hasProAccess && <span className="ml-1">🔒</span>}
              </TabsTrigger>
              <TabsTrigger value="money">Money & Finance</TabsTrigger>
            </TabsList>

            {/* Display */}
            <div className="bg-muted p-4 rounded-lg mb-4 text-right">
              <div className="text-3xl font-mono font-bold overflow-hidden">
                {display}
              </div>
            </div>

            <TabsContent value="basic" className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {/* Row 1 */}
                <Button variant="outline" onClick={clear} className="h-12">C</Button>
                <Button variant="outline" onClick={() => performOperation('%')} className="h-12">%</Button>
                <Button variant="outline" onClick={() => performFunction('±')} className="h-12">±</Button>
                <Button variant="destructive" onClick={() => performOperation('÷')} className="h-12">÷</Button>

                {/* Row 2 */}
                <Button onClick={() => inputNumber('7')} className="h-12">7</Button>
                <Button onClick={() => inputNumber('8')} className="h-12">8</Button>
                <Button onClick={() => inputNumber('9')} className="h-12">9</Button>
                <Button variant="destructive" onClick={() => performOperation('×')} className="h-12">×</Button>

                {/* Row 3 */}
                <Button onClick={() => inputNumber('4')} className="h-12">4</Button>
                <Button onClick={() => inputNumber('5')} className="h-12">5</Button>
                <Button onClick={() => inputNumber('6')} className="h-12">6</Button>
                <Button variant="destructive" onClick={() => performOperation('-')} className="h-12">-</Button>

                {/* Row 4 */}
                <Button onClick={() => inputNumber('1')} className="h-12">1</Button>
                <Button onClick={() => inputNumber('2')} className="h-12">2</Button>
                <Button onClick={() => inputNumber('3')} className="h-12">3</Button>
                <Button variant="destructive" onClick={() => performOperation('+')} className="h-12">+</Button>

                {/* Row 5 */}
                <Button onClick={() => inputNumber('0')} className="h-12 col-span-2">0</Button>
                <Button onClick={inputDecimal} className="h-12">.</Button>
                <Button variant="default" onClick={performEquals} className="h-12 bg-primary">=</Button>
              </div>
            </TabsContent>

            <TabsContent value="scientific" className="space-y-2">
              {!hasProAccess && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    🔒 Scientific functions require Plus or Pro plan. 
                    <Button variant="link" className="p-0 h-auto text-yellow-800 underline" onClick={() => setShowUpgradeDialog(true)}>
                      Upgrade now
                    </Button>
                  </p>
                </div>
              )}

              {/* Memory buttons */}
              <div className="grid grid-cols-4 gap-2 mb-2">
                <Button variant="secondary" onClick={memoryClear} className="h-10 text-xs">MC</Button>
                <Button variant="secondary" onClick={memoryRecall} className="h-10 text-xs">MR</Button>
                <Button variant="secondary" onClick={memoryAdd} className="h-10 text-xs">M+</Button>
                <Button variant="secondary" onClick={memoryStore} className="h-10 text-xs">MS</Button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {/* Row 1 */}
                <Button 
                  variant="outline" 
                  onClick={() => performFunction('sin')} 
                  className="h-10 text-xs"
                  disabled={!hasProAccess}
                >
                  sin
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => performFunction('cos')} 
                  className="h-10 text-xs"
                  disabled={!hasProAccess}
                >
                  cos
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => performFunction('tan')} 
                  className="h-10 text-xs"
                  disabled={!hasProAccess}
                >
                  tan
                </Button>
                <Button variant="outline" onClick={clear} className="h-10">C</Button>
                <Button variant="destructive" onClick={() => performOperation('÷')} className="h-10">÷</Button>

                {/* Row 2 */}
                <Button 
                  variant="outline" 
                  onClick={() => performFunction('log')} 
                  className="h-10 text-xs"
                  disabled={!hasProAccess}
                >
                  log
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => performFunction('ln')} 
                  className="h-10 text-xs"
                  disabled={!hasProAccess}
                >
                  ln
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => performOperation('^')} 
                  className="h-10 text-xs"
                  disabled={!hasProAccess}
                >
                  x^y
                </Button>
                <Button onClick={() => inputNumber('7')} className="h-10">7</Button>
                <Button onClick={() => inputNumber('8')} className="h-10">8</Button>

                {/* Row 3 */}
                <Button 
                  variant="outline" 
                  onClick={() => performFunction('sqrt')} 
                  className="h-10 text-xs"
                  disabled={!hasProAccess}
                >
                  √
                </Button>
                <Button variant="outline" onClick={() => performFunction('x²')} className="h-10 text-xs">x²</Button>
                <Button variant="outline" onClick={() => performFunction('1/x')} className="h-10 text-xs">1/x</Button>
                <Button onClick={() => inputNumber('9')} className="h-10">9</Button>
                <Button variant="destructive" onClick={() => performOperation('×')} className="h-10">×</Button>

                {/* Row 4 */}
                <Button variant="outline" onClick={() => inputNumber('(')} className="h-10">(</Button>
                <Button variant="outline" onClick={() => inputNumber(')')} className="h-10">)</Button>
                <Button variant="outline" onClick={() => performOperation('%')} className="h-10">%</Button>
                <Button onClick={() => inputNumber('4')} className="h-10">4</Button>
                <Button onClick={() => inputNumber('5')} className="h-10">5</Button>

                {/* Row 5 */}
                <Button onClick={() => inputNumber('6')} className="h-10">6</Button>
                <Button variant="destructive" onClick={() => performOperation('-')} className="h-10">-</Button>
                <Button onClick={() => inputNumber('1')} className="h-10">1</Button>
                <Button onClick={() => inputNumber('2')} className="h-10">2</Button>
                <Button onClick={() => inputNumber('3')} className="h-10">3</Button>

                {/* Row 6 */}
                <Button variant="destructive" onClick={() => performOperation('+')} className="h-10">+</Button>
                <Button variant="outline" onClick={() => performFunction('±')} className="h-10">±</Button>
                <Button onClick={() => inputNumber('0')} className="h-10">0</Button>
                <Button onClick={inputDecimal} className="h-10">.</Button>
                <Button variant="default" onClick={performEquals} className="h-10 bg-primary">=</Button>
              </div>
            </TabsContent>

            <TabsContent value="money" className="space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800">
                  💰 Financial calculations for budgeting, taxes, and money management
                </p>
              </div>

              {/* Financial Functions */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <Button variant="outline" onClick={() => performFunction('tax')} className="h-10 text-xs">
                  Tax (8.25%)
                </Button>
                <Button variant="outline" onClick={() => performFunction('tip15')} className="h-10 text-xs">
                  Tip 15%
                </Button>
                <Button variant="outline" onClick={() => performFunction('tip20')} className="h-10 text-xs">
                  Tip 20%
                </Button>
                <Button variant="outline" onClick={() => performFunction('discount')} className="h-10 text-xs">
                  Discount 10%
                </Button>
                <Button variant="outline" onClick={() => performFunction('compound')} className="h-10 text-xs">
                  Interest 5%
                </Button>
                <Button variant="outline" onClick={clear} className="h-10 text-xs">
                  Clear
                </Button>
              </div>

              {/* Currency Display */}
              <div className="bg-muted p-2 rounded text-center mb-2">
                <span className="text-sm text-muted-foreground">Currency: </span>
                <span className="font-semibold">{formatCurrency(parseFloat(display) || 0)}</span>
              </div>

              {/* Standard Calculator Grid */}
              <div className="grid grid-cols-4 gap-2">
                {/* Row 1 */}
                <Button variant="outline" onClick={clear} className="h-12">C</Button>
                <Button variant="outline" onClick={() => performOperation('%')} className="h-12">%</Button>
                <Button variant="outline" onClick={() => performFunction('±')} className="h-12">±</Button>
                <Button variant="destructive" onClick={() => performOperation('÷')} className="h-12">÷</Button>

                {/* Row 2 */}
                <Button onClick={() => inputNumber('7')} className="h-12">7</Button>
                <Button onClick={() => inputNumber('8')} className="h-12">8</Button>
                <Button onClick={() => inputNumber('9')} className="h-12">9</Button>
                <Button variant="destructive" onClick={() => performOperation('×')} className="h-12">×</Button>

                {/* Row 3 */}
                <Button onClick={() => inputNumber('4')} className="h-12">4</Button>
                <Button onClick={() => inputNumber('5')} className="h-12">5</Button>
                <Button onClick={() => inputNumber('6')} className="h-12">6</Button>
                <Button variant="destructive" onClick={() => performOperation('-')} className="h-12">-</Button>

                {/* Row 4 */}
                <Button onClick={() => inputNumber('1')} className="h-12">1</Button>
                <Button onClick={() => inputNumber('2')} className="h-12">2</Button>
                <Button onClick={() => inputNumber('3')} className="h-12">3</Button>
                <Button variant="destructive" onClick={() => performOperation('+')} className="h-12">+</Button>

                {/* Row 5 */}
                <Button onClick={() => inputNumber('0')} className="h-12 col-span-2">0</Button>
                <Button onClick={inputDecimal} className="h-12">.</Button>
                <Button variant="default" onClick={performEquals} className="h-12 bg-primary">=</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upgrade Required</AlertDialogTitle>
            <AlertDialogDescription>
              Scientific calculator functions are available with Plus or Pro plans. 
              Upgrade now to unlock advanced mathematical functions including trigonometry, logarithms, and more.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowUpgradeDialog(false)}>
              Upgrade Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
