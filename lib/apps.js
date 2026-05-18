// External BEARHOUSE apps surfaced as sidebar redirect buttons.
// Each URL reads from a NEXT_PUBLIC_* env var (inlined at build time so
// it is available in the client Sidebar); blank falls back to the mockup.

const MOCKUP_URL = "https://www.google.co.th";

export const EXTERNAL_APPS = [
  {
    id: "shift",
    labelKey: "apps.shift",
    icon: "clock",
    url: process.env.NEXT_PUBLIC_APP_SHIFT_URL || MOCKUP_URL,
  },
  {
    id: "bdticket",
    labelKey: "apps.bdticket",
    icon: "ticket",
    url: process.env.NEXT_PUBLIC_APP_BDTICKET_URL || MOCKUP_URL,
  },
  {
    id: "complain",
    labelKey: "apps.complain",
    icon: "flag",
    url: process.env.NEXT_PUBLIC_APP_COMPLAIN_URL || MOCKUP_URL,
  },
];
