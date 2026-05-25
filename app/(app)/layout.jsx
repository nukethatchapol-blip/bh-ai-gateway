import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileShell } from "@/components/mobile-shell";

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles").select("id, email, full_name, role, status").eq("id", user.id).single();
  if (!profile) redirect("/");
  if (profile.status === "pending") redirect("/pending");
  if (profile.status === "disabled") redirect("/?err=disabled");

  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", profile.id);

  return <MobileShell role={profile.role}>{children}</MobileShell>;
}
