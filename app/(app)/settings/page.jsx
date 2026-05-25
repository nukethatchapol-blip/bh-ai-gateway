import { createClient } from "@/lib/supabase/server";
import { SettingsScreen } from "@/components/settings-screen";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles").select("id, email, full_name, role").eq("id", user.id).single();
  return <SettingsScreen profile={profile} />;
}
