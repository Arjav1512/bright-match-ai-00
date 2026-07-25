/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  fromEmail?: string
  subject?: string
  message?: string
}

const SupportNotification = ({ fromEmail, subject, message }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New Help Center message from {fromEmail || 'a user'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Help Center Message</Heading>
        <Text style={text}><strong>From:</strong> {fromEmail || 'unknown'}</Text>
        <Text style={text}><strong>Subject:</strong> {subject || '(no subject)'}</Text>
        <Hr style={hr} />
        <Text style={{ ...text, whiteSpace: 'pre-wrap' as const }}>{message || ''}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SupportNotification,
  subject: (data: Props) => `[Help Center] ${data.subject || 'New message'}`,
  displayName: 'Support notification',
  to: 'yourwroob@gmail.com',
  previewData: {
    fromEmail: 'user@example.com',
    subject: 'Test subject',
    message: 'Sample message body.',
  },
} satisfies TemplateEntry

export default SupportNotification

const main = { backgroundColor: '#ffffff', fontFamily: 'Satoshi, Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '620px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(220, 25%, 10%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(220, 25%, 10%)', lineHeight: '1.6', margin: '0 0 12px' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
