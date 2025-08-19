
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface InvestmentData {
  year: number;
  totalValue: number;
  totalContributions: number;
  totalInterest: number;
}

export function InvestmentCalculator() {
  const [initialInvestment, setInitialInvestment] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [annualReturn, setAnnualReturn] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('');
  const [results, setResults] = useState<{
    futureValue: number;
    totalContributions: number;
    totalInterest: number;
    yearlyData: InvestmentData[];
  } | null>(null);

  const calculateInvestment = () => {
    const initial = parseFloat(initialInvestment) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const rate = parseFloat(annualReturn) / 100;
    const years = parseFloat(timeHorizon);

    if (rate && years) {
      const yearlyData: InvestmentData[] = [];
      let currentValue = initial;
      let totalContributions = initial;

      for (let year = 1; year <= years; year++) {
        // Add monthly contributions for the year
        for (let month = 1; month <= 12; month++) {
          currentValue += monthly;
          totalContributions += monthly;
          // Apply monthly compounding
          currentValue *= (1 + rate / 12);
        }

        yearlyData.push({
          year,
          totalValue: currentValue,
          totalContributions,
          totalInterest: currentValue - totalContributions
        });
      }

      const finalValue = currentValue;
      const totalInterest = finalValue - totalContributions;

      setResults({
        futureValue: finalValue,
        totalContributions,
        totalInterest,
        yearlyData
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Investment Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="initial">Initial Investment ($)</Label>
              <Input
                id="initial"
                type="number"
                value={initialInvestment}
                onChange={(e) => setInitialInvestment(e.target.value)}
                placeholder="10000"
              />
            </div>
            <div>
              <Label htmlFor="monthly">Monthly Contribution ($)</Label>
              <Input
                id="monthly"
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                placeholder="500"
              />
            </div>
            <div>
              <Label htmlFor="return">Expected Annual Return (%)</Label>
              <Input
                id="return"
                type="number"
                step="0.01"
                value={annualReturn}
                onChange={(e) => setAnnualReturn(e.target.value)}
                placeholder="7"
              />
            </div>
            <div>
              <Label htmlFor="horizon">Time Horizon (years)</Label>
              <Input
                id="horizon"
                type="number"
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(e.target.value)}
                placeholder="20"
              />
            </div>
          </div>
          
          <Button onClick={calculateInvestment} className="w-full">
            Calculate Investment
          </Button>

          {results && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800">Future Value</h3>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(results.futureValue)}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800">Total Contributions</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(results.totalContributions)}
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800">Total Interest</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(results.totalInterest)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Investment Growth Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={results.yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="totalValue" stroke="#8884d8" name="Total Value" strokeWidth={2} />
                <Line type="monotone" dataKey="totalContributions" stroke="#82ca9d" name="Contributions" />
                <Line type="monotone" dataKey="totalInterest" stroke="#ffc658" name="Interest Earned" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
