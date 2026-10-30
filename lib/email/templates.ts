import { SITE_URL } from "@/lib/env";

/** Default copy for emails the owner sends. The owner can edit both fields before sending. */

export function consultationRequest(args: { parentName: string; studentName: string; subjects: string }) {
  const first = args.parentName.split(" ")[0];
  return {
    subject: `A free consultation for ${args.studentName}`,
    body: `Hi ${first},

Thank you for reaching out to IvyUp about ${args.studentName}'s ${args.subjects} prep. I'd love to set up a free 20-minute consultation to learn about ${args.studentName}'s goals, timeline, and how they like to learn.

Could you reply with two or three times that work for you this week? Evenings and weekends are fine. We'll meet over Zoom, and I'll send the link once we've picked a time.

After the call, I'll recommend a tutor from our Ivy League team who fits ${args.studentName} best.

Warmly,
The IvyUp team`,
  };
}

export function interviewRequest(args: { name: string }) {
  const first = args.name.split(" ")[0];
  return {
    subject: "Your IvyUp tutor application: next step",
    body: `Hi ${first},

Thank you for applying to tutor with IvyUp. We enjoyed reading your application and would like to schedule a short interview (about 20 minutes over Zoom).

Could you reply with a few times that work for you over the next week? We'll confirm one and send the link.

Best,
The IvyUp team`,
  };
}

export function tutorLogin(args: { name: string; username: string; password: string }) {
  const first = args.name.split(" ")[0];
  return {
    subject: "Your IvyUp tutor login",
    body: `Hi ${first},

Welcome to IvyUp. Your tutor portal is ready. It shows your students, your session calendar, homework, and session notes.

Sign in: ${SITE_URL}/tutor/login
Username: ${args.username}
Temporary password: ${args.password}

Please keep these details private. If you ever lose them, reply to this email and we'll reset your password.

Welcome aboard,
The IvyUp team`,
  };
}

export function familyConfirmation(args: { parentName: string; studentName: string }) {
  const first = args.parentName.split(" ")[0];
  return {
    subject: `We received your request for ${args.studentName}`,
    body: `Hi ${first},

Thanks for reaching out to IvyUp. We've received your request for ${args.studentName}.

What happens next:
1. Within one business day, we'll email you to book a free consultation.
2. On the call, we'll learn about ${args.studentName}'s goals and timeline.
3. We'll match ${args.studentName} with an Ivy League tutor who fits.

If anything changes in the meantime, just reply to this email.

The IvyUp team`,
  };
}

export function applicantConfirmation(args: { name: string }) {
  const first = args.name.split(" ")[0];
  return {
    subject: "We received your IvyUp tutor application",
    body: `Hi ${first},

Thanks for applying to tutor with IvyUp. We read every application, and we'll reach out by email if we'd like to schedule an interview.

The IvyUp team`,
  };
}
