import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Tailwind } from "@react-email/components";

interface WaitlistApprovedProps {
  name: string;
  inviteCode: string;
}

export default function WaitlistApproved({ name, inviteCode }: WaitlistApprovedProps) {
  return (
    <Html>
      <Head />
      <Preview>You're in! Join Noska now.</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[480px] p-6">
            <Section className="rounded-xl bg-white p-8 shadow-sm">
              <Text className="text-2xl font-bold text-gray-900">You're in! 🎉</Text>
              <Text className="mt-4 text-gray-600">Hey {name},</Text>
              <Text className="text-gray-600">
                Great news — you've been approved from the waitlist! Use the invite code below to create your account:
              </Text>
              <Section className="my-6 rounded-lg bg-gray-100 p-4 text-center">
                <Text className="text-3xl font-bold tracking-widest text-indigo-600">{inviteCode}</Text>
              </Section>
              <Section className="text-center">
                <Button href={`https://noska.me/launch?code=${inviteCode}`} className="rounded-lg bg-indigo-600 px-6 py-3 text-white no-underline">
                  Create Account
                </Button>
              </Section>
              <Hr className="my-6 border-gray-200" />
              <Text className="text-xs text-gray-400">If you didn't request access, you can ignore this email.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
