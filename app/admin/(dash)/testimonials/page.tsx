import type { Metadata } from "next";
import { TestimonialsManager } from "@/components/admin/testimonials-manager";
import { getTestimonials, getTutors } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  const [testimonials, tutors] = await Promise.all([getTestimonials(), getTutors()]);
  return <TestimonialsManager testimonials={testimonials} tutors={tutors} />;
}
