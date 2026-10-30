import { DetailRow } from "@/components/admin/ui";
import { TUTOR_ACKS, TUTOR_SETUP } from "@/lib/constants";
import { fmt } from "@/lib/time";
import type { TutorApplication } from "@/lib/types";

/** Every answer from the tutor application, grouped the way the form is. */
export function ApplicationDetails({ app }: { app: TutorApplication }) {
  return (
    <div className="flex flex-col gap-6">
      <Group title="About">
        <DetailRow label="Full name">{app.full_name}</DetailRow>
        <DetailRow label="Preferred name">{app.preferred_name}</DetailRow>
        <DetailRow label="School">{app.school}</DetailRow>
        <DetailRow label="Year">{app.year}</DetailRow>
        <DetailRow label="Major">{app.major}</DetailRow>
        <DetailRow label="Semester state">{app.semester_state}</DetailRow>
        <DetailRow label="Time zone">{app.time_zone}</DetailRow>
      </Group>
      <Group title="Subjects">
        <DetailRow label="Can teach">{app.subjects.join(", ")}</DetailRow>
        <DetailRow label="Grade levels">{app.grade_levels.join(", ")}</DetailRow>
      </Group>
      <Group title="Scores">
        <DetailRow label="SAT">{app.sat_score}</DetailRow>
        <DetailRow label="ACT">{app.act_score}</DetailRow>
        <DetailRow label="AP">{app.ap_scores}</DetailRow>
      </Group>
      <Group title="Availability">
        <DetailRow label="Weekly (ET)">
          <span className="whitespace-pre-wrap">{app.weekly_availability}</span>
        </DetailRow>
        <DetailRow label="Max hours / week">{app.max_hours_per_week}</DetailRow>
        <DetailRow label="Max students">{app.max_students}</DetailRow>
        <DetailRow label="Unavailable">{app.unavailable_periods}</DetailRow>
        <DetailRow label="Summer">{app.summer_availability}</DetailRow>
      </Group>
      <Group title="Setup">
        {TUTOR_SETUP.map((s) => (
          <DetailRow key={s.key} label={s.label.replace(" (optional)", "")}>
            {app.setup?.[s.key] ? "Yes" : "No"}
          </DetailRow>
        ))}
      </Group>
      <Group title="Experience">
        <DetailRow label="Prior">{app.prior_experience}</DetailRow>
        <DetailRow label="Details">{app.experience_details ? <span className="whitespace-pre-wrap">{app.experience_details}</span> : null}</DetailRow>
        <DetailRow label="Experience with">{app.experience_with.length ? app.experience_with.join(", ") : null}</DetailRow>
      </Group>
      <Group title="For parents">
        <DetailRow label="Bio">
          <span className="whitespace-pre-wrap">{app.bio}</span>
        </DetailRow>
        <DetailRow label="Fun fact">{app.fun_fact}</DetailRow>
      </Group>
      <Group title="Questions">
        <DetailRow label="First session approach">
          <span className="whitespace-pre-wrap">{app.answer_first_session}</span>
        </DetailRow>
        <DetailRow label="Why IvyUp">
          <span className="whitespace-pre-wrap">{app.answer_why_ivyup}</span>
        </DetailRow>
      </Group>
      <Group title="Acknowledgments">
        {TUTOR_ACKS.map((a) => (
          <DetailRow key={a.key} label={a.label.replace(/^I (understand |am )/, "").replace(/\.$/, "")}>
            {app[a.key] ? "Acknowledged" : "Not acknowledged"}
          </DetailRow>
        ))}
      </Group>
      <Group title="Other">
        <DetailRow label="Heard about us">{app.referral_source}</DetailRow>
        <DetailRow label="Anything else">{app.anything_else ? <span className="whitespace-pre-wrap">{app.anything_else}</span> : null}</DetailRow>
        <DetailRow label="Submitted">{fmt(app.created_at, "MMM d, yyyy 'at' h:mm a")}</DetailRow>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h4 className="eyebrow text-ink-600">{title}</h4>
      <dl>{children}</dl>
    </section>
  );
}
