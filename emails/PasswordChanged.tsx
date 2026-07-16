import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Tailwind } from "@react-email/components";

interface PasswordChangedProps {
  name: string;
}

export default function PasswordChanged({ name }: PasswordChangedProps) {
  return (
    <Html>
      <Head />
      <Preview>Your password has been changed</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[480px] p-6">
            <Section className="rounded-xl bg-white p-8 shadow-sm">
              <Text className="text-2xl font-bold text-gray-900">Password Changed</Text>
              <Text className="mt-4 text-gray-600">Hi {name},</Text>
              <Text className="text-gray-600">
                Your Noska account password was successfully changed.
              </Text>
              <Text className="text-gray-600">
                If you did not make this change, please contact support immediately.
              </Text>
              <Section className="mt-6 text-center">
                <Button href="https://noska.me" className="rounded-lg bg-indigo-600 px-6 py-3 text-white no-underline">
                  Go to Noska
                </Button>
              </Section>
              <Hr className="my-6 border-gray-200" />
              <Text className="text-xs text-gray-400">© 2026 Noska. All rights reserved.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
