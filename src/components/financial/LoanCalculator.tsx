
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AmortizationEntry {
  payment: number;
  principalPayment: number;
  interestPayment: number;
  remainingBalance: number;
}

export function LoanCalculator() {
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loanTerm, setLoanTerm] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [amortizationSchedule, setAmortizationSchedule] = useState<AmortizationEntry[]>([]);

  const calculateLoan = () => {
    const P = parseFloat(principal);
    const r = parseFloat(interestRate) / 100 / 12;
    const n = parseFloat(loanTerm) * 12;

    if (P && r && n) {
      // Calculate monthly payment
      const M = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      setMonthlyPayment(M);

      // Generate amortization schedule
      const schedule: AmortizationEntry[] = [];
      let balance = P;

      for (let i = 1; i <= n; i++) {
        const interestPayment = balance * r;
        const principalPayment = M - interestPayment;
        balance -= principalPayment;

        schedule.push({
          payment: i,
          principalPayment,
          interestPayment,
          remainingBalance: Math.max(0, balance)
        });
      }

      setAmortizationSchedule(schedule);
    }
  };

  const chartData = amortizationSchedule.slice(0, 60).map((entry, index) => ({
    month: index + 1,
    principal: entry.principalPayment,
    interest: entry.interestPayment,
    balance: entry.remainingBalance
  }));

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
          <CardTitle>Loan/Mortgage Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="principal">Principal Amount ($)</Label>
              <Input
                id="principal"
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="200000"
              />
            </div>
            <div>
              <Label htmlFor="rate">Annual Interest Rate (%)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="5.5"
              />
            </div>
            <div>
              <Label htmlFor="term">Loan Term (years)</Label>
              <Input
                id="term"
                type="number"
                value={loanTerm}
                onChange={(e) => setLoanTerm(e.target.value)}
                placeholder="30"
              />
            </div>
          </div>
          
          <Button onClick={calculateLoan} className="w-full">
            Calculate Loan
          </Button>

          {monthlyPayment > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Results</h3>
              <p className="text-2xl font-bold text-primary">
                Monthly Payment: {formatCurrency(monthlyPayment)}
              </p>
              <p className="text-sm text-muted-foreground">
                Total Interest: {formatCurrency((monthlyPayment * parseFloat(loanTerm) * 12) - parseFloat(principal))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {amortizationSchedule.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Payment Breakdown Chart (First 5 Years)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="principal" stroke="#8884d8" name="Principal" />
                  <Line type="monotone" dataKey="interest" stroke="#82ca9d" name="Interest" />
                  <Line type="monotone" dataKey="balance" stroke="#ffc658" name="Remaining Balance" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amortization Schedule (First 12 Payments)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Remaining Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amortizationSchedule.slice(0, 12).map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{entry.payment}</TableCell>
                      <TableCell>{formatCurrency(entry.principalPayment)}</TableCell>
                      <TableCell>{formatCurrency(entry.interestPayment)}</TableCell>
                      <TableCell>{formatCurrency(entry.remainingBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
