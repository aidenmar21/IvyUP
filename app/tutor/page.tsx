import { redirect } from "next/navigation";
import { requireTutor } from "@/lib/auth";

export default async function TutorIndex() {
  const viewer = await requireTutor();
  redirect(`/tutor/${viewer.username}`);
}
