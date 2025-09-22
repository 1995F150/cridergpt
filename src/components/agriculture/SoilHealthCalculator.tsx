import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Beaker, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Sprout
} from "lucide-react";

export function SoilHealthCalculator() {
  const [soilData, setSoilData] = useState({
    pH: "",
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    organicMatter: "",
    acres: ""
  });

  const [recommendations, setRecommendations] = useState<any>(null);

  const analyzeSoil = () => {
    const pH = parseFloat(soilData.pH);
    const N = parseFloat(soilData.nitrogen);
    const P = parseFloat(soilData.phosphorus);
    const K = parseFloat(soilData.potassium);
    const OM = parseFloat(soilData.organicMatter);
    const acres = parseFloat(soilData.acres);

    if (!pH || !N || !P || !K || !acres) return;

    // pH Recommendations
    let pHRecommendation = "";
    let limeNeeded = 0;
    if (pH < 6.0) {
      limeNeeded = (6.5 - pH) * 2000 * acres; // Simplified lime calculation
      pHRecommendation = `Soil is acidic. Apply ${limeNeeded.toFixed(0)} lbs of agricultural lime.`;
    } else if (pH > 7.5) {
      pHRecommendation = "Soil is alkaline. Consider sulfur application or organic matter addition.";
    } else {
      pHRecommendation = "Soil pH is in optimal range for most crops.";
    }

    // NPK Recommendations
    const nRecommendation = N < 20 ? `Low nitrogen. Apply ${(30 - N) * acres} lbs N per acre.` : "Nitrogen levels adequate.";
    const pRecommendation = P < 30 ? `Low phosphorus. Apply ${(40 - P) * acres} lbs P2O5 per acre.` : "Phosphorus levels adequate.";
    const kRecommendation = K < 150 ? `Low potassium. Apply ${(200 - K) * acres} lbs K2O per acre.` : "Potassium levels adequate.";

    // Organic Matter
    const omRecommendation = OM < 3 ? "Low organic matter. Consider cover crops or compost addition." : "Good organic matter levels.";

    // Overall soil health score
    let score = 0;
    if (pH >= 6.0 && pH <= 7.5) score += 25;
    if (N >= 20) score += 25;
    if (P >= 30) score += 25;
    if (K >= 150) score += 25;

    setRecommendations({
      score,
      pH: pHRecommendation,
      nitrogen: nRecommendation,
      phosphorus: pRecommendation,
      potassium: kRecommendation,
      organicMatter: omRecommendation,
      limeNeeded,
      totalFertilizerCost: ((N < 20 ? (30 - N) * acres * 0.50 : 0) + 
                           (P < 30 ? (40 - P) * acres * 0.80 : 0) + 
                           (K < 150 ? (200 - K) * acres * 0.40 : 0))
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ffa-navy">
            <Beaker className="h-5 w-5" />
            Soil Health Calculator
            <Badge className="bg-ffa-harvest text-white">Precision Agriculture</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Analyze soil test results and get fertilizer/liming recommendations
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="pH">Soil pH</Label>
              <Input
                id="pH"
                type="number"
                step="0.1"
                placeholder="6.5"
                value={soilData.pH}
                onChange={(e) => setSoilData({...soilData, pH: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="nitrogen">Nitrogen (ppm)</Label>
              <Input
                id="nitrogen"
                type="number"
                placeholder="25"
                value={soilData.nitrogen}
                onChange={(e) => setSoilData({...soilData, nitrogen: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="phosphorus">Phosphorus (ppm)</Label>
              <Input
                id="phosphorus"
                type="number"
                placeholder="35"
                value={soilData.phosphorus}
                onChange={(e) => setSoilData({...soilData, phosphorus: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="potassium">Potassium (ppm)</Label>
              <Input
                id="potassium"
                type="number"
                placeholder="180"
                value={soilData.potassium}
                onChange={(e) => setSoilData({...soilData, potassium: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="organicMatter">Organic Matter (%)</Label>
              <Input
                id="organicMatter"
                type="number"
                step="0.1"
                placeholder="3.2"
                value={soilData.organicMatter}
                onChange={(e) => setSoilData({...soilData, organicMatter: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="acres">Field Size (acres)</Label>
              <Input
                id="acres"
                type="number"
                placeholder="50"
                value={soilData.acres}
                onChange={(e) => setSoilData({...soilData, acres: e.target.value})}
              />
            </div>
          </div>

          <Button onClick={analyzeSoil} className="w-full bg-ffa-harvest hover:bg-ffa-gold text-white">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analyze Soil Health
          </Button>

          {recommendations && (
            <div className="space-y-4 mt-6">
              <Card className="border-ffa-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sprout className="h-5 w-5" />
                    Soil Health Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(recommendations.score)}`}>
                      {recommendations.score}/100
                    </div>
                    <p className="text-sm text-muted-foreground">Soil Health Score</p>
                  </div>

                  <div className="space-y-3">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>pH Level:</strong> {recommendations.pH}
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Nitrogen:</strong> {recommendations.nitrogen}
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Phosphorus:</strong> {recommendations.phosphorus}
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Potassium:</strong> {recommendations.potassium}
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Organic Matter:</strong> {recommendations.organicMatter}
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="bg-ffa-sky/10 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Cost Estimates</h4>
                    {recommendations.limeNeeded > 0 && (
                      <p className="text-sm">Lime: ${(recommendations.limeNeeded * 0.03).toFixed(2)}</p>
                    )}
                    <p className="text-sm">Fertilizer: ${recommendations.totalFertilizerCost.toFixed(2)}</p>
                    <p className="text-sm font-semibold">
                      Total: ${(recommendations.totalFertilizerCost + (recommendations.limeNeeded * 0.03)).toFixed(2)}
                    </p>
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