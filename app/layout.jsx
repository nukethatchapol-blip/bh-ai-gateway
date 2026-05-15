import "./globals.css";
import { cookies } from "next/headers";
import { LangProvider } from "@/components/lang-context";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";

export const metadata = {
  title: "BEARHOUSE · AI Gateway",
  description: "One AI, all branches, only your data.",
};

export default async function RootLayout({ children }) {
  const c = await cookies();
  const cookieLang = c.get("lang")?.value;
  const lang = LOCALES.includes(cookieLang) ? cookieLang : DEFAULT_LOCALE;
  return (
    <html lang={lang} data-theme="light" data-density="regular">
      <body>
        <LangProvider initialLang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
