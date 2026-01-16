import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Download, Copy } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { addPDFHeader, addPDFFooter, addCornerWatermark } from '@/utils/pdfWatermark';

interface HistoryEntry {
  id: string;
  type: 'loan' | 'investment' | 'currency' | 'ratio' | 'basic';
  timestamp: string;
  inputs: any;
  results: any;
}

export function CalculationHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('calculation-history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('calculation-history');
    toast.success('Calculation history cleared');
  };

  const removeEntry = (id: string) => {
    const updatedHistory = history.filter(entry => entry.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('calculation-history', JSON.stringify(updatedHistory));
    toast.success('Entry removed');
  };

  const copyToClipboard = (entry: HistoryEntry) => {
    const text = `${entry.type.toUpperCase()} Calculation (${entry.timestamp})\n${JSON.stringify(entry.results, null, 2)}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF();
      
      // Add CriderGPT branding header with logo
      let yPosition = await addPDFHeader(doc);
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('Financial Calculation History', 20, yPosition);
      
      // Add date
      yPosition += 10;
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
      
      yPosition += 15;
      
      // Add history entries
      history.forEach((entry, index) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 30;
        }
        
        doc.setFontSize(14);
        doc.text(`${index + 1}. ${entry.type.toUpperCase()} - ${entry.timestamp}`, 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        const resultText = JSON.stringify(entry.results, null, 2);
        const lines = doc.splitTextToSize(resultText, 170);
        doc.text(lines, 25, yPosition);
        yPosition += lines.length * 4 + 10;
      });
      
      // Add footer and corner watermark with logo
      addPDFFooter(doc);
      await addCornerWatermark(doc);
      
      doc.save('CriderGPT_Financial_Calculations.pdf');
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const renderHistoryEntry = (entry: HistoryEntry) => {
    switch (entry.type) {
      case 'loan':
        return (
          <div>
            <p><strong>Principal:</strong> {formatCurrency(entry.inputs.principal)}</p>
            <p><strong>Rate:</strong> {entry.inputs.interestRate}%</p>
            <p><strong>Term:</strong> {entry.inputs.loanTerm} years</p>
            <p><strong>Monthly Payment:</strong> {formatCurrency(entry.results.monthlyPayment)}</p>
          </div>
        );
      case 'investment':
        return (
          <div>
            <p><strong>Initial:</strong> {formatCurrency(entry.inputs.initialInvestment)}</p>
            <p><strong>Monthly:</strong> {formatCurrency(entry.inputs.monthlyContribution)}</p>
            <p><strong>Return:</strong> {entry.inputs.annualReturn}%</p>
            <p><strong>Future Value:</strong> {formatCurrency(entry.results.futureValue)}</p>
          </div>
        );
      case 'currency':
        return (
          <div>
            <p><strong>Amount:</strong> {entry.inputs.amount} {entry.inputs.fromCurrency}</p>
            <p><strong>To:</strong> {entry.inputs.toCurrency}</p>
            <p><strong>Result:</strong> {formatCurrency(entry.results.convertedAmount)} {entry.inputs.toCurrency}</p>
          </div>
        );
      case 'ratio':
        return (
          <div>
            <p><strong>Income:</strong> {formatCurrency(entry.inputs.income)}/month</p>
            <p><strong>Debt-to-Income:</strong> {entry.results.debtToIncomeRatio.toFixed(1)}%</p>
            <p><strong>Savings Rate:</strong> {entry.results.savingsRate.toFixed(1)}%</p>
          </div>
        );
      default:
        return <p>Basic calculation result: {entry.results.result || 'N/A'}</p>;
    }
  };

  const getHistoryByType = (type: string) => {
    return history.filter(entry => entry.type === type);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Calculation History</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="destructive" onClick={clearHistory}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="loan">Loan</TabsTrigger>
              <TabsTrigger value="investment">Investment</TabsTrigger>
              <TabsTrigger value="currency">Currency</TabsTrigger>
              <TabsTrigger value="ratio">Ratios</TabsTrigger>
              <TabsTrigger value="basic">Basic</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No calculation history yet</p>
                ) : (
                  history.slice().reverse().map((entry) => (
                    <Card key={entry.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                              {entry.type.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                          </div>
                          {renderHistoryEntry(entry)}
                        </div>
                        <div className="flex gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(entry)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {['loan', 'investment', 'currency', 'ratio', 'basic'].map(type => (
              <TabsContent key={type} value={type} className="mt-4">
                <div className="space-y-3">
                  {getHistoryByType(type).length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No {type} calculations yet</p>
                  ) : (
                    getHistoryByType(type).slice().reverse().map((entry) => (
                      <Card key={entry.id} className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground mb-2">{entry.timestamp}</div>
                            {renderHistoryEntry(entry)}
                          </div>
                          <div className="flex gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(entry)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
