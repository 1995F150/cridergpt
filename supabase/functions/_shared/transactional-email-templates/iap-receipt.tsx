/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Row, Column, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  productName?: string
  platform?: string
  amount?: string
  currency?: string
  transactionId?: string
  purchasedAt?: string
}

const PLATFORM_LABEL: Record<string, string> = {
  ios: 'Apple App Store',
  android: 'Google Play',
  web: 'CriderGPT Web',
  stripe: 'CriderGPT Web',
}

const IapReceipt = ({
  productName = 'CriderGPT Plus',
  platform = 'web',
  amount = '0.00',
  currency = 'USD',
  transactionId = '',
  purchasedAt = new Date().toISOString(),
}: Props) => {
  const date = new Date(purchasedAt).toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short',
  })
  return (
    <Html lang="en">
      <Head />
      <Preview>Receipt for {productName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Thanks for your purchase</Heading>
          <Text style={text}>
            We got your order. Here's your receipt for {productName}.
          </Text>
          <Section style={card}>
            <Row><Column style={lblCol}>Product</Column><Column style={valCol}>{productName}</Column></Row>
            <Hr style={hr} />
            <Row><Column style={lblCol}>Platform</Column><Column style={valCol}>{PLATFORM_LABEL[platform] ?? platform}</Column></Row>
            <Hr style={hr} />
            <Row><Column style={lblCol}>Amount</Column><Column style={valCol}>${amount} {currency}</Column></Row>
            <Hr style={hr} />
            <Row><Column style={lblCol}>Date</Column><Column style={valCol}>{date}</Column></Row>
            {transactionId ? (
              <>
                <Hr style={hr} />
                <Row><Column style={lblCol}>Transaction</Column><Column style={mono}>{transactionId}</Column></Row>
              </>
            ) : null}
          </Section>
          <Text style={text}>
            Subscription billing & refunds for App Store / Play Store purchases are handled
            by Apple or Google. Web purchases are managed through CriderGPT.
          </Text>
          <Text style={footer}>
            This is an automated receipt from no-reply@notify.cridergpt.com.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: IapReceipt,
  subject: (data: Record<string, unknown>) =>
    `Your CriderGPT receipt — ${(data.productName as string) ?? 'Purchase'}`,
  displayName: 'Purchase Receipt (IAP / Stripe)',
  previewData: {
    productName: 'CriderGPT Pro (Monthly)',
    platform: 'android',
    amount: '19.99',
    currency: 'USD',
    transactionId: 'GPA.1234-5678-9012-34567',
    purchasedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#003a73', margin: '0 0 14px' }
const text = { fontSize: '14px', color: '#3a3a3a', lineHeight: '1.6', margin: '0 0 18px' }
const card = { border: '1px solid #d4e4f7', borderRadius: '10px', padding: '16px 20px', margin: '0 0 20px' }
const hr = { borderColor: '#eef4fb', margin: '10px 0' }
const lblCol = { fontSize: '13px', color: '#666', width: '40%' }
const valCol = { fontSize: '14px', color: '#1a1a1a', fontWeight: 'bold' as const }
const mono = { fontSize: '12px', color: '#1a1a1a', fontFamily: 'Courier, monospace' as const, wordBreak: 'break-all' as const }
const footer = { fontSize: '12px', color: '#888', margin: '24px 0 0' }
