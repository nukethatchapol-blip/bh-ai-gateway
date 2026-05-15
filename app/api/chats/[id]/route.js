import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Rename a chat. RLS ("chats self write") already restricts to the owner;
// the explicit user_id filter is belt-and-suspenders.
export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { title } = await request.json();
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("chats")
    .update({ title: title.trim().slice(0, 120), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Delete a chat. Its messages cascade-delete via the messages.chat_id FK.
export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("chats")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
