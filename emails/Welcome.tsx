import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Tailwind } from "@react-email/components";

interface WelcomeProps {
  name: string;
  workspaceName?: string;
}

export default function Welcome({ name, workspaceName = "My Workspace" }: WelcomeProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Noska!</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[480px] p-6">
            <Section className="rounded-xl bg-white p-8 shadow-sm">
              <Text className="text-2xl font-bold text-gray-900">Welcome to Noska!</Text>
              <Text className="mt-4 text-gray-600">Hi {name},</Text>
              <Text className="text-gray-600">
                Welcome to Noska! Your workspace <strong>{workspaceName}</strong> is ready.
              </Text>
              <Text className="text-gray-600">
                Get started by creating your first note, inviting team members, or exploring the templates.
              </Text>
              <Section className="mt-6 text-center">
                <Button href="https://noska.me" className="rounded-lg bg-indigo-600 px-6 py-3 text-white no-underline">
                  Go to Dashboard
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
