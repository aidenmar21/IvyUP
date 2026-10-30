import { z } from "zod";
import { AP_EXAMS, GRADES, TESTS } from "@/lib/constants";
import { email, optional, optionalEmail, optionalPhone, phone, required, submissionMeta } from "./shared";

export const signupSchema = z
  .object({
    parentName: required("Parent name", 120),
    parentPhone: phone("Parent phone"),
    parentEmail: email("Parent email"),
    parentSms: z.boolean().default(false),
    studentFirstName: required("Student first name", 60),
    studentGrade: z.enum(GRADES, { message: "Choose a grade" }),
    studentPhone: optionalPhone("Student phone"),
    studentEmail: optionalEmail(),
    studentEmailUpdates: z.boolean().default(false),
    studentTextUpdates: z.boolean().default(false),
    tests: z.array(z.enum(TESTS)).min(1, "Choose at least one test"),
    apExams: z.array(z.enum(AP_EXAMS)).default([]),
    preferredTutor: optional(120),
    consentGuardian: z.literal(true, { message: "Please confirm this to continue" }),
    consentContact: z.literal(true, { message: "Please confirm this to continue" }),
  })
  .merge(submissionMeta)
  .superRefine((v, ctx) => {
    if (v.tests.includes("AP exam") && v.apExams.length === 0) {
      ctx.addIssue({ code: "custom", path: ["apExams"], message: "Choose at least one AP exam" });
    }
    if (v.studentEmailUpdates && !v.studentEmail) {
      ctx.addIssue({ code: "custom", path: ["studentEmail"], message: "Add the student's email to send them updates" });
    }
    if (v.studentTextUpdates && !v.studentPhone) {
      ctx.addIssue({ code: "custom", path: ["studentPhone"], message: "Add the student's phone to text them updates" });
    }
  });

export type SignupInput = z.input<typeof signupSchema>;
export type SignupData = z.output<typeof signupSchema>;
