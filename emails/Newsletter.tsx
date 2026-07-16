import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Tailwind } from "@react-email/components";

interface NewsletterProps {
  title: string;
  previewText: string;
  sections: Array<{ heading: string; body: string; ctaLabel?: string; ctaUrl?: string }>;
  unsubscribeLink: string;
}

export default function Newsletter({ title, previewText, sections, unsubscribeLink }: NewsletterProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[480px] p-6">
            <Section className="rounded-xl bg-white p-8 shadow-sm">
              <Text className="text-2xl font-bold text-gray-900">{title}</Text>
              {sections.map((section, i) => (
                <Section key={i} className="mt-6">
                  <Text className="text-lg font-semibold text-gray-900">{section.heading}</Text>
                  <Text className="text-gray-600">{section.body}</Text>
                  {section.ctaLabel && section.ctaUrl && (
                    <Section className="mt-2">
                      <Button href={section.ctaUrl} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white no-underline">
                        {section.ctaLabel}
                      </Button>
                    </Section>
                  )}
                </Section>
              ))}
              <Hr className="my-6 border-gray-200" />
              <Text className="text-xs text-gray-400">
                <a href={unsubscribeLink} className="text-gray-400 underline">Unsubscribe</a> from these emails.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
