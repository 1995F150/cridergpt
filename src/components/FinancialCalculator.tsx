
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoanCalculator } from './financial/LoanCalculator';
import { InvestmentCalculator } from './financial/InvestmentCalculator';
import { BudgetTracker } from './financial/BudgetTracker';
import { CurrencyConverter } from './financial/CurrencyConverter';
import { SavingsGoalTracker } from './financial/SavingsGoalTracker';
import { FinancialRatioAnalysis } from './financial/FinancialRatioAnalysis';
import { CalculationHistory } from './financial/CalculationHistory';
import { UserPresets } from './financial/UserPresets';

export function FinancialCalculator() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">Advanced Financial Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="loan" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="loan">Loan</TabsTrigger>
            <TabsTrigger value="investment">Investment</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="currency">Currency</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
            <TabsTrigger value="ratios">Ratios</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="presets">Presets</TabsTrigger>
          </TabsList>

          <TabsContent value="loan" className="mt-6">
            <LoanCalculator />
          </TabsContent>

          <TabsContent value="investment" className="mt-6">
            <InvestmentCalculator />
          </TabsContent>

          <TabsContent value="budget" className="mt-6">
            <BudgetTracker />
          </TabsContent>

          <TabsContent value="currency" className="mt-6">
            <CurrencyConverter />
          </TabsContent>

          <TabsContent value="savings" className="mt-6">
            <SavingsGoalTracker />
          </TabsContent>

          <TabsContent value="ratios" className="mt-6">
            <FinancialRatioAnalysis />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <CalculationHistory />
          </TabsContent>

          <TabsContent value="presets" className="mt-6">
            <UserPresets />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
