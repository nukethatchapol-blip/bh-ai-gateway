import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PendingPage } from "@/components/pending-page";

export default async function Pending() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, full_name, email")
    .eq("id", user.id)
    .single();
  if (profile?.status === "active") redirect("/chat");
  return <PendingPage profile={profile} />;
}
