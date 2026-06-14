/// <reference types="npm:@types/react@18.3.1" />
import type * as React from 'npm:react@18.3.1'

import { template as planWelcome } from './plan-welcome.tsx'
import { template as iapReceipt } from './iap-receipt.tsx'
import { template as inactiveReminder } from './inactive-reminder.tsx'

export interface TemplateEntry {
  // deno-lint-ignore no-explicit-any
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, unknown>) => string)
  displayName?: string
  // deno-lint-ignore no-explicit-any
  previewData?: any
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'plan-welcome': planWelcome,
  'iap-receipt': iapReceipt,
  'inactive-reminder': inactiveReminder,
}
