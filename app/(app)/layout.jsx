import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, AppShell } from "@/components/shell";

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/");
  if (profile.status === "pending") redirect("/pending");
  if (profile.status === "disabled") redirect("/?err=disabled");

  // Touch last_seen
  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", profile.id);

  const { data: recents } = await supabase
    .from("chats")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(6);

  return (
    <AppShell>
      <Sidebar user={profile} recents={recents || []} />
      <div className="app-main">{children}</div>
    </AppShell>
  );
}
