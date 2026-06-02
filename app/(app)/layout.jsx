import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { MobileShell } from "@/components/mobile-shell";

const LAST_SEEN_THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

export default async function AppLayout({ children }) {
  // React.cache() lets the page below us reuse these results without a second
  // round trip — see lib/auth.js.
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/");
  if (profile.status === "pending") redirect("/pending");
  if (profile.status === "disabled") redirect("/?err=disabled");

  // Throttle last_seen_at — every navigation used to fire one unconditional
  // UPDATE. Now we only write if 10+ minutes have passed.
  const lastSeenMs = profile.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0;
  if (Date.now() - lastSeenMs > LAST_SEEN_THROTTLE_MS) {
    const supabase = await createClient();
    await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", profile.id);
  }

  return <MobileShell role={profile.role}>{children}</MobileShell>;
}
