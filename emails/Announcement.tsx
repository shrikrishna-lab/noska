import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Tailwind } from "@react-email/components";

interface AnnouncementProps {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  recipientName?: string;
}

export default function Announcement({ title, message, ctaLabel, ctaUrl, recipientName }: AnnouncementProps) {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[480px] p-6">
            <Section className="rounded-xl bg-white p-8 shadow-sm">
              <Text className="text-2xl font-bold text-gray-900">{title}</Text>
              {recipientName && <Text className="mt-2 text-gray-600">Hi {recipientName},</Text>}
              <Text className="mt-4 text-gray-600">{message}</Text>
              {ctaLabel && ctaUrl && (
                <Section className="mt-6 text-center">
                  <Button href={ctaUrl} className="rounded-lg bg-indigo-600 px-6 py-3 text-white no-underline">
                    {ctaLabel}
                  </Button>
                </Section>
              )}
              <Hr className="my-6 border-gray-200" />
              <Text className="text-xs text-gray-400">You are receiving this because you use Noska.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
