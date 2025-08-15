
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AdvancedCalculator() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [memory, setMemory] = useState(0);

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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Advanced Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="scientific">Scientific</TabsTrigger>
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
            {/* Memory buttons */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              <Button variant="secondary" onClick={memoryClear} className="h-10 text-xs">MC</Button>
              <Button variant="secondary" onClick={memoryRecall} className="h-10 text-xs">MR</Button>
              <Button variant="secondary" onClick={memoryAdd} className="h-10 text-xs">M+</Button>
              <Button variant="secondary" onClick={memoryStore} className="h-10 text-xs">MS</Button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {/* Row 1 */}
              <Button variant="outline" onClick={() => performFunction('sin')} className="h-10 text-xs">sin</Button>
              <Button variant="outline" onClick={() => performFunction('cos')} className="h-10 text-xs">cos</Button>
              <Button variant="outline" onClick={() => performFunction('tan')} className="h-10 text-xs">tan</Button>
              <Button variant="outline" onClick={clear} className="h-10">C</Button>
              <Button variant="destructive" onClick={() => performOperation('÷')} className="h-10">÷</Button>

              {/* Row 2 */}
              <Button variant="outline" onClick={() => performFunction('log')} className="h-10 text-xs">log</Button>
              <Button variant="outline" onClick={() => performFunction('ln')} className="h-10 text-xs">ln</Button>
              <Button variant="outline" onClick={() => performOperation('^')} className="h-10 text-xs">x^y</Button>
              <Button onClick={() => inputNumber('7')} className="h-10">7</Button>
              <Button onClick={() => inputNumber('8')} className="h-10">8</Button>

              {/* Row 3 */}
              <Button variant="outline" onClick={() => performFunction('sqrt')} className="h-10 text-xs">√</Button>
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
        </Tabs>
      </CardContent>
    </Card>
  );
}
