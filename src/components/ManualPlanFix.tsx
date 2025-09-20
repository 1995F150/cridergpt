import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export function ManualPlanFix() {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fixPlan = async () => {
    if (!user || !selectedPlan) {
      toast({
        title: "Error",
        description: "Please select a plan to fix.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('fix-user-plan', {
        body: { plan: selectedPlan }
      });

      if (error) throw error;

      toast({
        title: "Plan Fixed!",
        description: `Your plan has been manually updated to ${selectedPlan}. Please refresh the page to see changes.`,
      });

      // Force page refresh after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Error fixing plan:', error);
      toast({
        title: "Fix Failed",
        description: "Failed to fix plan. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Manual Plan Fix
        </CardTitle>
        <CardDescription>
          If you purchased a plan but it's not showing correctly, use this to fix it manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">What plan did you purchase?</label>
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger>
              <SelectValue placeholder="Select the plan you bought" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plus">CriderGPT Plus</SelectItem>
              <SelectItem value="pro">CriderGPT Pro</SelectItem>
              <SelectItem value="free">Reset to Free</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={fixPlan} 
          disabled={loading || !selectedPlan}
          className="w-full"
        >
          {loading ? (
            <>Fixing Plan...</>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Fix My Plan
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground">
          <strong>Note:</strong> This is a temporary fix. The underlying webhook issue has been resolved for future purchases.
        </div>
      </CardContent>
    </Card>
  );
}