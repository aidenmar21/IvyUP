import type { Metadata } from "next";
import { DisplaysManager } from "@/components/admin/displays-manager";
import { getDisplays, getTutors } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Tutor displays" };

export default async function DisplaysPage() {
  const [displays, tutors] = await Promise.all([getDisplays(), getTutors()]);
  return <DisplaysManager displays={displays} tutors={tutors.filter((t) => t.active)} />;
}
