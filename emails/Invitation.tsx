import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Tailwind } from "@react-email/components";

interface InvitationProps {
  inviterName: string;
  workspaceName: string;
  inviteLink: string;
}

export default function Invitation({ inviterName, workspaceName, inviteLink }: InvitationProps) {
  return (
    <Html>
      <Head />
      <Preview>{inviterName} invited you to {workspaceName}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[480px] p-6">
            <Section className="rounded-xl bg-white p-8 shadow-sm">
              <Text className="text-2xl font-bold text-gray-900">You're invited!</Text>
              <Text className="mt-4 text-gray-600">{inviterName} has invited you to join <strong>{workspaceName}</strong> on Noska.</Text>
              <Section className="mt-6 text-center">
                <Button href={inviteLink} className="rounded-lg bg-indigo-600 px-6 py-3 text-white no-underline">
                  Accept Invite
                </Button>
              </Section>
              <Hr className="my-6 border-gray-200" />
              <Text className="text-xs text-gray-400">If you didn't expect this invitation, you can ignore this email.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
