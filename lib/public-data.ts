import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublicKey, supabaseUrl } from "@/lib/env";
import type { Testimonial, TutorDisplay } from "@/lib/types";

/** Anonymous client: Row Level Security only returns posted content. */
function anonClient() {
  return createClient(supabaseUrl(), supabasePublicKey(), { auth: { persistSession: false } });
}

export async function getPostedTutors(): Promise<TutorDisplay[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await anonClient()
    .from("tutor_displays")
    .select("*")
    .eq("status", "posted")
    .order("sort_order")
    .order("created_at");
  if (error) {
    console.error("getPostedTutors", error.message);
    return [];
  }
  return data as TutorDisplay[];
}

export async function getPostedTestimonials(): Promise<Testimonial[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await anonClient()
    .from("testimonials")
    .select("*")
    .eq("status", "posted")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getPostedTestimonials", error.message);
    return [];
  }
  return data as Testimonial[];
}
