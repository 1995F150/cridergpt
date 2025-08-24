
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download } from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';

export function HealthCalculator() {
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [activityLevel, setActivityLevel] = useState<string>('');
  const [waterIntake, setWaterIntake] = useState<string>('');
  const [results, setResults] = useState<any>(null);

  const calculateBMI = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100; // Convert cm to m

    if (w && h) {
      const bmi = w / (h * h);
      let category = '';
      
      if (bmi < 18.5) category = 'Underweight';
      else if (bmi < 25) category = 'Normal weight';
      else if (bmi < 30) category = 'Overweight';
      else category = 'Obese';

      setResults({
        weight: `${w} kg`,
        height: `${height} cm`,
        bmi: bmi.toFixed(1),
        category,
        healthyRange: '18.5 - 24.9'
      });
    }
  };

  const calculateBMR = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);

    if (w && h && a && gender) {
      let bmr: number;
      
      // Mifflin-St Jeor Equation
      if (gender === 'male') {
        bmr = 10 * w + 6.25 * h - 5 * a + 5;
      } else {
        bmr = 10 * w + 6.25 * h - 5 * a - 161;
      }

      const activityMultipliers: { [key: string]: number } = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9
      };

      const multiplier = activityMultipliers[activityLevel] || 1.2;
      const tdee = bmr * multiplier;

      setResults({
        weight: `${w} kg`,
        height: `${h} cm`,
        age: `${a} years`,
        gender: gender.charAt(0).toUpperCase() + gender.slice(1),
        activityLevel: activityLevel?.replace('_', ' ').toUpperCase(),
        bmr: `${Math.round(bmr)} calories/day`,
        tdee: `${Math.round(tdee)} calories/day`,
        weightLoss: `${Math.round(tdee - 500)} calories/day (-0.5kg/week)`,
        weightGain: `${Math.round(tdee + 500)} calories/day (+0.5kg/week)`
      });
    }
  };

  const calculateWaterIntake = () => {
    const w = parseFloat(weight);
    const intake = parseFloat(waterIntake);

    if (w) {
      const recommended = w * 35; // 35ml per kg body weight
      const cups = recommended / 240; // Convert to 8oz cups
      const liters = recommended / 1000;

      let status = '';
      if (intake) {
        if (intake >= recommended * 0.9) status = 'Excellent hydration!';
        else if (intake >= recommended * 0.7) status = 'Good hydration';
        else status = 'Need more water';
      }

      setResults({
        bodyWeight: `${w} kg`,
        recommendedDaily: `${Math.round(recommended)} ml`,
        recommendedLiters: `${liters.toFixed(1)} L`,
        recommendedCups: `${Math.round(cups)} cups (8oz)`,
        currentIntake: intake ? `${intake} ml` : 'Not specified',
        hydrationStatus: status || 'Track your intake',
        tip: 'Drink water throughout the day, not all at once'
      });
    }
  };

  const exportResults = () => {
    if (!results) return;

    exportToPDF({
      title: 'Health & Nutrition Calculator Results',
      module: 'Health',
      data: {
        'Weight': weight ? `${weight} kg` : 'N/A',
        'Height': height ? `${height} cm` : 'N/A',
        'Age': age ? `${age} years` : 'N/A',
        'Gender': gender || 'N/A',
        'Activity Level': activityLevel?.replace('_', ' ') || 'N/A',
        'Water Intake': waterIntake ? `${waterIntake} ml` : 'N/A'
      },
      calculations: results,
      recommendations: [
        'Consult healthcare professionals for personalized advice',
        'BMI is a general indicator, not suitable for athletes or elderly',
        'Maintain consistent hydration throughout the day',
        'Caloric needs may vary based on individual factors'
      ]
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Health & Nutrition Calculator</CardTitle>
          {results && (
            <Button onClick={exportResults} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bmi" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bmi">BMI</TabsTrigger>
            <TabsTrigger value="bmr">BMR/TDEE</TabsTrigger>
            <TabsTrigger value="water">Hydration</TabsTrigger>
          </TabsList>

          <TabsContent value="bmi" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="70"
                />
              </div>
              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                />
              </div>
            </div>
            <Button onClick={calculateBMI} className="w-full">
              Calculate BMI
            </Button>
          </TabsContent>

          <TabsContent value="bmr" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="70"
                />
              </div>
              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                />
              </div>
              <div>
                <Label htmlFor="age">Age (years)</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="activity">Activity Level</Label>
              <Select value={activityLevel} onValueChange={setActivityLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary (little/no exercise)</SelectItem>
                  <SelectItem value="light">Light (light exercise 1-3 days/week)</SelectItem>
                  <SelectItem value="moderate">Moderate (moderate exercise 3-5 days/week)</SelectItem>
                  <SelectItem value="active">Active (hard exercise 6-7 days/week)</SelectItem>
                  <SelectItem value="very_active">Very Active (very hard exercise, physical job)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={calculateBMR} className="w-full">
              Calculate BMR & TDEE
            </Button>
          </TabsContent>

          <TabsContent value="water" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="70"
                />
              </div>
              <div>
                <Label htmlFor="waterIntake">Current Daily Intake (ml)</Label>
                <Input
                  id="waterIntake"
                  type="number"
                  value={waterIntake}
                  onChange={(e) => setWaterIntake(e.target.value)}
                  placeholder="2000"
                />
              </div>
            </div>
            <Button onClick={calculateWaterIntake} className="w-full">
              Calculate Hydration Needs
            </Button>
          </TabsContent>

          {results && (
            <Card className="mt-6 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Health Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(results).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-2 bg-background rounded">
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="text-muted-foreground">{value}</span>
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
