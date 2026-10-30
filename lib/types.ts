export type StudentStage = "new" | "contacted" | "prospect" | "active" | "archived";
export type ApplicationStage = "new" | "contacted" | "interview_scheduled" | "hired" | "rejected";
export type EventType = "consultation" | "interview" | "session";
export type PublishStatus = "draft" | "posted";

export type Family = {
  id: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  parent_sms_opt_in: boolean;
  created_at: string;
};

export type Student = {
  id: string;
  family_id: string | null;
  first_name: string;
  grade: string;
  phone: string | null;
  email: string | null;
  email_updates: boolean;
  text_updates: boolean;
  subjects: string[];
  ap_exams: string[];
  preferred_tutor: string | null;
  stage: StudentStage;
  assigned_tutor_id: string | null;
  consent_guardian: boolean;
  consent_contact: boolean;
  source: "form" | "manual";
  /** Owner-only, from student_notes; never present for tutors. */
  owner_notes?: string | null;
  last_emailed_at: string | null;
  created_at: string;
};

export type StudentWithFamily = Student & { family: Family | null };

export type TutorApplication = {
  id: string;
  stage: ApplicationStage;
  full_name: string;
  preferred_name: string | null;
  email: string;
  phone: string;
  school: string;
  year: string;
  major: string;
  semester_state: string;
  time_zone: string;
  subjects: string[];
  grade_levels: string[];
  sat_score: string | null;
  act_score: string | null;
  ap_scores: string | null;
  weekly_availability: string;
  max_hours_per_week: number;
  max_students: number;
  unavailable_periods: string | null;
  summer_availability: string | null;
  setup: Record<string, boolean>;
  prior_experience: string;
  experience_details: string | null;
  experience_with: string[];
  bio: string;
  fun_fact: string | null;
  answer_first_session: string;
  answer_why_ivyup: string;
  ack_adult: boolean;
  ack_recorded: boolean;
  ack_background_check: boolean;
  ack_contractor: boolean;
  ack_non_solicit: boolean;
  referral_source: string | null;
  anything_else: string | null;
  owner_notes: string | null;
  last_emailed_at: string | null;
  created_at: string;
};

export type Tutor = {
  id: string;
  application_id: string | null;
  user_id: string | null;
  username: string | null;
  full_name: string;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  school: string | null;
  grad_year: string | null;
  major: string | null;
  sat_score: string | null;
  act_score: string | null;
  ap_scores: string | null;
  bio: string | null;
  /** Owner-only, from tutor_private; never present for tutors. */
  hourly_wage?: number | null;
  notes?: string | null;
  active: boolean;
  created_at: string;
};

export type CalendarEvent = {
  id: string;
  type: EventType;
  title: string | null;
  starts_at: string;
  ends_at: string;
  student_id: string | null;
  application_id: string | null;
  tutor_id: string | null;
  recurrence: "none" | "weekly";
  recurrence_until: string | null;
  zoom_link: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
};

/** One concrete occurrence of an event (weekly sessions expand into many). */
export type Occurrence = {
  key: string;
  event: CalendarEvent;
  date: string; // yyyy-MM-dd in Eastern Time
  starts_at: string;
  ends_at: string;
};

export type Homework = {
  id: string;
  student_id: string;
  tutor_id: string;
  description: string;
  due_date: string;
  done: boolean;
  created_at: string;
};

export type SessionNote = {
  id: string;
  event_id: string;
  occurrence_date: string;
  tutor_id: string;
  body: string;
  updated_at: string;
};

export type TutorDisplay = {
  id: string;
  tutor_id: string | null;
  name: string;
  title: string;
  school: string | null;
  description: string;
  fun_fact: string | null;
  photo_path: string | null;
  photo_blurhash: string | null;
  status: PublishStatus;
  sort_order: number;
  updated_at: string;
  created_at: string;
};

export type Testimonial = {
  id: string;
  result_type: "sat" | "act" | "psat" | "ap" | "other";
  score_from: number | null;
  score_to: number | null;
  ap_exam: string | null;
  ap_score: number | null;
  result_text: string | null;
  quote: string;
  attribution_name: string;
  attribution_role: "parent" | "student";
  tutor_name: string | null;
  status: PublishStatus;
  sort_order: number;
  updated_at: string;
  created_at: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  topic: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export type EmailLog = {
  id: string;
  to_email: string;
  subject: string;
  template: string;
  student_id: string | null;
  application_id: string | null;
  tutor_id: string | null;
  status: "sent" | "dev_outbox" | "failed";
  sent_at: string;
};

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
