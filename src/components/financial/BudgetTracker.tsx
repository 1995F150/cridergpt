
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Trash2 } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

interface Budget {
  category: string;
  limit: number;
}

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Shopping',
  'Travel',
  'Other'
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

export function BudgetTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: ''
  });
  const [newBudget, setNewBudget] = useState({
    category: '',
    limit: ''
  });

  useEffect(() => {
    const savedExpenses = localStorage.getItem('budget-expenses');
    const savedBudgets = localStorage.getItem('budget-limits');
    
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
    if (savedBudgets) {
      setBudgets(JSON.parse(savedBudgets));
    }
  }, []);

  const saveData = (expenses: Expense[], budgets: Budget[]) => {
    localStorage.setItem('budget-expenses', JSON.stringify(expenses));
    localStorage.setItem('budget-limits', JSON.stringify(budgets));
  };

  const addExpense = () => {
    if (newExpense.description && newExpense.amount && newExpense.category) {
      const expense: Expense = {
        id: Date.now().toString(),
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        date: new Date().toLocaleDateString()
      };

      const updatedExpenses = [...expenses, expense];
      setExpenses(updatedExpenses);
      saveData(updatedExpenses, budgets);
      
      setNewExpense({ description: '', amount: '', category: '' });
    }
  };

  const removeExpense = (id: string) => {
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(updatedExpenses);
    saveData(updatedExpenses, budgets);
  };

  const setBudgetLimit = () => {
    if (newBudget.category && newBudget.limit) {
      const existingIndex = budgets.findIndex(b => b.category === newBudget.category);
      let updatedBudgets;
      
      if (existingIndex >= 0) {
        updatedBudgets = [...budgets];
        updatedBudgets[existingIndex].limit = parseFloat(newBudget.limit);
      } else {
        updatedBudgets = [...budgets, {
          category: newBudget.category,
          limit: parseFloat(newBudget.limit)
        }];
      }
      
      setBudgets(updatedBudgets);
      saveData(expenses, updatedBudgets);
      setNewBudget({ category: '', limit: '' });
    }
  };

  const getSpendingByCategory = () => {
    const spending: { [key: string]: number } = {};
    
    expenses.forEach(expense => {
      spending[expense.category] = (spending[expense.category] || 0) + expense.amount;
    });
    
    return Object.entries(spending).map(([category, amount]) => ({
      category,
      amount,
      budget: budgets.find(b => b.category === category)?.limit || 0
    }));
  };

  const pieData = getSpendingByCategory().map(item => ({
    name: item.category,
    value: item.amount
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add Expense</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                placeholder="Lunch at restaurant"
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                placeholder="25.50"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={(value) => setNewExpense({...newExpense, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addExpense} className="w-full">Add Expense</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Set Budget Limit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="budget-category">Category</Label>
              <Select onValueChange={(value) => setNewBudget({...newBudget, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="budget-limit">Monthly Budget ($)</Label>
              <Input
                id="budget-limit"
                type="number"
                step="0.01"
                value={newBudget.limit}
                onChange={(e) => setNewBudget({...newBudget, limit: e.target.value})}
                placeholder="500"
              />
            </div>
            <Button onClick={setBudgetLimit} className="w-full">Set Budget</Button>
          </CardContent>
        </Card>
      </div>

      {pieData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget vs Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getSpendingByCategory()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="budget" fill="#8884d8" name="Budget" />
                  <Bar dataKey="amount" fill="#82ca9d" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expenses.slice(-10).reverse().map(expense => (
                <div key={expense.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <span className="font-medium">{expense.description}</span>
                    <span className="text-sm text-muted-foreground ml-2">({expense.category})</span>
                    <span className="text-xs text-muted-foreground ml-2">{expense.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{formatCurrency(expense.amount)}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeExpense(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
