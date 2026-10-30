# IvyUp

The ivyup.org website, owner dashboard and tutor portal. It runs on Next.js (Netlify), Supabase (database, logins, photo storage) and Resend (email).

| Area | URL | Who |
|---|---|---|
| Public site | `/`, `/get-started`, `/apply`, `/tutors`, `/contact`, `/privacy`, `/terms` | Families and tutor applicants |
| Owner dashboard | `/admin` (sign in at `/admin/login`) | The owner |
| Tutor portal | `/tutor/<username>` (sign in at `/tutor/login`) | Each tutor sees only their own students |

The site takes no payments. Nothing financial is collected or processed here. The tutor hourly wage is a private note that only the owner sees.

---

## Going live

The owner creates the accounts in steps 1–3. Each step takes about five minutes.

### 1. Supabase (database and logins)
1. Create a free project at [supabase.com](https://supabase.com). Pick the US East region, which is closest to Eastern Time families.
2. Go to **Project Settings → API keys** and copy the **Project URL**, the **publishable key**, and a **secret key**.
3. Go to **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up". Only the owner and the tutor accounts created from the dashboard should exist.
4. Apply the database schema from this folder:
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref YOUR-PROJECT-REF
   ```
   ```bash
   npm run db:push
   ```
   Or, without the CLI, paste each file in `supabase/migrations/` into **SQL Editor → New query** and run them **once each, in filename order**.

### 2. Resend (email from hello@ivyup.org)
1. Create an account at [resend.com](https://resend.com) and add the domain `ivyup.org`.
2. Add the DNS records Resend shows at the registrar where ivyup.org is managed. Resend uses a `send.` subdomain, so the existing hello@ivyup.org inbox keeps working.
3. Once the domain shows **Verified**, create an API key.

### 3. Netlify (hosting)
1. Push this folder to a GitHub repository, then in Netlify choose **Add new site → Import from Git**. The build settings come from `netlify.toml`.
2. Under **Site configuration → Environment variables**, add every key from `.env.example` with real values.
3. Deploy. Then go to **Domain management**, add `ivyup.org` and `www.ivyup.org`, and follow Netlify's DNS instructions. HTTPS is automatic.
4. Back in Supabase, set **Authentication → URL Configuration → Site URL** to `https://ivyup.org`.

### 4. Create the owner login
```bash
cp .env.example .env.local
```
Fill in `.env.local`, then:
```bash
npm run create-owner -- hello@ivyup.org "Owner Name"
```
The script asks for a password. Sign in at `https://ivyup.org/admin/login`.

---

## How the owner's workflow maps to the dashboard

**Prospects** has three tabs:
- **Form responses.** New sign-ups. Primary action: *Email parent to book consultation* (an editable email sent from hello@ivyup.org). Then *Schedule consultation* picks a date, time and Zoom link, puts the call on the calendar, and moves the family to the next tab.
- **Potential prospects.** Consultation scheduled. *IvyUp student* lets you choose a tutor and (optionally) a weekly session time, then moves the student to the next tab.
- **Current students.** Shows the assigned tutor and next session. Open a profile to change the tutor, add sessions, see homework and session notes, or archive.

The card icons mean:
- 📱 the parent wants texts
- ✉️ email the student
- 💬 text the student

Tapping a phone number opens your own Messages app with the number filled in. No texting service is needed.

**Calendar.** Month, week and agenda views of consultations (ivy), interviews (brass) and tutoring sessions (outlined). Click any event to see everything about it, or to edit the time, Zoom link and notes.

**Tutors** has two tabs:
- **Tutor applications.** *Email to schedule interview* → *Schedule interview* → *Make tutor*. When you make someone a tutor you only enter the hourly wage, because everything else carries over. A username and password are generated and shown once, with an option to email them to the tutor.
- **Current tutors.** Click a tutor to see their students and schedule, or their full profile, pay and login controls. Use *+ Add tutor* for someone who didn't apply through the site.

**Tutor displays.** Photo, title, description and fun fact for the public *Meet the Tutors* section. *Save draft* keeps it private; *Save and post* puts it on the site within seconds. Drag cards to reorder them.

**Testimonials.** The result goes on top (for example "SAT 1290 → 1480" or "5 on AP Calculus BC"), then the quote, then the student or parent name and the tutor. *Import from a screenshot* reads the text out of an image in your browser, with no AI service or API key. Review the text before posting.

**Inbox.** Contact-form messages. Every new sign-up, application and message is also emailed to `OWNER_NOTIFY_EMAIL`.

Shortcuts:
- ⌘K or `/` searches students and tutors.
- `G` then `P`, `C`, `T`, `D`, `R` or `I` jumps between sections.

## Tutor portal
Tutors sign in with their username. Their page has two tabs:
- **Students.** Each assigned student's profile, contact preferences, sessions and homework.
- **Calendar.** Their sessions, week by week. Opening a session shows the homework due that day, lets them assign new homework, and has a notes box that saves automatically.

Database Row Level Security guarantees that a tutor can only read their own active students, plus those students' sessions, homework and notes. This is tested in `npm run test:rls`.

---

## Development
```bash
npm install
```
```bash
npm run dev
```
Without `RESEND_API_KEY`, emails are printed to the terminal instead of sent (dev only). In production, a missing key shows the owner a clear error instead.

Checks:
```bash
npm run typecheck && npm run lint && npm run test:rls && npm run build
```

## Before launch, the owner should confirm
- **Legal pages.** `/privacy` and `/terms` are plain-language drafts written for IvyUp's process, with New York as the governing law. Have a lawyer review them.
- **Site copy.** Copy that makes promises on IvyUp's behalf must match how you actually operate:
  - "we confirm enrollment before anyone teaches"
  - "every session recorded"
  - "reply within one business day"
  - the 24-hour reschedule notice
  - the 12-month non-solicit
- **No invented content.** The site ships with no tutors or testimonials. Those sections stay hidden until you post real ones.
