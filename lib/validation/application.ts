import { z } from "zod";
import { EXPERIENCE_WITH, PRIOR_EXPERIENCE, TUTOR_GRADE_LEVELS, TUTOR_SUBJECT_GROUPS } from "@/lib/constants";
import { email, optional, phone, required, submissionMeta } from "./shared";

const ALL_SUBJECTS = TUTOR_SUBJECT_GROUPS.flatMap((g) => g.items) as string[];

export const applicationSchema = z
  .object({
    fullName: required("Full name", 120),
    preferredName: optional(60),
    email: email(),
    phone: phone(),
    school: required("School", 120),
    year: required("Year", 40),
    major: required("Major", 120),
    semesterState: required("State", 60),
    timeZone: required("Time zone", 60),
    subjects: z
      .array(z.string().refine((s) => ALL_SUBJECTS.includes(s), "Unknown subject"))
      .min(1, "Pick at least one subject"),
    gradeLevels: z.array(z.enum(TUTOR_GRADE_LEVELS)).min(1, "Pick at least one grade level"),
    satScore: optional(20),
    actScore: optional(20),
    apScores: optional(600),
    weeklyAvailability: required("Weekly availability", 1000),
    maxHours: z.coerce.number({ message: "Enter a number" }).int().min(1, "At least 1 hour").max(40, "40 hours max"),
    maxStudents: z.coerce.number({ message: "Enter a number" }).int().min(1, "At least 1 student").max(30, "30 students max"),
    unavailablePeriods: optional(1000),
    summerAvailability: optional(1000),
    setup: z.object({
      laptop: z.boolean().default(false),
      webcam: z.boolean().default(false),
      quiet: z.boolean().default(false),
      stylus: z.boolean().default(false),
    }),
    priorExperience: z.enum(PRIOR_EXPERIENCE, { message: "Choose one" }),
    experienceDetails: optional(1500),
    experienceWith: z.array(z.enum(EXPERIENCE_WITH)).default([]),
    bio: required("Short bio", 800).refine((v) => v.length >= 80, "A few full sentences, please (80+ characters)"),
    funFact: optional(200),
    answerFirstSession: required("This answer", 500),
    answerWhyIvyUp: required("This answer", 1000),
    ack_adult: z.literal(true, { message: "Required to apply" }),
    ack_recorded: z.literal(true, { message: "Required to apply" }),
    ack_background_check: z.literal(true, { message: "Required to apply" }),
    ack_contractor: z.literal(true, { message: "Required to apply" }),
    ack_non_solicit: z.literal(true, { message: "Required to apply" }),
    referralSource: optional(120),
    anythingElse: optional(1500),
  })
  .merge(submissionMeta)
  .superRefine((v, ctx) => {
    if (!v.setup.laptop || !v.setup.webcam || !v.setup.quiet) {
      ctx.addIssue({ code: "custom", path: ["setup"], message: "A laptop, webcam, and quiet space are needed for sessions" });
    }
  });

export type ApplicationInput = z.input<typeof applicationSchema>;
export type ApplicationData = z.output<typeof applicationSchema>;
