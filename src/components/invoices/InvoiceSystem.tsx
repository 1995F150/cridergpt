
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoiceCreator } from './InvoiceCreator';
import { InvoiceList } from './InvoiceList';
import { InvoiceTemplates } from './InvoiceTemplates';

export function InvoiceSystem() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">CriderGPT Invoice System</CardTitle>
        <p className="text-center text-muted-foreground">
          Create, manage, and export professional invoices with CriderGPT branding
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Invoice</TabsTrigger>
            <TabsTrigger value="manage">Manage Invoices</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-6">
            <InvoiceCreator />
          </TabsContent>

          <TabsContent value="manage" className="mt-6">
            <InvoiceList />
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <InvoiceTemplates />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
