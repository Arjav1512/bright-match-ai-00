import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  code?: string
  expiresInMinutes?: number
}

const AccountDeletionOtp = ({ code, expiresInMinutes = 10 }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Wroob account deletion verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Confirm account deletion</Heading>
        </Section>
        <Section style={content}>
          <Text style={paragraph}>
            We received a request to <strong>permanently delete</strong> your Wroob account.
            Use the verification code below to confirm.
          </Text>
          <Text style={codeStyle}>{code}</Text>
          <Text style={paragraph}>
            This code expires in {expiresInMinutes} minutes and can be used only once.
            Never share it with anyone — Wroob will never ask you for it.
          </Text>
          <Text style={warning}>
            Deleting your account is permanent. Your profile and account data cannot be recovered.
          </Text>
          <Text style={paragraph}>
            If you did not request this, you can safely ignore this email — nothing will be deleted.
          </Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated security email from Wroob.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountDeletionOtp,
  subject: 'Your Wroob account deletion code',
  displayName: 'Account Deletion Code',
  previewData: { code: '482913', expiresInMinutes: 10 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#111' }
const container = { maxWidth: '600px', padding: '24px', margin: '0 auto' }
const header = { borderBottom: '3px solid #dc2626', paddingBottom: '16px' }
const h1 = { margin: 0, fontSize: '24px', color: '#111' }
const content = { padding: '20px 0' }
const paragraph = { margin: '0 0 16px', fontSize: '15px', lineHeight: 1.6 }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '30px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  margin: '0 0 20px',
  color: '#111',
}
const warning = {
  margin: '0 0 16px',
  fontSize: '14px',
  lineHeight: 1.6,
  color: '#b91c1c',
  background: '#fef2f2',
  borderLeft: '4px solid #dc2626',
  padding: '12px 16px',
  borderRadius: '4px',
}
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#6b7280' }
