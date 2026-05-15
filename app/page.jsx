import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
import { SetupNotice } from "@/components/setup-notice";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage({ searchParams }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <SetupNotice />;
  }

  // Magic-link / OAuth callbacks land here when the Supabase project's
  // allowed redirect list only contains the Site URL ("/"). Forward to
  // the canonical /auth/callback handler so it can exchange the code.
  const params = await searchParams;
  if (params?.code) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => typeof v === "string")
    ).toString();
    redirect(`/auth/callback?${qs}`);
  }

  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, region")
    .order("id");

  return <LoginScreen branches={branches || []} />;
}
