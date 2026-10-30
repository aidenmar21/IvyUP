import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Terms of Use", description: "The terms that apply when you use ivyup.org and IvyUp tutoring." };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Use"
      updated="October 29, 2026"
      intro={
        <p>
          These terms apply to ivyup.org and to tutoring arranged through IvyUp. By using the site or submitting a form, you agree to them. If you don&apos;t agree, please don&apos;t use the site.
        </p>
      }
      sections={[
        {
          id: "who",
          title: "Who IvyUp is for",
          body: (
            <>
              <p>
                IvyUp is meant for <strong>parents and legal guardians to sign up their children</strong> for tutoring. A student may sign up on their own only if they are 18 or older. By submitting the sign-up form, you confirm that you are the student&apos;s parent or legal guardian, or that you are the student and 18 or older.
              </p>
              <p>Tutor applicants must be 18 or older.</p>
            </>
          ),
        },
        {
          id: "process",
          title: "How the process works",
          body: (
            <ul>
              <li>You submit the sign-up form. Submitting it does not create any obligation for you or for IvyUp.</li>
              <li>We contact you to book a free consultation.</li>
              <li>If you choose to proceed, we match your student with a tutor and schedule sessions.</li>
              <li>IvyUp may decline or end a tutoring arrangement at its discretion.</li>
            </ul>
          ),
        },
        {
          id: "information",
          title: "Information you give us",
          body: (
            <>
              <p>
                You agree that the information you provide is accurate. You agree that IvyUp may contact you by email or phone about tutoring, and by text if you opted in.
              </p>
              <p>
                <strong>Information submitted on this site can and will be held at the discretion of IvyUp</strong>, including after tutoring ends or if it never begins. IvyUp may use it for student retention, follow-up, scheduling, record-keeping, and reaching out about IvyUp services, as described in our{" "}
                <Link href="/privacy" className="font-semibold text-ivy-700 underline underline-offset-4">Privacy Policy</Link>. You can ask us to delete your information at any time by emailing hello@ivyup.org.
              </p>
            </>
          ),
        },
        {
          id: "sessions",
          title: "Sessions and recordings",
          body: (
            <ul>
              <li>Sessions take place online over video and are recorded for safety, quality, and so families can review progress.</li>
              <li>A parent or guardian is responsible for making sure a minor student is available, prepared, and behaving respectfully during sessions.</li>
              <li>Please give at least 24 hours&apos; notice to reschedule a session.</li>
            </ul>
          ),
        },
        {
          id: "no-payments",
          title: "No payments on this site",
          body: (
            <p>
              IvyUp does not collect payments or payment details through this website. Any arrangements for tutoring services are made directly with IvyUp before sessions begin.
            </p>
          ),
        },
        {
          id: "tutors",
          title: "Tutors",
          body: (
            <ul>
              <li>Tutors are independent contractors, not employees of IvyUp.</li>
              <li>Families agree not to arrange tutoring directly with an IvyUp tutor outside of IvyUp, during the engagement or for 12 months after it ends.</li>
              <li>IvyUp selects tutors through applications and interviews and may require background checks. We don&apos;t guarantee a particular tutor will be available.</li>
            </ul>
          ),
        },
        {
          id: "results",
          title: "No guarantee of results",
          body: (
            <p>
              Tutoring helps, but test outcomes depend on many things outside our control. IvyUp does not guarantee any score, grade, or admissions result. Testimonials describe individual experiences and are not a promise of similar results.
            </p>
          ),
        },
        {
          id: "use",
          title: "Using the site",
          body: (
            <ul>
              <li>Don&apos;t submit false information, someone else&apos;s information without permission, or spam.</li>
              <li>Don&apos;t try to access accounts or areas of the site that aren&apos;t yours, or interfere with how the site works.</li>
              <li>Tutor accounts are personal. Tutors must keep their login private and use student information only to teach their assigned students.</li>
            </ul>
          ),
        },
        {
          id: "ip",
          title: "Content",
          body: <p>The IvyUp name, logo, and site content belong to IvyUp. Don&apos;t copy or reuse them without permission. Course materials a tutor shares are for your student&apos;s personal use.</p>,
        },
        {
          id: "affiliation",
          title: "No university affiliation",
          body: <p>IvyUp is independent. It is not affiliated with, sponsored by, or endorsed by any university, the College Board, ACT, or any testing organization. Test names are trademarks of their owners.</p>,
        },
        {
          id: "liability",
          title: "Limits on liability",
          body: (
            <p>
              The site is provided “as is.” To the fullest extent the law allows, IvyUp is not liable for indirect or consequential damages arising from use of the site or tutoring services.
            </p>
          ),
        },
        {
          id: "law",
          title: "Changes and governing law",
          body: (
            <>
              <p>We may update these terms and will change the date at the top when we do. Continuing to use the site means you accept the updated terms.</p>
              <p>These terms are governed by the laws of the State of New York. Questions: <a href="mailto:hello@ivyup.org" className="font-semibold text-ivy-700 underline underline-offset-4">hello@ivyup.org</a></p>
            </>
          ),
        },
      ]}
    />
  );
}
