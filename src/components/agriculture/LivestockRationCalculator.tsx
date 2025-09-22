import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Heart, 
  Beef,
  Scale,
  DollarSign,
  TrendingUp
} from "lucide-react";

export function LivestockRationCalculator() {
  const [animalData, setAnimalData] = useState({
    species: "",
    weight: "",
    age: "",
    productionStage: "",
    milkProduction: "",
    targetGain: "",
    headCount: ""
  });

  const [rationPlan, setRationPlan] = useState<any>(null);

  const feedIngredients = {
    corn: { protein: 8.5, energy: 1.54, cost: 6.50 },
    soybeanMeal: { protein: 44.0, energy: 1.48, cost: 420.00 },
    alfalfaHay: { protein: 18.0, energy: 1.02, cost: 180.00 },
    grassHay: { protein: 8.0, energy: 0.87, cost: 120.00 },
    cottonSeed: { protein: 23.0, energy: 1.15, cost: 240.00 },
    mineralMix: { protein: 0, energy: 0, cost: 800.00 }
  };

  const animalRequirements = {
    cattle: {
      lactating: { protein: 16, energy: 1.20, dmIntake: 3.5 },
      growing: { protein: 12, energy: 1.10, dmIntake: 2.5 },
      maintenance: { protein: 8, energy: 1.00, dmIntake: 2.0 }
    },
    goats: {
      lactating: { protein: 14, energy: 1.10, dmIntake: 4.0 },
      growing: { protein: 12, energy: 1.05, dmIntake: 3.5 },
      maintenance: { protein: 8, energy: 0.95, dmIntake: 3.0 }
    },
    poultry: {
      laying: { protein: 16, energy: 1.25, dmIntake: 0.25 },
      growing: { protein: 20, energy: 1.30, dmIntake: 0.20 },
      maintenance: { protein: 12, energy: 1.15, dmIntake: 0.15 }
    }
  };

  const calculateRation = () => {
    const weight = parseFloat(animalData.weight);
    const headCount = parseFloat(animalData.headCount);
    
    if (!animalData.species || !weight || !headCount || !animalData.productionStage) return;

    const requirements = animalRequirements[animalData.species as keyof typeof animalRequirements];
    const stage = requirements[animalData.productionStage as keyof typeof requirements];

    if (!stage) return;

    // Calculate dry matter intake
    const dmIntakePerHead = (weight * stage.dmIntake) / 100; // as % of body weight
    const totalDMIntake = dmIntakePerHead * headCount;

    // Adjust for milk production if applicable
    let proteinReq = stage.protein;
    let energyReq = stage.energy;
    
    if (animalData.milkProduction && animalData.species === 'cattle') {
      const milkProd = parseFloat(animalData.milkProduction);
      proteinReq += milkProd * 0.5; // Additional protein for milk
      energyReq += milkProd * 0.05; // Additional energy for milk
    }

    // Simple ration formulation (Pearson Square method approximation)
    let cornPercent = 40;
    let soybeanPercent = 15;
    let hayPercent = 40;
    let mineralPercent = 5;

    // Adjust based on requirements
    if (proteinReq > 12) {
      soybeanPercent += 5;
      cornPercent -= 5;
    }
    if (energyReq > 1.15) {
      cornPercent += 5;
      hayPercent -= 5;
    }

    // Calculate amounts (lbs per day)
    const cornAmount = (totalDMIntake * cornPercent) / 100;
    const soybeanAmount = (totalDMIntake * soybeanPercent) / 100;
    const hayAmount = (totalDMIntake * hayPercent) / 100;
    const mineralAmount = (totalDMIntake * mineralPercent) / 100;

    // Calculate nutritional content
    const totalProtein = (
      (cornAmount * feedIngredients.corn.protein) +
      (soybeanAmount * feedIngredients.soybeanMeal.protein) +
      (hayAmount * feedIngredients.alfalfaHay.protein)
    ) / totalDMIntake;

    const totalEnergy = (
      (cornAmount * feedIngredients.corn.energy) +
      (soybeanAmount * feedIngredients.soybeanMeal.energy) +
      (hayAmount * feedIngredients.alfalfaHay.energy)
    ) / totalDMIntake;

    // Calculate costs
    const dailyCost = (
      (cornAmount * feedIngredients.corn.cost / 2000) +
      (soybeanAmount * feedIngredients.soybeanMeal.cost / 2000) +
      (hayAmount * feedIngredients.alfalfaHay.cost / 2000) +
      (mineralAmount * feedIngredients.mineralMix.cost / 2000)
    );

    const monthlyCost = dailyCost * 30;
    const costPerHead = dailyCost / headCount;

    setRationPlan({
      dmIntakePerHead: dmIntakePerHead.toFixed(1),
      totalDMIntake: totalDMIntake.toFixed(1),
      corn: cornAmount.toFixed(1),
      soybeanMeal: soybeanAmount.toFixed(1),
      hay: hayAmount.toFixed(1),
      mineral: mineralAmount.toFixed(1),
      totalProtein: totalProtein.toFixed(1),
      totalEnergy: totalEnergy.toFixed(2),
      proteinTarget: proteinReq.toFixed(1),
      energyTarget: energyReq.toFixed(2),
      dailyCost: dailyCost.toFixed(2),
      monthlyCost: monthlyCost.toFixed(2),
      costPerHead: costPerHead.toFixed(2),
      cornPercent: cornPercent.toFixed(1),
      soybeanPercent: soybeanPercent.toFixed(1),
      hayPercent: hayPercent.toFixed(1),
      mineralPercent: mineralPercent.toFixed(1)
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ffa-navy">
            <Heart className="h-5 w-5" />
            Livestock Feed Rations Pro
            <Badge className="bg-ffa-field text-white">Nutrition Science</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Balanced diet calculator for cattle, goats, and poultry
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="species">Animal Species</Label>
              <Select value={animalData.species} onValueChange={(value) => setAnimalData({...animalData, species: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cattle">Cattle</SelectItem>
                  <SelectItem value="goats">Goats</SelectItem>
                  <SelectItem value="poultry">Poultry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="productionStage">Production Stage</Label>
              <Select value={animalData.productionStage} onValueChange={(value) => setAnimalData({...animalData, productionStage: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lactating">Lactating</SelectItem>
                  <SelectItem value="growing">Growing</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="weight">Average Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="1200"
                value={animalData.weight}
                onChange={(e) => setAnimalData({...animalData, weight: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="headCount">Number of Animals</Label>
              <Input
                id="headCount"
                type="number"
                placeholder="25"
                value={animalData.headCount}
                onChange={(e) => setAnimalData({...animalData, headCount: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="age">Age (months)</Label>
              <Input
                id="age"
                type="number"
                placeholder="24"
                value={animalData.age}
                onChange={(e) => setAnimalData({...animalData, age: e.target.value})}
              />
            </div>
          </div>

          {(animalData.species === 'cattle' && animalData.productionStage === 'lactating') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="milkProduction">Milk Production (lbs/day)</Label>
                <Input
                  id="milkProduction"
                  type="number"
                  placeholder="50"
                  value={animalData.milkProduction}
                  onChange={(e) => setAnimalData({...animalData, milkProduction: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="targetGain">Target Weight Gain (lbs/day)</Label>
                <Input
                  id="targetGain"
                  type="number"
                  step="0.1"
                  placeholder="2.5"
                  value={animalData.targetGain}
                  onChange={(e) => setAnimalData({...animalData, targetGain: e.target.value})}
                />
              </div>
            </div>
          )}

          <Button onClick={calculateRation} className="w-full bg-ffa-field hover:bg-ffa-harvest text-white">
            <Scale className="h-4 w-4 mr-2" />
            Calculate Balanced Ration
          </Button>

          {rationPlan && (
            <div className="space-y-4 mt-6">
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Beef className="h-5 w-5" />
                    Daily Feed Ration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">Feed Amounts (lbs/day)</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Corn ({rationPlan.cornPercent}%):</span>
                          <span className="font-semibold">{rationPlan.corn} lbs</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Soybean Meal ({rationPlan.soybeanPercent}%):</span>
                          <span className="font-semibold">{rationPlan.soybeanMeal} lbs</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hay ({rationPlan.hayPercent}%):</span>
                          <span className="font-semibold">{rationPlan.hay} lbs</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mineral Mix ({rationPlan.mineralPercent}%):</span>
                          <span className="font-semibold">{rationPlan.mineral} lbs</span>
                        </div>
                        <hr className="my-2" />
                        <div className="flex justify-between font-bold">
                          <span>Total DM Intake:</span>
                          <span>{rationPlan.totalDMIntake} lbs</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-700 mb-2">Nutritional Analysis</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Crude Protein:</span>
                          <span className="font-semibold">{rationPlan.totalProtein}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Target Protein:</span>
                          <span>{rationPlan.proteinTarget}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Energy (NEm):</span>
                          <span className="font-semibold">{rationPlan.totalEnergy} Mcal/lb</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Target Energy:</span>
                          <span>{rationPlan.energyTarget} Mcal/lb</span>
                        </div>
                        <div className="flex justify-between">
                          <span>DM per Head:</span>
                          <span className="font-semibold">{rationPlan.dmIntakePerHead} lbs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-ffa-harvest/10 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Cost Analysis
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Daily Total:</span>
                        <p className="text-lg font-bold">${rationPlan.dailyCost}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Per Head/Day:</span>
                        <p className="text-lg font-bold">${rationPlan.costPerHead}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Monthly Total:</span>
                        <p className="text-lg font-bold">${rationPlan.monthlyCost}</p>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Feeding Tips:</strong> Feed ration 2-3 times daily for cattle, 
                      ensure fresh water availability, and adjust amounts based on body condition 
                      and performance. Transition feed changes gradually over 7-14 days.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-yellow-700">Feeding Management</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Split daily ration into 2-3 feedings</li>
                      <li>• Provide fresh, clean water at all times</li>
                      <li>• Monitor body condition score weekly</li>
                      <li>• Adjust ration based on weather and performance</li>
                      <li>• Store feeds in dry, rodent-proof areas</li>
                      <li>• Test forages for nutritional content</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}