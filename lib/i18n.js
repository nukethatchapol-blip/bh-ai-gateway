// Tiny i18n: dictionary keyed by string ID, English fallback.
// The active locale is held in a cookie (`lang`) and a React context;
// see `components/lang-context.jsx`.

export const LOCALES = ["th", "en"];
export const DEFAULT_LOCALE = "th";

export const STRINGS = {
  // App shell + nav
  "brand.tagline":           { en: "AI · Gateway",        th: "AI · เกตเวย์" },
  "nav.workspace":           { en: "Workspace",           th: "พื้นที่ทำงาน" },
  "nav.chat":                { en: "Chat",                th: "แชต" },
  "nav.dashboard":           { en: "Dashboard",           th: "แดชบอร์ด" },
  "nav.apikeys":             { en: "API Keys",            th: "API คีย์" },
  "nav.admin":               { en: "Admin",               th: "ผู้ดูแล" },
  "nav.access":              { en: "Access",              th: "สิทธิ์เข้าถึง" },
  "nav.recents":             { en: "Recents",             th: "ล่าสุด" },
  "nav.collapse":            { en: "Collapse",            th: "ย่อ" },
  "nav.signout":             { en: "Sign out",            th: "ออกจากระบบ" },

  // Common
  "common.signin":           { en: "Sign in",             th: "เข้าสู่ระบบ" },
  "common.search":           { en: "Search…",             th: "ค้นหา…" },
  "common.filter":           { en: "Filter",              th: "กรอง" },
  "common.export":           { en: "Export",              th: "ส่งออก" },
  "common.share":            { en: "Share",               th: "แชร์" },
  "common.apply":            { en: "Apply changes",       th: "บันทึก" },
  "common.cancel":           { en: "Cancel",              th: "ยกเลิก" },
  "common.save":             { en: "Save",                th: "บันทึก" },
  "common.from":             { en: "From",                th: "ตั้งแต่" },
  "common.to":               { en: "To",                  th: "ถึง" },
  "common.lang":             { en: "EN",                  th: "ไทย" },

  // Dashboard
  "dash.title":              { en: "Dashboard",           th: "แดชบอร์ด" },
  "dash.crumb":              { en: "dashboard",           th: "แดชบอร์ด" },
  "dash.kpi.revenue":        { en: "Revenue",             th: "รายได้" },
  "dash.kpi.customers":      { en: "Customers",           th: "ลูกค้า" },
  "dash.kpi.avgticket":      { en: "Avg ticket",          th: "ยอดเฉลี่ย/บิล" },
  "dash.kpi.inventory":      { en: "Inventory",           th: "สต๊อก" },
  "dash.kpi.vsPrior":        { en: "vs prior",            th: "เทียบงวดก่อน" },
  "dash.kpi.customers.sub":  { en: "unique transactions", th: "ธุรกรรมไม่ซ้ำ" },
  "dash.kpi.aov.sub":        { en: "per customer",        th: "ต่อลูกค้า" },
  "dash.kpi.inv.sub":        { en: "stock health avg",    th: "สต๊อกเฉลี่ย" },
  "dash.revenue":            { en: "Revenue",             th: "รายได้" },
  "dash.revenue.sub":        { en: "Across {{n}} branch{{s}}, {{range}}",
                               th: "{{n}} สาขา · {{range}}" },
  "dash.thisPeriod":         { en: "This period",         th: "งวดนี้" },
  "dash.priorPeriod":        { en: "Prior period",        th: "งวดก่อน" },
  "dash.topProducts":        { en: "Top products",        th: "สินค้าขายดี" },
  "dash.topProducts.sub":    { en: "By revenue, {{n}} branch{{s}}",
                               th: "เรียงตามรายได้ · {{n}} สาขา" },
  "dash.leaderboard":        { en: "Branch leaderboard",  th: "อันดับสาขา" },
  "dash.leaderboard.sub":    { en: "Top {{n}} by revenue", th: "อันดับ {{n}} ตามรายได้" },
  "dash.invalerts":          { en: "Inventory alerts",    th: "แจ้งเตือนสต๊อก" },
  "dash.invalerts.sub":      { en: "SKUs below reorder threshold",
                               th: "วัตถุดิบต่ำกว่าจุดสั่งซื้อ" },
  "dash.critical":           { en: "{{n}} critical",      th: "{{n}} วิกฤต" },
  "dash.reorder":            { en: "Reorder",             th: "สั่งซื้อ" },
  "dash.parOf":              { en: "{{p}}% of par",       th: "{{p}}% ของจุดสั่ง" },
  "dash.scopeBanner":        {
    en: "You are viewing {{n}} of {{total}} BEARHOUSE branches — scoped to your access policy. Data from other branches is hidden, not filtered.",
    th: "คุณเห็น {{n}} จาก {{total}} สาขา BEARHOUSE — ตามสิทธิ์ที่ได้รับ ข้อมูลสาขาอื่นถูกซ่อนไว้",
  },
  "dash.branchesVisible":    { en: "{{n}} of {{total}} branches visible",
                               th: "{{n}} จาก {{total}} สาขา" },
  "dash.col.branch":         { en: "Branch",              th: "สาขา" },
  "dash.col.revenue":        { en: "Revenue",             th: "รายได้" },
  "dash.col.trend":          { en: "Trend",               th: "เทรนด์" },
  "dash.range.label":        { en: "Date range",          th: "ช่วงวันที่" },

  // Login
  "login.heroTitle":         { en: "One AI, all branches,",
                               th: "AI เดียว ครบทุกสาขา" },
  "login.heroSubtitle":      { en: "only your data.",     th: "เห็นเฉพาะข้อมูลของคุณ" },
  "login.subhead":           {
    en: "A unified gateway to frontier models, grounded in BEARHOUSE branch data, with row-level access that mirrors your store scope — exactly.",
    th: "เกตเวย์รวมโมเดล AI ระดับ frontier ผูกกับข้อมูลสาขา BEARHOUSE พร้อมสิทธิ์เข้าถึงระดับแถวที่ตรงกับสาขาของคุณ",
  },
  "login.signin":            { en: "Sign in",             th: "เข้าสู่ระบบ" },
  "login.request":           { en: "Request access",      th: "ขอสิทธิ์เข้าใช้" },
  "login.googleBtn":         { en: "Continue with Google", th: "เข้าใช้ด้วย Google" },
  "login.orEmail":           { en: "or with email",       th: "หรือใช้อีเมล" },
  "login.email":             { en: "Email",               th: "อีเมล" },
  "login.password":          { en: "Password",            th: "รหัสผ่าน" },
  "login.fullname":          { en: "Full name",           th: "ชื่อ-นามสกุล" },
  "login.role":              { en: "Requested role",      th: "บทบาทที่ขอ" },
  "login.branch":            { en: "Primary branch",      th: "สาขาหลัก" },
  "login.submit":            { en: "Submit for approval", th: "ส่งคำขอ" },
  "login.tagline":           {
    en: "Use your BEARHOUSE Google account or email.",
    th: "ใช้บัญชี Google ของ BEARHOUSE หรืออีเมล",
  },

  // Top products — Thai by default per BEARHOUSE menu
  "product.brownSugar":      { en: "Brown Sugar Boba",    th: "บราวน์ชูการ์โบบา" },
  "product.matcha":          { en: "Matcha Latte",        th: "มัทฉะลาเต้" },
  "product.thaiTea":         { en: "Thai Tea Bear",       th: "ชาไทยแบร์" },
  "product.oolong":          { en: "Oolong Cheese Foam",  th: "อู่หลงชีสโฟม" },
  "product.lychee":          { en: "Lychee Yakult",       th: "ลิ้นจี่ยาคูลท์" },
  "product.strawberry":      { en: "Strawberry Milk",     th: "สตรอเบอร์รี่นม" },

  // Access page — affected tables config
  "access.affected.title":     { en: "Affected tables",            th: "ตารางที่บังคับใช้" },
  "access.affected.hint":      { en: "Tables in your Supabase project. Toggle on the ones the branch ACL should cover.",
                                  th: "ตารางในโครงการ Supabase ของคุณ เปิดใช้รายการที่ต้องการให้นโยบายสาขาคุม" },
  "access.affected.col.table": { en: "Table",       th: "ตาราง" },
  "access.affected.col.rows":  { en: "Rows",        th: "แถว" },
  "access.affected.col.branch":{ en: "Branch column", th: "คอลัมน์สาขา" },
  "access.affected.col.enabled":{en: "Enabled",     th: "เปิดใช้" },
  "access.affected.none":      { en: "(none)",      th: "(ไม่มี)" },
  "access.affected.search":    { en: "Filter tables…", th: "กรองตาราง…" },
  "access.affected.empty":     { en: "No tables match", th: "ไม่พบตาราง" },

  // Inventory items
  "inv.tapioca":             { en: "Tapioca pearls (large)", th: "ไข่มุก (เม็ดใหญ่)" },
  "inv.matchaPowder":        { en: "Matcha powder (cer.-A)", th: "ผงมัทฉะ (เกรด A)" },
  "inv.brownSyrup":          { en: "Brown sugar syrup",      th: "ไซรัปบราวน์ชูการ์" },
  "inv.cupLids":             { en: "Cup lids · 700ml",       th: "ฝาแก้ว · 700 มล." },
  "inv.earlGrey":            { en: "Earl Grey leaves",       th: "ใบชาเอิร์ลเกรย์" },
  "inv.yakult":              { en: "Yakult mini bottles",    th: "ยาคูลท์ขวดเล็ก" },
};

export function translate(key, locale, vars = {}) {
  const entry = STRINGS[key];
  if (!entry) return key;
  const tmpl = entry[locale] ?? entry.en ?? key;
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ""));
}
