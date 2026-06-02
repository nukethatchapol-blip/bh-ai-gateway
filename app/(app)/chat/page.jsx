import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ChatScreen } from "@/components/chat-screen";
import { ChatHome } from "@/components/chat-home";

export default async function ChatPage({ searchParams }) {
  const supabase = await createClient();
  const user = await getCurrentUser(); // cached across layout+page

  // Independent queries — run in parallel rather than four sequential
  // round trips to the (Singapore) DB.
  const [{ data: profile }, { data: skills }, { data: branches }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("skills").select("id, name, description, tools").eq("active", true).order("name"),
    supabase.from("branches").select("id, name, region").order("id"),
    supabase.from("branch_access").select("branch_id").eq("user_id", user.id),
  ]);
  const authorizedIds = (access || []).map((a) => a.branch_id);

  const params = await searchParams;

  // No `c` query param → render the chat list (home).
  if (!params?.c) {
    const { data: chats } = await supabase
      .from("chats")
      .select("id, title, skill_id, model_id, branch_scope, pinned, updated_at")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(40);
    return (
      <ChatHome
        profile={profile}
        chats={chats || []}
        skills={skills || []}
        authorizedCount={authorizedIds.length}
      />
    );
  }

  // A `c` is present → conversation view. Only fetch when it's a real id;
  // `?c=new` must not run `.eq("id","new").single()` against a uuid column.
  let initialMessages = [];
  let initialChatId = null;
  if (params.c && params.c !== "new") {
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
      // `?c=new` still mounts fresh thanks to the param fallback.
      key={initialChatId || params.c || "new"}
      profile={profile}
      skills={skills || []}
      branches={branches || []}
      authorizedIds={authorizedIds}
      initialMessages={initialMessages}
      initialChatId={initialChatId}
    />
  );
}
