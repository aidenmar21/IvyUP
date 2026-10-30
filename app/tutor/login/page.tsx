import type { Metadata } from "next";
import { LoginCard } from "@/components/shared/login-card";
import { tutorLogin } from "@/lib/login-actions";

export const metadata: Metadata = { title: "Tutor sign in", robots: { index: false } };

export default async function TutorLoginPage({ searchParams }: PageProps<"/tutor/login">) {
  const { error } = await searchParams;
  return (
    <LoginCard
      title="Tutor sign in"
      subtitle="Your students, sessions, homework, and notes."
      identifierLabel="Username"
      identifierType="username"
      action={tutorLogin}
      notice={error === "inactive" ? "Your tutor account is inactive. Email hello@ivyup.org if this is a mistake." : undefined}
      footer={<>Lost your login? Email <a className="font-semibold text-ivy-700 underline underline-offset-4" href="mailto:hello@ivyup.org">hello@ivyup.org</a> and we&apos;ll reset it.</>}
    />
  );
}
