import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Privacy Policy", description: "How IvyUp collects, uses, keeps, and protects information." };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="October 29, 2026"
      intro={
        <p>
          IvyUp (“IvyUp,” “we,” “us”) connects families with tutors who are current Ivy League students. This policy explains what we collect through ivyup.org, why, how long we keep it, and the choices you have. We wrote it in plain language on purpose.
        </p>
      }
      sections={[
        {
          id: "collect",
          title: "What we collect",
          body: (
            <>
              <p><strong>From parents and guardians</strong> through our sign-up form: your name, email address, phone number, and whether you want text updates.</p>
              <p><strong>About your student</strong>: first name, grade, the tests they are preparing for (including specific AP exams), and, only if you choose to give them, the student&apos;s phone number, email address, and update preferences. You may also tell us a preferred tutor.</p>
              <p><strong>From tutor applicants</strong>: the information in the tutor application, including contact details, school, year, major, subjects, availability, optional test scores, experience, written answers, and acknowledgments.</p>
              <p><strong>From anyone who writes to us</strong> through the contact form: name, email, optional phone number, and your message.</p>
              <p><strong>During tutoring</strong>: scheduling details, homework assigned, session notes written by your student&apos;s tutor, and recordings of video sessions.</p>
              <p><strong>Technical information</strong>: like most websites, our hosting provider processes IP addresses and basic device information to deliver pages and prevent abuse. We store a one-way scrambled form of IP addresses to limit spam submissions. We do not use advertising trackers.</p>
              <p>We never ask for a student&apos;s last name, home address, school records, or any payment information on this website.</p>
            </>
          ),
        },
        {
          id: "use",
          title: "How we use it",
          body: (
            <ul>
              <li>To understand your student&apos;s needs and match them with a suitable tutor.</li>
              <li>To contact you about consultations, scheduling, sessions, and progress, by email or phone, as you agreed when you submitted the form.</li>
              <li>To send text messages only to the numbers whose owners opted in to texts.</li>
              <li>To run tutoring: calendars, homework tracking, session notes, and recordings.</li>
              <li>To review tutor applications, schedule interviews, and manage our tutor team.</li>
              <li>To follow up with families and applicants we have worked with or heard from, including to check in, re-engage, or share relevant IvyUp services (student retention and outreach).</li>
              <li>To keep the site secure and prevent spam or misuse.</li>
            </ul>
          ),
        },
        {
          id: "retention",
          title: "How long we keep it",
          body: (
            <>
              <p>
                Information submitted through this site is retained at IvyUp&apos;s discretion, including after tutoring ends or if tutoring never begins, so that we can maintain records, support returning students, follow up with families, and reach out about IvyUp services.
              </p>
              <p>You can ask us to delete your information at any time (see “Your choices” below), and we will honor that request unless we need to keep something to meet a legal obligation or resolve a dispute.</p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "Who sees it",
          body: (
            <>
              <ul>
                <li><strong>IvyUp staff</strong> who manage families and tutors.</li>
                <li><strong>Your student&apos;s assigned tutor</strong>, who sees only the students they teach, including contact details and update preferences needed to run sessions.</li>
                <li><strong>Service providers</strong> who run our site on our behalf, under their own security and privacy commitments: Supabase (database and sign-in), Netlify (website hosting), and Resend (email delivery).</li>
                <li><strong>Authorities</strong>, only when the law requires it or to protect someone&apos;s safety.</li>
              </ul>
              <p><strong>We do not sell or rent personal information</strong>, and we do not share it with advertisers.</p>
            </>
          ),
        },
        {
          id: "choices",
          title: "Your choices",
          body: (
            <ul>
              <li><strong>Updates:</strong> to stop texts or emails about sessions, reply STOP to a text or email hello@ivyup.org.</li>
              <li><strong>Access, correction, deletion:</strong> email hello@ivyup.org from the address you gave us and tell us what you&apos;d like. We respond within 30 days.</li>
              <li><strong>Recordings:</strong> you may ask to review or delete a session recording involving your student.</li>
            </ul>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: (
            <>
              <p>
                IvyUp is intended for parents and legal guardians to sign up their children. Students under 18 should not submit the sign-up form themselves; a parent or guardian must do it. We collect only a student&apos;s first name and grade, plus optional contact details the parent chooses to share.
              </p>
              <p>If you believe a child under 13 has given us information without a parent&apos;s involvement, email hello@ivyup.org and we will delete it.</p>
            </>
          ),
        },
        {
          id: "security",
          title: "Security",
          body: (
            <p>
              Information is encrypted in transit, stored with access controls that limit each person to what their role requires (for example, tutors only see their own students), and protected by individual logins. No system is perfectly secure, so we also keep what we ask for to a minimum.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes and contact",
          body: (
            <>
              <p>If we change this policy, we&apos;ll update the date at the top. Significant changes will be shared by email with families we are working with.</p>
              <p>Questions: <a href="mailto:hello@ivyup.org" className="font-semibold text-ivy-700 underline underline-offset-4">hello@ivyup.org</a></p>
            </>
          ),
        },
      ]}
    />
  );
}
