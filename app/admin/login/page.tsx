import type { Metadata } from "next";
import Link from "next/link";
import { LoginCard } from "@/components/shared/login-card";
import { ownerLogin } from "@/lib/login-actions";

export const metadata: Metadata = { title: "Owner sign in", robots: { index: false } };

export default async function AdminLogin({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;
  return (
    <LoginCard
      title="Owner sign in"
      subtitle="Manage families, tutors, and your calendar."
      identifierLabel="Email"
      identifierType="email"
      action={ownerLogin}
      next={typeof next === "string" ? next : undefined}
      footer={<>Tutor? <Link className="font-semibold text-ivy-700 underline underline-offset-4" href="/tutor/login">Sign in here</Link>.</>}
    />
  );
}
