
import React from 'react';
import { FeatureGate } from '@/components/FeatureGate';
import { useFeatureGating } from '@/hooks/useFeatureGating';

import { InvoiceSystem } from '@/components/invoices/InvoiceSystem';

export function InvoicePanel() {
  const { hasFeatureAccess } = useFeatureGating();

  if (!hasFeatureAccess('invoicing_system')) {
    return (
      <div className="flex-1 p-8">
        <FeatureGate feature="invoicing_system">
          <div></div>
        </FeatureGate>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <InvoiceSystem />
    </div>
  );
}
