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
  TrendingUp,
  FileDown
} from "lucide-react";
import jsPDF from "jspdf";

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
    const dmIntakePerHead = (weight * stage.dmIntake) / 100; 
    const totalDMIntake = dmIntakePerHead * headCount;

    let proteinReq = stage.protein;
    let energyReq = stage.energy;
    
    if (animalData.milkProduction && animalData.species === 'cattle') {
      const milkProd = parseFloat(animalData.milkProduction);
      proteinReq += milkProd * 0.5;
      energyReq += milkProd * 0.05;
    }

    let cornPercent = 40;
    let soybeanPercent = 15;
    let hayPercent = 40;
    let mineralPercent = 5;

    if (proteinReq > 12) {
      soybeanPercent += 5;
      cornPercent -= 5;
    }
    if (energyReq > 1.15) {
      cornPercent += 5;
      hayPercent -= 5;
    }

    const cornAmount = (totalDMIntake * cornPercent) / 100;
    const soybeanAmount = (totalDMIntake * soybeanPercent) / 100;
    const hayAmount = (totalDMIntake * hayPercent) / 100;
    const mineralAmount = (totalDMIntake * mineralPercent) / 100;

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

  const exportPDF = () => {
    if (!rationPlan) return;

    const today = new Date();
    const fileName = `${animalData.species || "ration"}_${today.toISOString().split("T")[0]}.pdf`;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Livestock Feed Ration Report", 14, 20);

    doc.setFontSize(12);
    doc.text(`Species: ${animalData.species}`, 14, 30);
    doc.text(`Production Stage: ${animalData.productionStage}`, 14, 36);
    doc.text(`Weight: ${animalData.weight} lbs`, 14, 42);
    doc.text(`Head Count: ${animalData.headCount}`, 14, 48);

    doc.setFontSize(14);
    doc.text("Daily Feed Ration (lbs)", 14, 60);
    doc.setFontSize(12);
    doc.text(`Corn (${rationPlan.cornPercent}%): ${rationPlan.corn}`, 14, 68);
    doc.text(`Soybean Meal (${rationPlan.soybeanPercent}%): ${rationPlan.soybeanMeal}`, 14, 74);
    doc.text(`Hay (${rationPlan.hayPercent}%): ${rationPlan.hay}`, 14, 80);
    doc.text(`Mineral Mix (${rationPlan.mineralPercent}%): ${rationPlan.mineral}`, 14, 86);
    doc.text(`Total DM Intake: ${rationPlan.totalDMIntake} lbs`, 14, 92);

    doc.setFontSize(14);
    doc.text("Nutritional Analysis", 14, 108);
    doc.setFontSize(12);
    doc.text(`Crude Protein: ${rationPlan.totalProtein}% (Target: ${rationPlan.proteinTarget}%)`, 14, 116);
    doc.text(`Energy: ${rationPlan.totalEnergy} (Target: ${rationPlan.energyTarget})`, 14, 122);
    doc.text(`DM Intake per Head: ${rationPlan.dmIntakePerHead} lbs`, 14, 128);

    doc.setFontSize(14);
    doc.text("Cost Analysis", 14, 144);
    doc.setFontSize(12);
    doc.text(`Daily Total: $${rationPlan.dailyCost}`, 14, 152);
    doc.text(`Per Head/Day: $${rationPlan.costPerHead}`, 14, 158);
    doc.text(`Monthly Total: $${rationPlan.monthlyCost}`, 14, 164);

    doc.save(fileName);
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
          {/* form inputs (same as before) */}

          <Button onClick={calculateRation} className="w-full bg-ffa-field hover:bg-ffa-harvest text-white">
            <Scale className="h-4 w-4 mr-2" />
            Calculate Balanced Ration
          </Button>

          {rationPlan && (
            <div className="space-y-4 mt-6">
              {/* ration results (same as before) */}

              <Button 
                onClick={exportPDF} 
                className="w-full bg-ffa-navy hover:bg-ffa-harvest text-white mt-4"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

  