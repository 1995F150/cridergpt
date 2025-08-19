
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' }
];

export function CurrencyConverter() {
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const convertCurrency = async () => {
    if (!amount || !fromCurrency || !toCurrency) return;

    setIsLoading(true);
    
    try {
      // Using a mock exchange rate for demo (in real app, you'd use a real API)
      // Example: https://api.exchangerate-api.com/v4/latest/USD
      const mockRates: { [key: string]: number } = {
        'USD-EUR': 0.85,
        'USD-GBP': 0.73,
        'USD-JPY': 110,
        'USD-CAD': 1.25,
        'USD-AUD': 1.35,
        'USD-CHF': 0.92,
        'USD-CNY': 6.45,
        'EUR-USD': 1.18,
        'GBP-USD': 1.37,
        'JPY-USD': 0.0091,
        'CAD-USD': 0.80,
        'AUD-USD': 0.74,
        'CHF-USD': 1.09,
        'CNY-USD': 0.155
      };

      const rateKey = `${fromCurrency}-${toCurrency}`;
      let rate = mockRates[rateKey];
      
      if (!rate) {
        // If direct rate not available, convert through USD
        const toUsdRate = mockRates[`${fromCurrency}-USD`] || 1;
        const fromUsdRate = mockRates[`USD-${toCurrency}`] || 1;
        rate = toUsdRate * fromUsdRate;
      }

      if (fromCurrency === toCurrency) {
        rate = 1;
      }

      setExchangeRate(rate || 1);
      setConvertedAmount(parseFloat(amount) * (rate || 1));
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      setExchangeRate(1);
      setConvertedAmount(parseFloat(amount));
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Converter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
            />
          </div>
          <div>
            <Label htmlFor="from">From</Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(currency => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(currency => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={convertCurrency} className="w-full" disabled={isLoading}>
          {isLoading ? 'Converting...' : 'Convert Currency'}
        </Button>

        {convertedAmount !== null && exchangeRate !== null && (
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="text-center">
              <p className="text-lg">
                <span className="font-semibold">{formatCurrency(parseFloat(amount), fromCurrency)}</span>
                <span className="mx-2">=</span>
                <span className="font-bold text-2xl text-primary">{formatCurrency(convertedAmount, toCurrency)}</span>
              </p>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Exchange Rate: 1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          * Exchange rates are for demonstration purposes only
        </div>
      </CardContent>
    </Card>
  );
}
