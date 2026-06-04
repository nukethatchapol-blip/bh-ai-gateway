// Cached server-side data fetchers. Each one combines React.cache (per-request
// dedupe) with Redis cache (across requests). Static-ish data (branches list,
// skills catalog) gets a 5-minute TTL; per-user data (branch_access) gets 1
// minute. Mutation paths must call the matching invalidate* helper.
import { cache } from "react";
import { cached, invalidate } from "@/lib/redis";
import { createClient } from "@/lib/supabase/server";

// ----- branches list (small view, rarely changes) --------------------------
const BRANCHES_KEY = "static:branches:v1";
const BRANCHES_TTL = 300; // 5 min

export const getCachedBranches = cache(async () => {
  return cached(BRANCHES_KEY, BRANCHES_TTL, async () => {
    const supabase = await createClient();
    const { data } = await supabase.from("branches").select("*").order("name");
    return data || [];
  });
});

// ----- skills catalog (only active ones) -----------------------------------
const SKILLS_KEY = "static:skills:v1";
const SKILLS_TTL = 300; // 5 min

export const getCachedSkills = cache(async () => {
  return cached(SKILLS_KEY, SKILLS_TTL, async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("skills")
      .select("id, name, description, tools")
      .eq("active", true)
      .order("name");
    return data || [];
  });
});

// ----- branch_access per user ----------------------------------------------
const BA_TTL = 60; // 1 min — short enough that ACL changes propagate quickly

export const getCachedBranchAccess = cache(async (userId) => {
  if (!userId) return [];
  return cached(`ba:${userId}`, BA_TTL, async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("branch_access")
      .select("branch_id")
      .eq("user_id", userId);
    return data || [];
  });
});

// ----- invalidators (call from mutation routes) ----------------------------
export async function invalidateBranchesCache() { await invalidate(BRANCHES_KEY); }
export async function invalidateSkillsCache()   { await invalidate(SKILLS_KEY); }
export async function invalidateBranchAccessCache(userId) {
  if (userId) await invalidate(`ba:${userId}`);
}
