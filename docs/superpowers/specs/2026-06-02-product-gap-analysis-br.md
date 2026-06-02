# BEARHOUSE AI Gateway — Product Gap Analysis & Business Requirements

**Document version:** 0.1 (draft)
**Date:** 2026-06-02
**Author:** AI-assisted product gap pass (เพื่อใช้สนทนากับทีม)
**Status:** For review — ยังไม่ commit roadmap

---

## 1. Document purpose

เอกสารนี้ทำหน้าที่ **2 อย่าง**:
1. **Gap analysis** — สแกนสิ่งที่ขาดหายไปในแอปปัจจุบัน เทียบกับสิ่งที่ผู้ใช้งานจริง (manager, admin, ops, staff) ของเครือร้านชานม BEARHOUSE ~85 สาขา *น่าจะ* ต้องการเพื่อใช้แอปได้เต็มประสิทธิภาพ
2. **Business Requirements (BR)** — เขียนสิ่งที่ขาดเป็น requirement ที่อ่านง่าย จัดลำดับด้วย MoSCoW (Must/Should/Could/Won't) + acceptance criteria เพื่อให้ทีมเลือก scope ของ phase ถัดไป

> **เอกสารนี้ ไม่ใช่ implementation plan** — เป็นการตั้งคำถามว่า "ในเชิงธุรกิจ เราควรสร้างอะไรต่อ"

---

## 2. Current state — แอปทำอะไรได้แล้ว (สรุป 1 ย่อหน้า)

ผู้ใช้ที่ผ่านการอนุมัติ login ได้ด้วย Google/email → เข้าหน้าแชตที่คุยกับ AI (เลือก skill: Data Analyst / Strategy Advisor; model: Claude/GPT/etc.) เพื่อถามข้อมูลสาขาที่ตัวเองมีสิทธิ์ (branch ACL ผ่าน Supabase RLS + SECURITY DEFINER RPCs) → แอปแสดง dashboard ที่มี KPI 4 ตัว, กราฟยอดขายรายวัน, leaderboard, Top promotions/products/Inventory watch (จากข้อมูลจริง POS) → admin มี console สำหรับ approve user, จัดสิทธิ์สาขา, จัดการ skills, ดู audit log → user ผูก BYO API key (เข้ารหัส AES) ได้

**ระดับวุฒิภาวะของแอป:** ~MVP+1 — ทำงานครบตามที่ specify ตอนเริ่ม spec แล้ว และมี Production hardening 1 รอบ (RLS lockdown, perf indexes, real-data dashboard)

---

## 3. Personas

| Persona | บทบาท | ใช้แอปทำอะไร | ความถี่ |
|---|---|---|---|
| **Staff สาขา** | พนักงานหน้าร้าน 1 สาขา | เช็คสต๊อกของตัวเอง, สั่งวัตถุดิบ, ดูยอดขายวันนี้ | ทุกวัน, สั้นๆ |
| **Manager สาขา** | จัดการ 1-3 สาขา | เปรียบเทียบยอดสาขา, วางแผนโปร, ดู KPI รายสัปดาห์ | 2-3 ครั้ง/สัปดาห์ |
| **Area / Regional manager** | ดูแลหลายสาขาใน region | เห็นภาพรวม region, จับ outlier, วิเคราะห์เทรนด์ | ทุกวัน |
| **Operations admin** (สำนักงานใหญ่) | วางแผนสต๊อก, จัดโปร, kpi ภาพรวม | dashboard ภาพรวม + drill down + วาง quota | ทุกวัน |
| **C-level / Finance** | ตัดสินใจเชิงกลยุทธ์ | สรุปรายเดือน, profitability, ตั้ง target | สัปดาห์ละครั้ง |
| **System admin** (IT) | ดูแลแอป, approve user, set policy | console + audit + sec config | ตามต้องการ |

---

## 4. Gap analysis — 7 มิติ

### 4.1 User experience (UX)
| มี | ขาด |
|---|---|
| Mobile-first column, dark mode, EN/TH | Conversation **search** (ตอนนี้เป็นแค่ visual ไม่ทำงาน) |
| Pin / delete chat | **Export chat** เป็น PDF/CSV (มีแค่ copy-to-clipboard) |
| Slash command, skill picker, model picker | **Folders / tags / favorites** สำหรับจัด chat |
| Quick start prompts | **Bookmark queries** ที่ถามบ่อย |
| | **Voice input** (กดพูดถามได้) — manager หน้าร้านมือไม่ว่าง |
| | **Multilingual output** — ตอบเป็นไทยอัตโนมัติให้ตรงกับภาษา UI |
| | **Offline-friendly** หรืออย่างน้อย soft-error เมื่อเน็ตหลุด |

### 4.2 Business Intelligence (BI)
| มี | ขาด |
|---|---|
| Revenue, Bills, Avg ticket, Member %, daily chart, leaderboard, top promotions/products/inventory watch | **Sales target vs actual** — ตั้ง target รายเดือนต่อสาขา/ภาพรวม + แสดงความคืบหน้า |
| Date range filter (presets + calendar) | **Anomaly alerts** — "สาขา X ยอดร่วง 25% วันนี้" ส่ง notification |
| | **Forecast display** — แสดงพยากรณ์ยอดขาย 7 วันหน้า (มี `v_forecast_ingredient_weekly` แล้วใช้สำหรับสต๊อก แต่ไม่มีของ revenue) |
| | **Hour-of-day / day-of-week heatmap** — ช่วงเวลาที่ขายดี |
| | **Wastage dashboard** — `daily_ingredient_usage.waste_qty` มีใน DB แต่ไม่ surface |
| | **Cohort / repeat-customer rate** — % สมาชิกซื้อซ้ำใน 30/60 วัน |
| | **Promo impact analysis** — uplift จาก promo เทียบ baseline |
| | **Profitability per menu** — ต้องการ COGS เพิ่ม (ไม่อยู่ใน DB ปัจจุบัน) |
| | **Branch comparison view** — เลือก 2-3 สาขามาเทียบกันชัดๆ |

### 4.3 Cost & governance
| มี | ขาด |
|---|---|
| BYO API key (AES-encrypted), monthly_cap_usd column | **Token tracking ที่ทำงานจริง** — ปัจจุบัน `audit_log.tokens` = 0 เสมอ → monthly cap ไม่เคย trip (functional bug + business risk) |
| audit_log table | **Real-time spend dashboard** — admin เห็นค่าใช้จ่าย API รวมเดือนนี้ตามจริง |
| | **Spend alert** — แจ้งเมื่อใกล้ cap (80%, 100%) ทาง email |
| | **Per-skill / per-model cost breakdown** — รู้ว่า Claude Opus กิน budget มากกว่า GPT ไหม |
| | **Quota enforcement กับ hard-stop** — เมื่อ cap → ปฏิเสธ request พร้อม friendly error |
| | **Audit log viewer UI** — table มีแล้ว แต่ไม่มีหน้าค้นหา/กรอง/export |

### 4.4 Collaboration & sharing
| มี | ขาด |
|---|---|
| Share chat = copy transcript to clipboard | **Share chat ผ่าน link** ให้คนอื่นในทีมเปิดดูได้ |
| | **Comments** บน chat result — discuss in-context |
| | **@mention** ผู้ใช้คนอื่นในแชต |
| | **Multi-user chat** — analyst + manager คุยพร้อมกัน |
| | **Workspaces** — แยก Marketing / Operations / Finance พร้อม settings/skills แยกกัน |

### 4.5 Operational integration
| มี | ขาด |
|---|---|
| ปุ่ม Shift Management / BD Ticket / Complain Case (mockup ไป www.google.co.th) | **เชื่อมจริง** กับ 3 app นี้ — ตอนนี้เป็นแค่ link หลอก |
| Branch_access ACL | **Direct trigger จาก chat** — "สั่ง 100 ถุงให้ Future Park" → สร้าง PO ใน ERP จริง |
| | **Slack / Line OA integration** — push notification ของ alerts เข้า chat group |
| | **Email digest** — รายงานรายวัน/สัปดาห์ส่งเข้า inbox |
| | **Calendar overlay** — มาร์ค promo dates, holidays บนกราฟ |
| | **Weather correlation** — table `weather_daily` มี ใช้ overlay กับยอดขายได้ |
| | **POS direct hook** — ตอนนี้ข้อมูลมาจาก ETL daily; real-time stream จะแม่นกว่า |
| | **Geo / map view** — โชว์สาขาบนแผนที่ + heatmap |

### 4.6 Trust, safety, compliance (PDPA-relevant)
| มี | ขาด |
|---|---|
| RLS, branch ACL, role checks, AES-encrypted BYO keys, RLS lockdown ทำแล้ว | **2FA** — ตอนนี้เป็น password ล้วน admin ควรบังคับ TOTP/SMS |
| | **PII redaction in chat output** — customer_phone_number / customer_name หลุดลงในคำตอบได้ |
| | **PDPA: data export** — user ดึงข้อมูลของตัวเองได้ |
| | **PDPA: right-to-be-forgotten** — ลบ chat history + profile ของ user (ตอนนี้แค่ delete chat แต่ไม่ purge audit log) |
| | **Consent tracking** — log การยอมรับ terms version |
| | **IP allowlist** สำหรับ admin login |
| | **Session timeout policy** — auto logout หลัง 30 นาที inactive |
| | **Token rotation playbook** — เคยหลุด service_role; ต้อง runbook |

### 4.7 Reliability & operations (DevOps)
| มี | ขาด |
|---|---|
| Build clean, 22 unit tests, Vercel auto-deploy | **CI pipeline** ที่รัน vitest + Playwright ทุก PR (ตอนนี้เป็น manual) |
| Sin1 function region, indexes, RLS | **Error monitoring** (Sentry หรือ similar) — ตอนนี้ error เงียบ |
| | **Uptime / status page** — public หรือ internal |
| | **Performance monitoring** — track p50/p99 ของ dashboard/chat |
| | **Staging environment** — ตอนนี้แก้บน main → push → prod เลย |
| | **Database backups** — Supabase auto-daily แต่ไม่มี runbook + ไม่ได้ test restore |
| | **Rate limiting ฝั่ง app** — /api/chat ไม่มี rate limit (DDoS friendly + cost risk) |

---

## 5. Prioritized Business Requirements (MoSCoW)

### 🔴 MUST (P0) — ship ก่อนเริ่ม phase ถัดไป

**BR-M1 — Token usage tracking ที่ทำงานจริง**
- **Why:** ตอนนี้ monthly cap ปลอม → ไม่มีตัวกัน cost-abuse / runaway bill
- **What:** `/api/chat` ต้องบันทึก token counts จริง (prompt + completion + thinking) ลง `audit_log.tokens` + reject เมื่อเกิน cap
- **Acceptance:** สร้าง user, ส่ง 5 message → SELECT audit_log → tokens > 0; ตั้ง cap = 100; ส่ง 6th message → 429 + error message ภาษาไทย

**BR-M2 — PII redaction ในคำตอบ AI**
- **Why:** PDPA risk — ลูกค้าหมายเลขโทร/ชื่อ อาจปรากฏใน chat result และผู้ใช้ที่ไม่มีสิทธิ์เห็นได้
- **What:** เพิ่ม post-processing ที่ pattern-match phone/email/credit ใน assistant reply แล้ว mask
- **Acceptance:** ถามให้ AI list ลูกค้า → cus_crm_member_id แสดง, customer_phone_number ถูก mask เป็น `***-***-1234`

**BR-M3 — 2FA สำหรับ admin role**
- **Why:** admin ดูข้อมูล 85 สาขา + ทำ approval; password อย่างเดียวเสี่ยง
- **What:** TOTP (Google Authenticator) สำหรับ role=admin; required at login
- **Acceptance:** admin login → ถูกขอ TOTP; non-admin ข้าม

**BR-M4 — Conversation search ที่ทำงานจริง**
- **Why:** chat home มีช่อง search แต่กดไม่ได้; ผู้ใช้ที่มี > 20 chat หาเจอยาก
- **What:** full-text search ผ่าน chat title + message content (Postgres `tsvector`); UI live filter
- **Acceptance:** พิม keyword → list filter ทันที; รองรับภาษาไทย

### 🟡 SHOULD (P1) — เริ่ม phase ถัดไป

**BR-S1 — Sales target vs actual**
- ตั้ง monthly revenue target ต่อสาขา (admin); dashboard แสดง % บรรลุพร้อม projection
- **Acceptance:** ตั้ง target → dashboard โชว์ "55% of target (฿2.1M / ฿3.8M) — projected ฿3.5M EOM"

**BR-S2 — Anomaly alerts (email/notification)**
- Auto-flag เมื่อ branch revenue drop > X% vs week-avg; ส่ง email ให้ admin
- Threshold ตั้งได้ใน admin console

**BR-S3 — Forecast revenue display** (ใช้ infra พยากรณ์ที่มีอยู่)
- เพิ่ม section "Forecast — next 7 days" บน dashboard (ใช้ trend จาก daily revenue + simple model หรือ extend `v_forecast` ให้ครอบยอดขาย ไม่ใช่แค่ inventory)

**BR-S4 — Export chat to PDF/CSV**
- Button "Export" ในห้องแชต → ดาวน์โหลด conversation + tables เป็น PDF (สำหรับรายงาน) หรือ CSV (สำหรับ raw data)

**BR-S5 — Real-time spend dashboard (admin)**
- หน้าใหม่ใน /admin: chart ค่าใช้จ่าย API รายวัน/รายเดือน, breakdown per user / per model
- ต้องการ BR-M1 ทำงานก่อน

**BR-S6 — Audit log viewer UI**
- หน้า /admin/audit มี filter (user, action, date), search, export CSV

**BR-S7 — Custom skill management UI**
- admin สร้าง/แก้ skill (name, description, system_prompt, tools, model) ผ่าน UI; รองรับ versioning

**BR-S8 — Slack / Line OA notification integration**
- alerts (anomaly, low stock) ส่งเข้า team channel ที่ตั้งไว้

**BR-S9 — Wastage dashboard**
- ใช้ `daily_ingredient_usage.waste_qty` แสดง top-waste SKUs + branch + trend

**BR-S10 — Hour-of-day heatmap per branch**
- หน้า drill-down: 7x24 grid ของ transactions; แสดง peak/off-peak

### 🟢 COULD (P2) — เมื่อมี bandwidth

**BR-C1 — Voice input** (manager หน้าร้านสั่งงาน hands-free)
**BR-C2 — Multimodal image input** (ถ่ายรูปเชลฟ์ → AI ตรวจสต๊อก)
**BR-C3 — Cohort / repeat-customer analysis**
**BR-C4 — Branch comparison view** (เลือก 2-3 สาขามาเทียบ KPI)
**BR-C5 — Workspaces** (แยก Operations / Marketing / Finance)
**BR-C6 — Shared chat links** (ส่ง URL ของ chat ให้ทีม)
**BR-C7 — Comments / @mention บน chat**
**BR-C8 — Email digest (daily/weekly)**
**BR-C9 — Calendar overlay** บน revenue chart
**BR-C10 — Weather correlation overlay**
**BR-C11 — Bookmark / saved queries**
**BR-C12 — Native mobile app (iOS/Android)** — current PWA usable แต่ native ดีกว่าเรื่อง push
**BR-C13 — Map view ของสาขา**
**BR-C14 — Profitability per menu** (ต้องการ COGS data — ไม่อยู่ใน DB ปัจจุบัน → require data partnership)
**BR-C15 — Real POS integration** (ตอนนี้ ETL daily; real-time ถ้าทำได้ → fresher dashboards)
**BR-C16 — เชื่อม 3 external apps จริง** (Shift Management / BD Ticket / Complain Case) แทน mockup
**BR-C17 — App-side rate limiting + DDoS protection**

### ⚪ WON'T (out of scope รอบนี้)

- **Multi-tenant / SaaS-ify** — current ออกแบบสำหรับ BEARHOUSE single-tenant; การ multi-tenant ต้องการรื้อ schema และ branding ครั้งใหญ่
- **Marketplace ของ skills** — ก่อนจะคิด ต้องมี multi-tenant
- **Pricing tiers / public billing** — internal tool, ไม่ใช่ SaaS
- **AI ที่ตัดสินใจอัตโนมัติ** (auto-execute orders) — ความเสี่ยงต่อ business สูง ควรเป็น human-in-the-loop

---

## 6. Non-functional requirements (cross-cutting)

| มิติ | Target |
|---|---|
| **Performance** | Dashboard p95 ≤ 4s ที่ scope ≤ 10 สาขา; chat first token ≤ 1.5s |
| **Availability** | 99.5% (Vercel + Supabase SLA) — ต้องมี status page |
| **Security** | OWASP Top 10 reviewed; RLS audit รายไตรมาส |
| **Compliance** | PDPA compliance pack: data export, RTBF, consent log |
| **Localization** | TH + EN ครบทุก user-facing string (มีแล้วแต่ต้อง gate ก่อน feature ใหม่) |
| **Accessibility** | WCAG 2.1 AA — keyboard nav, aria-labels, contrast ≥ 4.5:1 |

---

## 7. Phased roadmap (proposal)

### Phase 5 (next 2-3 sprints) — **"Make it trustworthy + accountable"**
**Theme:** ถ้าจะเปิดให้ใช้จริงในองค์กร แอปต้อง trustworthy
- BR-M1 (token tracking) — แก้ runaway-cost risk
- BR-M2 (PII redaction) — PDPA
- BR-M3 (2FA admin) — auth hardening
- BR-M4 (conversation search) — ฟีเจอร์ที่ผู้ใช้ตามถามแน่นอน
- BR-S5 (spend dashboard) — ผูกกับ M1
- BR-S6 (audit viewer) — accountability
- DevOps: CI pipeline + Sentry + staging env

### Phase 6 — **"Actionable insights"**
- BR-S1 (sales target vs actual)
- BR-S2 (anomaly alerts)
- BR-S3 (forecast display)
- BR-S9 (wastage dashboard)
- BR-S10 (hour-of-day heatmap)
- BR-S8 (Slack/Line integration)

### Phase 7 — **"Power users + ecosystem"**
- BR-S7 (custom skill UI + versioning)
- BR-S4 (export)
- BR-C1/C2 (voice + multimodal)
- BR-C3/C4 (cohort + branch compare)
- BR-C5 (workspaces)
- เชื่อม 3 external apps จริง (C16)

### Phase 8+ — **"Mobile + scale"**
- Native app, map view, POS real-time, profitability (ต้องการ COGS partnership)

---

## 8. Open questions ก่อนตัดสินใจ Phase 5

1. **Budget per user / per month สำหรับ AI token** — ตอนนี้ใส่ค่าไหนในระบบดี? (จำเป็นต่อ BR-M1)
2. **2FA ที่อยากใช้** — TOTP (Google Authenticator) เท่านั้น หรือเปิดให้ SMS ด้วย? (TOTP เร็วและฟรี; SMS ต้องใช้ Twilio + ค่าใช้จ่าย)
3. **PDPA scope** — บริษัทมี DPO และ retention policy ตั้งไว้รึยัง? ถ้ามี ต้องสอดคล้อง
4. **Notification channel หลัก** — Email, Slack, Line OA, หรือทั้งสาม?
5. **Sales target ใครเป็นคนตั้ง** — area manager, ops, หรือ AI suggest จาก historical?
6. **Forecast model — สร้างเองหรือซื้อ?** — ตอนนี้มี `v_forecast_ingredient_weekly` แล้ว (inventory); สำหรับ revenue forecast ใช้ time-series ง่ายๆ ก่อน หรือใช้ Prophet/external API?
7. **External apps (Shift/BD/Complain) มี API พร้อมรึยัง** — ถ้าไม่มี ต้องคุยกับเจ้าของระบบนั้นก่อน

---

## 9. Recommended next step

1. **Stakeholder review** (1 ครั้ง, 30 นาที) — ผ่าน roadmap + ขอ feedback เรื่อง priorities
2. **ตอบ open questions 7 ข้อ** → กลายเป็น input ของ Phase 5 design
3. **Brainstorming session per BR-M ตัวที่ approved** → spec → plan → implement (ตาม flow ที่ใช้ใน session นี้)

---

*End of document — ปรับ/เพิ่ม/ตัดได้ตามที่ทีมเห็นชอบ ก่อน lock เป็น v1*
