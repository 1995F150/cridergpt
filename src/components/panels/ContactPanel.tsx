
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ContactPanel() {
  const { toast } = useToast();

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Contact Information</h1>
        <p className="text-muted-foreground">
          Get in touch with Jessie Crider, creator of CriderGPT
        </p>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Details
            </CardTitle>
            <CardDescription>
              Reach out for support, feedback, or collaboration opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">jessiecrider3@gmail.com</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard("jessiecrider3@gmail.com", "Email")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">+1 (276) 613-8641</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard("12766138641", "Phone number")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <a href="mailto:jessiecrider3@gmail.com?subject=CriderGPT Inquiry" target="_blank" rel="noopener noreferrer">
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </a>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <a href="tel:+12766138641" target="_blank" rel="noopener noreferrer">
                <Phone className="mr-2 h-4 w-4" />
                Call Now
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
