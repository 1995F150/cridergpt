/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  planName?: string
  displayName?: string
  siteUrl?: string
}

const FEATURES: Record<string, string[]> = {
  Plus: [
    'Unlimited AI chat & memory recall',
    'Multi-modal uploads, camera & voice',
    'Priority access to new features',
  ],
  Pro: [
    'Everything in Plus, with higher limits',
    'AGI Mode & 150-agent swarm',
    'Custom voice profiles & TikTok Studio',
    'Advanced livestock & file tools',
  ],
  Lifetime: [
    'Pro tier forever — one payment',
    'Founders badge & early-access perks',
    'Locked-in pricing across every future upgrade',
  ],
}

const PlanWelcome = ({ planName = 'Plus', displayName, siteUrl = 'https://cridergpt.com' }: Props) => {
  const features = FEATURES[planName] ?? FEATURES.Plus
  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to CriderGPT {planName} — let's get rollin'</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to CriderGPT {planName}!</Heading>
          <Text style={text}>
            {displayName ? `Hey ${displayName},` : 'Hey there,'} thanks for stepping up.
            Your <strong>{planName}</strong> plan is live and every premium feature is unlocked.
          </Text>
          <Section style={card}>
            <Text style={cardTitle}>What you just unlocked:</Text>
            {features.map((f) => (
              <Text key={f} style={feature}>✓ {f}</Text>
            ))}
          </Section>
          <Button style={button} href={siteUrl}>
            Open CriderGPT
          </Button>
          <Text style={footer}>
            Questions? Just reply — wait, you can't, this is a no-reply box.
            Hit us up inside the app instead.{' '}
            <Link href={siteUrl} style={link}>cridergpt.com</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PlanWelcome,
  subject: (data: Record<string, unknown>) =>
    `Welcome to CriderGPT ${(data.planName as string) ?? 'Plus'}`,
  displayName: 'Plan Welcome',
  previewData: { planName: 'Pro', displayName: 'Jessie', siteUrl: 'https://cridergpt.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#003a73', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: '#eaf4ff', borderRadius: '10px', padding: '18px 20px', margin: '0 0 24px' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#003a73', margin: '0 0 10px' }
const feature = { fontSize: '14px', color: '#1a1a1a', margin: '4px 0' }
const button = {
  backgroundColor: '#005AB3', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const,
  borderRadius: '8px', padding: '12px 24px', textDecoration: 'none', display: 'inline-block',
}
const link = { color: '#005AB3', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#888', margin: '28px 0 0', lineHeight: '1.5' }
