export const TESTS = ["SAT", "PSAT", "ACT", "SHSAT", "SSAT", "ISEE", "AP exam"] as const;
export type TestName = (typeof TESTS)[number];

export const TEST_DESCRIPTIONS: Record<TestName, string> = {
  SAT: "College admissions",
  PSAT: "PSAT/NMSQT and National Merit",
  ACT: "College admissions",
  SHSAT: "NYC specialized high schools",
  SSAT: "Independent school admissions",
  ISEE: "Independent school admissions",
  "AP exam": "Any College Board AP subject",
};

/** College Board AP exams, grouped the way the AP course catalog groups them. */
export const AP_EXAMS = [
  "AP 2-D Art and Design",
  "AP 3-D Art and Design",
  "AP African American Studies",
  "AP Art History",
  "AP Biology",
  "AP Business Principles/Personal Finance",
  "AP Calculus AB",
  "AP Calculus BC",
  "AP Chemistry",
  "AP Chinese Language and Culture",
  "AP Comparative Government and Politics",
  "AP Computer Science A",
  "AP Computer Science Principles",
  "AP Cybersecurity",
  "AP Drawing",
  "AP English Language and Composition",
  "AP English Literature and Composition",
  "AP Environmental Science",
  "AP European History",
  "AP French Language and Culture",
  "AP German Language and Culture",
  "AP Human Geography",
  "AP Italian Language and Culture",
  "AP Japanese Language and Culture",
  "AP Latin",
  "AP Macroeconomics",
  "AP Microeconomics",
  "AP Music Theory",
  "AP Physics 1: Algebra-Based",
  "AP Physics 2: Algebra-Based",
  "AP Physics C: Electricity and Magnetism",
  "AP Physics C: Mechanics",
  "AP Precalculus",
  "AP Psychology",
  "AP Research",
  "AP Seminar",
  "AP Spanish Language and Culture",
  "AP Spanish Literature and Culture",
  "AP Statistics",
  "AP United States Government and Politics",
  "AP United States History",
  "AP World History: Modern",
] as const;

export const GRADES = [
  "5th grade",
  "6th grade",
  "7th grade",
  "8th grade",
  "9th grade",
  "10th grade",
  "11th grade",
  "12th grade",
  "Gap year",
  "College",
] as const;

export const TUTOR_SUBJECT_GROUPS = [
  { label: "Test prep", items: ["SAT", "ACT", "PSAT", "SHSAT", "SSAT", "ISEE"] },
  {
    label: "Math",
    items: [
      "Algebra I",
      "Geometry",
      "Algebra II",
      "Precalculus",
      "AP Calculus AB",
      "AP Calculus BC",
      "AP Statistics",
      "Multivariable Calculus",
      "Linear Algebra",
    ],
  },
  { label: "Science", items: ["Biology", "Chemistry", "Physics", "Environmental Science"] },
  {
    label: "English & humanities",
    items: [
      "Writing",
      "College Essays",
      "English",
      "History",
      "Government",
      "Microeconomics",
      "Macroeconomics",
    ],
  },
  {
    label: "Other",
    items: ["Computer Science", "Foreign Languages", "Study Skills", "Research Consulting"],
  },
] as const;

export const TUTOR_GRADE_LEVELS = ["Middle school (6-8)", "High school (9-12)", "College"] as const;

export const TUTOR_SETUP = [
  { key: "laptop", label: "Reliable laptop and internet" },
  { key: "webcam", label: "Webcam" },
  { key: "quiet", label: "Quiet place for sessions" },
  { key: "stylus", label: "Tablet or stylus for a digital whiteboard (optional)" },
] as const;

export const EXPERIENCE_WITH = ["Students with IEPs/504s", "ESL students", "Gifted students"] as const;

export const PRIOR_EXPERIENCE = [
  "None yet",
  "Informal (friends, family, peers)",
  "Under 1 year",
  "1 to 2 years",
  "More than 2 years",
] as const;

export const TUTOR_ACKS = [
  {
    key: "ack_adult",
    label: "I am 18 or older.",
    details: null,
  },
  {
    key: "ack_recorded",
    label: "I understand that tutoring sessions are recorded.",
    details:
      "Every session is recorded over video. Recordings protect students and tutors, let parents review progress, and help us resolve any concern quickly.",
  },
  {
    key: "ack_background_check",
    label: "I understand a background check may be required before I'm assigned to a client.",
    details:
      "Because tutors work with minors, IvyUp may ask you to complete a background check through a third-party provider before your first assignment. We'll tell you before anything is run.",
  },
  {
    key: "ack_contractor",
    label: "I understand I would work as an independent contractor, not an employee.",
    details:
      "Tutors set their own availability and are not employees of IvyUp. You're responsible for your own taxes. The full terms are in the tutor agreement.",
  },
  {
    key: "ack_non_solicit",
    label: "I understand I may not arrange tutoring directly with IvyUp families outside of IvyUp.",
    details:
      "Families come to IvyUp for a vetted, supported experience. Arranging private sessions with an IvyUp family, during or after your time with us, isn't allowed.",
  },
] as const;

export const IVY_SCHOOLS = [
  "Brown University",
  "Columbia University",
  "Cornell University",
  "Dartmouth College",
  "Harvard University",
  "Princeton University",
  "University of Pennsylvania",
  "Yale University",
] as const;

export const SCHOOL_YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate student", "Recent graduate"] as const;

export const US_TIME_ZONES = [
  "Eastern (ET)",
  "Central (CT)",
  "Mountain (MT)",
  "Pacific (PT)",
  "Alaska (AKT)",
  "Hawaii (HT)",
  "Outside the US",
] as const;

export const REFERRAL_SOURCES = ["A friend or classmate", "Instagram", "TikTok", "LinkedIn", "Handshake", "Campus flyer", "Search engine", "Other"] as const;

export const TIME_ZONE = "America/New_York";
