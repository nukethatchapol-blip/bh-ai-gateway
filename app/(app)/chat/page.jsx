import { createClient } from "@/lib/supabase/server";
import { ChatScreen } from "@/components/chat-screen";

export default async function ChatPage({ searchParams }) {
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

  const params = await searchParams;
  let initialMessages = [];
  let initialChatId = null;
  if (params?.c) {
    const { data: chat } = await supabase
      .from("chats").select("id, skill_id, model_id, branch_scope")
      .eq("id", params.c).single();
    if (chat) {
      initialChatId = chat.id;
      const { data: msgs } = await supabase
        .from("messages").select("id, role, content, model, created_at")
        .eq("chat_id", chat.id).order("created_at");
      initialMessages = (msgs || []).map((mm) => ({
        id: mm.id,
        role: mm.role,
        model: mm.model,
        text: mm.content?.text || "",
        blocks: mm.content?.blocks || [],
        thinking: mm.content?.thinking || "",
        ts: "",
      }));
    }
  }

  return (
    <ChatScreen
      // Remount when the chat changes so initial state re-hydrates —
      // client-side nav between /chat?c=A and /chat?c=B reuses the same
      // component instance otherwise, and useState ignores new props.
      key={initialChatId || "new"}
      profile={profile}
      skills={skills || []}
      branches={branches || []}
      authorizedIds={authorizedIds}
      initialMessages={initialMessages}
      initialChatId={initialChatId}
    />
  );
}
