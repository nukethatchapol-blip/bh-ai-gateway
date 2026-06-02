import { getCurrentProfile } from "@/lib/auth";
import { SettingsScreen } from "@/components/settings-screen";

export default async function SettingsPage() {
  // Cached — layout already fetched this. Zero extra round trips.
  const profile = await getCurrentProfile();
  return <SettingsScreen profile={profile} />;
}
