import { createClient } from "@/lib/supabase/server";
import { ChatScreen } from "@/components/chat-screen";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: skills } = await supabase
    .from("skills")
    .select("id, name, description, tools")
    .eq("active", true)
    .order("name");

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, region")
    .order("id");

  const { data: access } = await supabase
    .from("branch_access")
    .select("branch_id")
    .eq("user_id", profile.id);
  const authorizedIds = (access || []).map((a) => a.branch_id);

  return (
    <ChatScreen
      profile={profile}
      skills={skills || []}
      branches={branches || []}
      authorizedIds={authorizedIds}
    />
  );
}
