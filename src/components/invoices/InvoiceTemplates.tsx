
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

export function InvoiceTemplates() {
  const templates = [
    {
      id: 'standard',
      name: 'Standard Invoice',
      description: 'Basic professional invoice template with CriderGPT branding',
      preview: '/api/placeholder/300/400'
    },
    {
      id: 'detailed',
      name: 'Detailed Invoice',
      description: 'Comprehensive invoice with detailed line items and calculations',
      preview: '/api/placeholder/300/400'
    },
    {
      id: 'service',
      name: 'Service Invoice',
      description: 'Template optimized for service-based businesses',
      preview: '/api/placeholder/300/400'
    },
    {
      id: 'product',
      name: 'Product Invoice',
      description: 'Template designed for product sales with inventory details',
      preview: '/api/placeholder/300/400'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Invoice Templates</h2>
          <p className="text-muted-foreground">Choose from professional templates with CriderGPT branding</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                <FileText className="h-16 w-16 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{template.description}</p>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Preview
                </Button>
                <Button size="sm" className="flex-1">
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Branding Elements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• CriderGPT logo and colors</li>
                <li>• Professional header and footer</li>
                <li>• Consistent typography</li>
                <li>• Custom watermarks</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Automatic calculations</li>
                <li>• Tax and discount support</li>
                <li>• Multiple currency options</li>
                <li>• Terms and conditions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
