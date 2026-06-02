// Request-scoped auth helpers. React's `cache()` dedupes the result within a
// single render pass, so the (app) layout and the page can both call
// `getCurrentUser()` / `getCurrentProfile()` and share ONE Supabase round trip
// per navigation — instead of two of each, which was costing ~80-150ms of
// pointless cross-region latency on every page change.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status, last_seen_at")
    .eq("id", user.id)
    .single();
  return data;
});
