import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Tailwind } from "@react-email/components";

interface VerifyEmailProps {
  name: string;
  verificationLink: string;
}

export default function VerifyEmail({ name, verificationLink }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[480px] p-6">
            <Section className="rounded-xl bg-white p-8 shadow-sm">
              <Text className="text-2xl font-bold text-gray-900">Verify your email</Text>
              <Text className="mt-4 text-gray-600">Hi {name},</Text>
              <Text className="text-gray-600">
                Please verify your email address to start using Noska.
              </Text>
              <Section className="mt-6 text-center">
                <Button href={verificationLink} className="rounded-lg bg-indigo-600 px-6 py-3 text-white no-underline">
                  Verify Email
                </Button>
              </Section>
              <Hr className="my-6 border-gray-200" />
              <Text className="text-xs text-gray-400">This link expires in 24 hours.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
