
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function FinancialRatioAnalysis() {
  const [income, setIncome] = useState('');
  const [totalDebt, setTotalDebt] = useState('');
  const [monthlySavings, setMonthlySavings] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [results, setResults] = useState<{
    debtToIncomeRatio: number;
    savingsRate: number;
    expenseRatio: number;
  } | null>(null);

  const calculateRatios = () => {
    const monthlyIncome = parseFloat(income);
    const debt = parseFloat(totalDebt);
    const savings = parseFloat(monthlySavings);
    const expenses = parseFloat(monthlyExpenses);

    if (monthlyIncome > 0) {
      const debtToIncomeRatio = (debt / (monthlyIncome * 12)) * 100;
      const savingsRate = (savings / monthlyIncome) * 100;
      const expenseRatio = (expenses / monthlyIncome) * 100;

      setResults({
        debtToIncomeRatio,
        savingsRate,
        expenseRatio
      });
    }
  };

  const getRatioStatus = (ratio: number, type: 'debt' | 'savings' | 'expenses') => {
    switch (type) {
      case 'debt':
        if (ratio <= 20) return { status: 'Excellent', color: 'text-green-600', description: 'Very low debt burden' };
        if (ratio <= 36) return { status: 'Good', color: 'text-blue-600', description: 'Manageable debt level' };
        if (ratio <= 50) return { status: 'Fair', color: 'text-yellow-600', description: 'Consider debt reduction' };
        return { status: 'High Risk', color: 'text-red-600', description: 'Urgent debt reduction needed' };
      
      case 'savings':
        if (ratio >= 20) return { status: 'Excellent', color: 'text-green-600', description: 'Strong savings habit' };
        if (ratio >= 15) return { status: 'Good', color: 'text-blue-600', description: 'Good savings rate' };
        if (ratio >= 10) return { status: 'Fair', color: 'text-yellow-600', description: 'Consider increasing savings' };
        return { status: 'Low', color: 'text-red-600', description: 'Increase savings rate' };
      
      case 'expenses':
        if (ratio <= 50) return { status: 'Excellent', color: 'text-green-600', description: 'Very efficient spending' };
        if (ratio <= 70) return { status: 'Good', color: 'text-blue-600', description: 'Reasonable expense ratio' };
        if (ratio <= 80) return { status: 'Fair', color: 'text-yellow-600', description: 'Room for optimization' };
        return { status: 'High', color: 'text-red-600', description: 'Review and reduce expenses' };
      
      default:
        return { status: '', color: '', description: '' };
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
          <CardTitle>Financial Ratio Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monthly-income">Monthly Income ($)</Label>
              <Input
                id="monthly-income"
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="5000"
              />
            </div>
            <div>
              <Label htmlFor="total-debt">Total Debt ($)</Label>
              <Input
                id="total-debt"
                type="number"
                value={totalDebt}
                onChange={(e) => setTotalDebt(e.target.value)}
                placeholder="25000"
              />
            </div>
            <div>
              <Label htmlFor="monthly-savings">Monthly Savings ($)</Label>
              <Input
                id="monthly-savings"
                type="number"
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(e.target.value)}
                placeholder="750"
              />
            </div>
            <div>
              <Label htmlFor="monthly-expenses">Monthly Expenses ($)</Label>
              <Input
                id="monthly-expenses"
                type="number"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(e.target.value)}
                placeholder="3500"
              />
            </div>
          </div>
          
          <Button onClick={calculateRatios} className="w-full">
            Calculate Financial Ratios
          </Button>
        </CardContent>
      </Card>

      {results && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Debt-to-Income Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <span className="text-3xl font-bold">{results.debtToIncomeRatio.toFixed(1)}%</span>
                </div>
                
                <Progress value={Math.min(results.debtToIncomeRatio, 100)} className="h-2" />
                
                <div className={`text-center ${getRatioStatus(results.debtToIncomeRatio, 'debt').color}`}>
                  <p className="font-semibold">{getRatioStatus(results.debtToIncomeRatio, 'debt').status}</p>
                  <p className="text-xs">{getRatioStatus(results.debtToIncomeRatio, 'debt').description}</p>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>Ideal: &lt;20%</p>
                  <p>Good: 20-36%</p>
                  <p>Caution: &gt;36%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Savings Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <span className="text-3xl font-bold">{results.savingsRate.toFixed(1)}%</span>
                </div>
                
                <Progress value={Math.min(results.savingsRate, 100)} className="h-2" />
                
                <div className={`text-center ${getRatioStatus(results.savingsRate, 'savings').color}`}>
                  <p className="font-semibold">{getRatioStatus(results.savingsRate, 'savings').status}</p>
                  <p className="text-xs">{getRatioStatus(results.savingsRate, 'savings').description}</p>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>Excellent: &gt;20%</p>
                  <p>Good: 15-20%</p>
                  <p>Minimum: 10-15%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Expense Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <span className="text-3xl font-bold">{results.expenseRatio.toFixed(1)}%</span>
                </div>
                
                <Progress value={Math.min(results.expenseRatio, 100)} className="h-2" />
                
                <div className={`text-center ${getRatioStatus(results.expenseRatio, 'expenses').color}`}>
                  <p className="font-semibold">{getRatioStatus(results.expenseRatio, 'expenses').status}</p>
                  <p className="text-xs">{getRatioStatus(results.expenseRatio, 'expenses').description}</p>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>Excellent: &lt;50%</p>
                  <p>Good: 50-70%</p>
                  <p>Review: &gt;70%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Financial Health Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Monthly Income</Label>
                  <p className="font-semibold">{formatCurrency(parseFloat(income))}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Annual Income</Label>
                  <p className="font-semibold">{formatCurrency(parseFloat(income) * 12)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Monthly Savings</Label>
                  <p className="font-semibold">{formatCurrency(parseFloat(monthlySavings))}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Annual Savings</Label>
                  <p className="font-semibold">{formatCurrency(parseFloat(monthlySavings) * 12)}</p>
                </div>
              </div>
              
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">Financial Recommendations:</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  {results.debtToIncomeRatio > 36 && <li>• Consider debt consolidation or aggressive debt payoff</li>}
                  {results.savingsRate < 15 && <li>• Increase savings rate to at least 15% of income</li>}
                  {results.expenseRatio > 70 && <li>• Review and reduce monthly expenses</li>}
                  {results.debtToIncomeRatio <= 20 && results.savingsRate >= 15 && <li>• Great financial health! Consider investment opportunities</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
