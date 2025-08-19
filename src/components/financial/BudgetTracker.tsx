import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trash2, Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface Budget {
  category: string;
  limit: number;
  spent: number;
}

const CATEGORIES = [
  'Food & Dining',
  'Transportation', 
  'Housing',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Education',
  'Travel',
  'Other'
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'];

export function BudgetTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [newExpense, setNewExpense] = useState({
    category: '',
    amount: '',
    description: ''
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

  const addExpense = () => {
    if (!newExpense.category || !newExpense.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const expense: Expense = {
      id: Date.now().toString(),
      category: newExpense.category,
      amount: parseFloat(newExpense.amount),
      description: newExpense.description,
      date: new Date().toISOString().split('T')[0]
    };

    const updatedExpenses = [...expenses, expense];
    setExpenses(updatedExpenses);
    localStorage.setItem('budget-expenses', JSON.stringify(updatedExpenses));
    
    // Update budget spent amount
    updateBudgetSpent(updatedExpenses);
    
    setNewExpense({ category: '', amount: '', description: '' });
    toast.success('Expense added successfully');
  };

  const addBudget = () => {
    if (!newBudget.category || !newBudget.limit) {
      toast.error('Please fill in all required fields');
      return;
    }

    const existingBudgetIndex = budgets.findIndex(b => b.category === newBudget.category);
    let updatedBudgets;

    if (existingBudgetIndex >= 0) {
      updatedBudgets = [...budgets];
      updatedBudgets[existingBudgetIndex].limit = parseFloat(newBudget.limit);
    } else {
      const budget: Budget = {
        category: newBudget.category,
        limit: parseFloat(newBudget.limit),
        spent: 0
      };
      updatedBudgets = [...budgets, budget];
    }

    setBudgets(updatedBudgets);
    localStorage.setItem('budget-limits', JSON.stringify(updatedBudgets));
    updateBudgetSpent(expenses, updatedBudgets);
    
    setNewBudget({ category: '', limit: '' });
    toast.success('Budget updated successfully');
  };

  const updateBudgetSpent = (expenseList = expenses, budgetList = budgets) => {
    const updatedBudgets = budgetList.map(budget => ({
      ...budget,
      spent: expenseList
        .filter(expense => expense.category === budget.category)
        .reduce((total, expense) => total + expense.amount, 0)
    }));

    setBudgets(updatedBudgets);
    localStorage.setItem('budget-limits', JSON.stringify(updatedBudgets));
  };

  const removeExpense = (id: string) => {
    const updatedExpenses = expenses.filter(expense => expense.id !== id);
    setExpenses(updatedExpenses);
    localStorage.setItem('budget-expenses', JSON.stringify(updatedExpenses));
    updateBudgetSpent(updatedExpenses);
    toast.success('Expense removed');
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Budget & Expense Report', 20, 30);
      
      // Add date
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);
      
      let yPosition = 60;
      
      // Budget overview
      doc.setFontSize(16);
      doc.text('Budget Overview', 20, yPosition);
      yPosition += 15;
      
      budgets.forEach((budget) => {
        doc.setFontSize(12);
        doc.text(`${budget.category}:`, 20, yPosition);
        doc.text(`Budget: $${budget.limit.toFixed(2)}`, 80, yPosition);
        doc.text(`Spent: $${budget.spent.toFixed(2)}`, 130, yPosition);
        doc.text(`Remaining: $${(budget.limit - budget.spent).toFixed(2)}`, 170, yPosition);
        yPosition += 8;
      });
      
      yPosition += 10;
      
      // Recent expenses
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 30;
      }
      
      doc.setFontSize(16);
      doc.text('Recent Expenses', 20, yPosition);
      yPosition += 15;
      
      expenses.slice(-10).forEach((expense) => {
        doc.setFontSize(10);
        doc.text(`${expense.date} - ${expense.category}`, 20, yPosition);
        doc.text(`$${expense.amount.toFixed(2)}`, 120, yPosition);
        doc.text(expense.description || 'N/A', 150, yPosition);
        yPosition += 6;
        
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }
      });
      
      doc.save('budget-report.pdf');
      toast.success('Budget report exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const expensesByCategory = CATEGORIES.map(category => {
    const categoryExpenses = expenses.filter(expense => expense.category === category);
    const total = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    return {
      name: category,
      value: total
    };
  }).filter(item => item.value > 0);

  const budgetData = budgets.map(budget => ({
    category: budget.category,
    budget: budget.limit,
    spent: budget.spent,
    remaining: Math.max(0, budget.limit - budget.spent)
  }));

  return (
    <div className="space-y-6">
      {/* Add Expense Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Add New Expense
            <Button onClick={exportToPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="expense-category">Category</Label>
              <Select value={newExpense.category} onValueChange={(value) => setNewExpense({...newExpense, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expense-amount">Amount ($)</Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="expense-description">Description</Label>
              <Input
                id="expense-description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addExpense} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Set Budget Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Set Budget Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="budget-category">Category</Label>
              <Select value={newBudget.category} onValueChange={(value) => setNewBudget({...newBudget, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="budget-limit">Monthly Limit ($)</Label>
              <Input
                id="budget-limit"
                type="number"
                step="0.01"
                value={newBudget.limit}
                onChange={(e) => setNewBudget({...newBudget, limit: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addBudget} className="w-full">
                Set Budget
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Overview */}
      {budgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgets.map((budget, index) => {
                const percentage = (budget.spent / budget.limit) * 100;
                const isOverBudget = budget.spent > budget.limit;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{budget.category}</span>
                      <span className={`text-sm ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                        ${budget.spent.toFixed(2)} / ${budget.limit.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}% used
                      {isOverBudget && ` (Over by $${(budget.spent - budget.limit).toFixed(2)})`}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown Pie Chart */}
        {expensesByCategory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Budget vs Spending Bar Chart */}
        {budgetData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="budget" fill="#8884d8" name="Budget" />
                  <Bar dataKey="spent" fill="#82ca9d" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {expenses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No expenses recorded yet</p>
            ) : (
              expenses.slice().reverse().slice(0, 10).map((expense) => (
                <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{expense.category}</div>
                    <div className="text-sm text-muted-foreground">
                      {expense.description} • {expense.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">${expense.amount.toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExpense(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
