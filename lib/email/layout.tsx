import { Body, Container, Head, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";

const paper = "#f7f4ec";
const surface = "#fbf9f4";
const ink = "#1a1c18";
const inkMuted = "#4a4a42";
const ivy = "#1f5a3d";
const line = "#dad4c4";

/** Branded wrapper used by every IvyUp email. Body text is split on blank lines. */
export function EmailLayout({ preview, body, footerNote }: { preview: string; body: string; footerNote?: string }) {
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: paper, margin: 0, padding: "32px 16px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", backgroundColor: surface, border: `1px solid ${line}`, borderRadius: 10, padding: "32px 32px 24px" }}>
          <Text style={{ margin: "0 0 24px", fontSize: 22, color: ivy, letterSpacing: "-0.01em" }}>IvyUp</Text>
          <Section>
            {paragraphs.map((p, i) => (
              <Text key={i} style={{ margin: "0 0 16px", fontSize: 16, lineHeight: "26px", color: ink, whiteSpace: "pre-line", fontFamily: "Helvetica, Arial, sans-serif" }}>
                {p}
              </Text>
            ))}
          </Section>
          <Hr style={{ borderColor: line, margin: "24px 0 16px" }} />
          <Text style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: inkMuted, fontFamily: "Helvetica, Arial, sans-serif" }}>
            {footerNote ?? "IvyUp · Ivy League tutors for SAT, ACT, AP and admissions tests"}
            <br />
            <Link href="https://ivyup.org" style={{ color: ivy }}>ivyup.org</Link> · hello@ivyup.org
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
