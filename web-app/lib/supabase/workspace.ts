"use client";

import { createClient } from "./client";

export async function getCurrentBusinessId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must sign in before changing business records.");
  }

  const { data, error } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .single();

  if (error) throw error;
  return data.business_id as string;
}
