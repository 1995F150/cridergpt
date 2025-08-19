
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface SavingsGoal {
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate: string;
}

export function SavingsGoalTracker() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    monthlyContribution: '',
    targetDate: ''
  });

  useEffect(() => {
    const savedGoals = localStorage.getItem('savings-goals');
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
  }, []);

  const saveGoals = (updatedGoals: SavingsGoal[]) => {
    localStorage.setItem('savings-goals', JSON.stringify(updatedGoals));
    setGoals(updatedGoals);
  };

  const addGoal = () => {
    if (newGoal.name && newGoal.targetAmount && newGoal.currentAmount !== '' && newGoal.monthlyContribution && newGoal.targetDate) {
      const goal: SavingsGoal = {
        name: newGoal.name,
        targetAmount: parseFloat(newGoal.targetAmount),
        currentAmount: parseFloat(newGoal.currentAmount),
        monthlyContribution: parseFloat(newGoal.monthlyContribution),
        targetDate: newGoal.targetDate
      };

      saveGoals([...goals, goal]);
      setNewGoal({ name: '', targetAmount: '', currentAmount: '', monthlyContribution: '', targetDate: '' });
    }
  };

  const updateGoalAmount = (index: number, newAmount: string) => {
    const updatedGoals = [...goals];
    updatedGoals[index].currentAmount = parseFloat(newAmount) || 0;
    saveGoals(updatedGoals);
  };

  const removeGoal = (index: number) => {
    const updatedGoals = goals.filter((_, i) => i !== index);
    saveGoals(updatedGoals);
  };

  const calculateProjectedCompletion = (goal: SavingsGoal) => {
    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0) return 'Goal achieved!';
    
    const monthsNeeded = Math.ceil(remaining / goal.monthlyContribution);
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsNeeded);
    
    return `Projected completion: ${completionDate.toLocaleDateString()}`;
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
          <CardTitle>Add Savings Goal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="goal-name">Goal Name</Label>
              <Input
                id="goal-name"
                value={newGoal.name}
                onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                placeholder="Emergency Fund"
              />
            </div>
            <div>
              <Label htmlFor="target-amount">Target Amount ($)</Label>
              <Input
                id="target-amount"
                type="number"
                value={newGoal.targetAmount}
                onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})}
                placeholder="10000"
              />
            </div>
            <div>
              <Label htmlFor="current-amount">Current Amount ($)</Label>
              <Input
                id="current-amount"
                type="number"
                value={newGoal.currentAmount}
                onChange={(e) => setNewGoal({...newGoal, currentAmount: e.target.value})}
                placeholder="2500"
              />
            </div>
            <div>
              <Label htmlFor="monthly-contribution">Monthly Contribution ($)</Label>
              <Input
                id="monthly-contribution"
                type="number"
                value={newGoal.monthlyContribution}
                onChange={(e) => setNewGoal({...newGoal, monthlyContribution: e.target.value})}
                placeholder="500"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="target-date">Target Date</Label>
              <Input
                id="target-date"
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
              />
            </div>
          </div>
          
          <Button onClick={addGoal} className="w-full">Add Savings Goal</Button>
        </CardContent>
      </Card>

      {goals.map((goal, index) => {
        const progressPercentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
        const isCompleted = goal.currentAmount >= goal.targetAmount;
        
        return (
          <Card key={index} className={isCompleted ? 'border-green-500' : ''}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{goal.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Target: {formatCurrency(goal.targetAmount)} by {new Date(goal.targetDate).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeGoal(index)}
                >
                  Remove
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{progressPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Current Amount</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={goal.currentAmount}
                      onChange={(e) => updateGoalAmount(index, e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Remaining</Label>
                  <p className="font-semibold p-2">
                    {formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))}
                  </p>
                </div>
              </div>
              
              <div className="text-sm">
                <Label className="text-xs text-muted-foreground">Monthly Contribution</Label>
                <p className="font-semibold">{formatCurrency(goal.monthlyContribution)}</p>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {calculateProjectedCompletion(goal)}
              </div>
              
              {isCompleted && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <p className="text-green-800 font-semibold">🎉 Congratulations! Goal achieved!</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {goals.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No savings goals yet. Add your first goal above!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
