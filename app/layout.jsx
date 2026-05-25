import "./globals.css";
import { cookies } from "next/headers";
import { LangProvider } from "@/components/lang-context";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";

export const metadata = {
  title: "BEARHOUSE · AI Gateway",
  description: "One AI, all branches, only your data.",
};

// viewport-fit=cover lets env(safe-area-inset-*) report real values on
// notched phones so the bottom tab bar clears the home indicator.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }) {
  const c = await cookies();
  const cookieLang = c.get("lang")?.value;
  const lang = LOCALES.includes(cookieLang) ? cookieLang : DEFAULT_LOCALE;
  const theme = c.get("theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang={lang} data-theme={theme} data-density="regular">
      <body>
        <LangProvider initialLang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
