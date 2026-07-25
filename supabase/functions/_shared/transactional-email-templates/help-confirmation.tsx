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
  name?: string
  subject?: string
  message?: string
}

const HelpConfirmation = ({ name, subject, message }: Props) => {
  const displayName = name && name.trim().length > 0 ? name : 'there'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>We received your request — Wroob Support</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Wroob Support</Heading>
          </Section>
          <Section style={content}>
            <Text style={paragraph}>Hi {displayName},</Text>
            <Text style={paragraph}>Thank you for contacting Wroob Support.</Text>
            <Text style={paragraph}>
              We have received your message and our team will look into the matter.
              We will get back to you as soon as possible.
            </Text>
            <Section style={quote}>
              <Text style={quoteLabel}>Your request</Text>
              {subject ? (
                <Text style={quoteLine}>
                  <strong>Subject:</strong> {subject}
                </Text>
              ) : null}
              {message ? <Text style={quoteMsg}>{message}</Text> : null}
            </Section>
            <Text style={paragraph}>
              If you have any additional information, feel free to reply to this email.
            </Text>
            <Text style={paragraph}>
              Regards,
              <br />
              <strong>The Wroob Team</strong>
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            This is an automated confirmation for your Help Center submission on Wroob.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: HelpConfirmation,
  subject: 'We received your request — Wroob Support',
  displayName: 'Help Center Confirmation',
  previewData: {
    name: 'Jane',
    subject: 'Question about my application',
    message: 'Hi, I need help updating my resume.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#111' }
const container = { maxWidth: '600px', padding: '24px', margin: '0 auto' }
const header = { borderBottom: '3px solid #10b981', paddingBottom: '16px' }
const h1 = { margin: 0, fontSize: '24px', color: '#111' }
const content = { padding: '20px 0' }
const paragraph = { margin: '0 0 16px', fontSize: '15px', lineHeight: 1.6 }
const quote = {
  background: '#f6f8fa',
  borderLeft: '4px solid #10b981',
  padding: '16px',
  margin: '20px 0',
  borderRadius: '4px',
}
const quoteLabel = { margin: '0 0 8px', fontWeight: 'bold' as const, fontSize: '14px' }
const quoteLine = { margin: '0 0 8px', fontSize: '14px' }
const quoteMsg = { margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#6b7280' }
