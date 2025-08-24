import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download } from 'lucide-react';
import { exportToPDF, formatCurrency } from '@/utils/pdfExport';

export function LoanInterestCalculator() {
  const [principal, setPrincipal] = useState<string>('');
  const [rate, setRate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [monthlyPayment, setMonthlyPayment] = useState<string>('');
  const [fees, setFees] = useState<string>('');
  const [results, setResults] = useState<any>(null);

  const calculateSimpleInterest = () => {
    const p = parseFloat(principal);
    const r = parseFloat(rate) / 100;
    const t = parseFloat(time);
    const f = parseFloat(fees) || 0;

    if (p && r && t) {
      const interest = p * r * t;
      const total = p + interest + f;

      setResults({
        principal: formatCurrency(p),
        interestRate: `${rate}%`,
        timeYears: `${t} years`,
        fees: formatCurrency(f),
        interestEarned: formatCurrency(interest),
        totalAmount: formatCurrency(total)
      });
    }
  };

  const calculateCompoundInterest = () => {
    const p = parseFloat(principal);
    const r = parseFloat(rate) / 100;
    const t = parseFloat(time);
    const f = parseFloat(fees) || 0;

    if (p && r && t) {
      const amount = p * Math.pow(1 + r, t);
      const interest = amount - p;
      const total = amount + f;

      setResults({
        principal: formatCurrency(p),
        interestRate: `${rate}%`,
        timeYears: `${t} years`,
        fees: formatCurrency(f),
        compoundInterest: formatCurrency(interest),
        finalAmount: formatCurrency(amount),
        totalWithFees: formatCurrency(total)
      });
    }
  };

  const calculateLoanPayoff = () => {
    const p = parseFloat(principal);
    const r = parseFloat(rate) / 100 / 12; // Monthly rate
    const payment = parseFloat(monthlyPayment);
    const f = parseFloat(fees) || 0;

    if (p && r && payment && payment > p * r) {
      const monthsToPayoff = Math.log(1 + (p * r) / payment) / Math.log(1 + r);
      const totalPayments = payment * monthsToPayoff;
      const totalInterest = totalPayments - p;

      setResults({
        loanAmount: formatCurrency(p),
        monthlyPayment: formatCurrency(payment),
        interestRate: `${parseFloat(rate)}% APR`,
        fees: formatCurrency(f),
        monthsToPayoff: Math.ceil(monthsToPayoff),
        yearsToPayoff: (monthsToPayoff / 12).toFixed(1),
        totalPayments: formatCurrency(totalPayments),
        totalInterest: formatCurrency(totalInterest),
        totalCost: formatCurrency(totalPayments + f)
      });
    }
  };

  const exportResults = () => {
    if (!results) return;

    exportToPDF({
      title: 'Loan & Interest Calculator Results',
      module: 'Loan',
      data: {
        'Principal Amount': principal,
        'Interest Rate': `${rate}%`,
        'Time Period': `${time} years`,
        'Monthly Payment': monthlyPayment || 'N/A',
        'Additional Fees': fees || '$0'
      },
      calculations: results,
      recommendations: [
        'Compare different loan terms to find the best option',
        'Consider making extra payments to reduce total interest',
        'Factor in all fees when comparing loan offers',
        'Compound interest grows exponentially over time'
      ]
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Loan & Interest Calculator</CardTitle>
          {results && (
            <Button onClick={exportResults} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="simple" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="simple">Simple Interest</TabsTrigger>
            <TabsTrigger value="compound">Compound Interest</TabsTrigger>
            <TabsTrigger value="payoff">Loan Payoff</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="principal">Principal Amount ($)</Label>
                <Input
                  id="principal"
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  placeholder="10000"
                />
              </div>
              <div>
                <Label htmlFor="rate">Interest Rate (%)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="5.5"
                />
              </div>
              <div>
                <Label htmlFor="time">Time (years)</Label>
                <Input
                  id="time"
                  type="number"
                  step="0.1"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div>
                <Label htmlFor="fees">Additional Fees ($)</Label>
                <Input
                  id="fees"
                  type="number"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <Button onClick={calculateSimpleInterest} className="w-full">
              Calculate Simple Interest
            </Button>
          </TabsContent>

          <TabsContent value="compound" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="principal">Principal Amount ($)</Label>
                <Input
                  id="principal"
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  placeholder="10000"
                />
              </div>
              <div>
                <Label htmlFor="rate">Annual Interest Rate (%)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="5.5"
                />
              </div>
              <div>
                <Label htmlFor="time">Time (years)</Label>
                <Input
                  id="time"
                  type="number"
                  step="0.1"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div>
                <Label htmlFor="fees">Additional Fees ($)</Label>
                <Input
                  id="fees"
                  type="number"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <Button onClick={calculateCompoundInterest} className="w-full">
              Calculate Compound Interest
            </Button>
          </TabsContent>

          <TabsContent value="payoff" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="principal">Loan Amount ($)</Label>
                <Input
                  id="principal"
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  placeholder="250000"
                />
              </div>
              <div>
                <Label htmlFor="rate">Annual Interest Rate (%)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="4.5"
                />
              </div>
              <div>
                <Label htmlFor="monthlyPayment">Monthly Payment ($)</Label>
                <Input
                  id="monthlyPayment"
                  type="number"
                  value={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(e.target.value)}
                  placeholder="1500"
                />
              </div>
              <div>
                <Label htmlFor="fees">Loan Fees ($)</Label>
                <Input
                  id="fees"
                  type="number"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  placeholder="2500"
                />
              </div>
            </div>
            <Button onClick={calculateLoanPayoff} className="w-full">
              Calculate Loan Payoff Schedule
            </Button>
          </TabsContent>

          {results && (
            <Card className="mt-6 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Calculation Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(results).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-2 bg-background rounded">
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="text-muted-foreground font-bold">{String(value)}</span>
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
