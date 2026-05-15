import { createClient } from "@/lib/supabase/server";
import { ApiKeysScreen } from "@/components/apikeys-screen";

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, provider, last4, monthly_cap_usd, spend_usd, active, created_at")
    .eq("user_id", user.id);

  return <ApiKeysScreen keys={keys || []} />;
}
