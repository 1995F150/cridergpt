/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  displayName?: string
  daysAway?: number
  siteUrl?: string
  tier?: string
}

const InactiveReminder = ({
  displayName, daysAway = 7, siteUrl = 'https://cridergpt.com', tier = 'Free',
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>We've been missin' ya at CriderGPT</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>It's been a minute, {displayName || 'partner'}</Heading>
        <Text style={text}>
          You haven't logged into CriderGPT in {daysAway} days. Your chats,
          livestock records, and AI memory are still right where you left 'em.
        </Text>
        <Section style={card}>
          <Text style={cardTitle}>While you were away:</Text>
          <Text style={feature}>• New AGI Mode tools dropped</Text>
          <Text style={feature}>• Snapchat & TikTok studios got an upgrade</Text>
          <Text style={feature}>• Livestock NFC scanner is faster than ever</Text>
        </Section>
        {tier === 'Free' ? (
          <Text style={text}>
            Heads up: <strong>Plus</strong> and <strong>Pro</strong> unlock unlimited chat,
            voice cloning, and the full agent swarm. Worth a peek.
          </Text>
        ) : null}
        <Button style={button} href={siteUrl}>
          Jump back in
        </Button>
        <Text style={footer}>
          Don't want these reminders?{' '}
          <Link href={`${siteUrl}/unsubscribe`} style={link}>Unsubscribe</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InactiveReminder,
  subject: "We've been missin' ya — your CriderGPT is waitin'",
  displayName: 'Inactive User Reminder',
  previewData: { displayName: 'Jessie', daysAway: 7, siteUrl: 'https://cridergpt.com', tier: 'Free' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#003a73', margin: '0 0 14px' }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: '#f4f9ff', borderRadius: '10px', padding: '16px 20px', margin: '0 0 20px' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#003a73', margin: '0 0 8px' }
const feature = { fontSize: '14px', color: '#1a1a1a', margin: '4px 0' }
const button = {
  backgroundColor: '#005AB3', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const,
  borderRadius: '8px', padding: '12px 24px', textDecoration: 'none', display: 'inline-block',
}
const link = { color: '#005AB3', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#888', margin: '24px 0 0' }
