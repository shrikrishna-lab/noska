import { Html, Head, Preview, Body, Container, Section, Text, Hr, Tailwind } from "@react-email/components";

interface WaitlistRejectedProps {
  name: string;
}

export default function WaitlistRejected({ name }: WaitlistRejectedProps) {
  return (
    <Html>
      <Head />
      <Preview>Waitlist update from Noska</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[480px] p-6">
            <Section className="rounded-xl bg-white p-8 shadow-sm">
              <Text className="text-2xl font-bold text-gray-900">Waitlist Update</Text>
              <Text className="mt-4 text-gray-600">Hi {name},</Text>
              <Text className="text-gray-600">
                Thank you for your interest in Noska. Unfortunately, at this time we are not able to offer you access.
              </Text>
              <Text className="text-gray-600">
                We'll reach out if anything changes. Thank you for your understanding.
              </Text>
              <Hr className="my-6 border-gray-200" />
              <Text className="text-xs text-gray-400">© 2026 Noska. All rights reserved.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
