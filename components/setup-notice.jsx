import { BearLogo } from "./ui";

export function SetupNotice() {
  return (
    <div style={{
      minHeight: "100vh", width: "100vw", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div className="card" style={{ width: 560, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <BearLogo size={40} radius={12} />
          <div>
            <div className="mono" style={{ font: "600 11px/1 var(--font-mono)", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>BEARHOUSE</div>
            <div style={{ font: "600 14px/1.2 var(--font-sans)", marginTop: 3 }}>AI · Gateway</div>
          </div>
        </div>

        <h1 className="h-1" style={{ marginBottom: 8 }}>Finish setup</h1>
        <p className="muted" style={{ font: "400 14px/1.55 var(--font-sans)", margin: 0 }}>
          The app is running, but Supabase credentials haven't been configured. Fill in <code style={{ font: "500 12.5px/1 var(--font-mono)", background: "var(--bg-2)", padding: "1px 5px", borderRadius: 4 }}>.env</code> and the page will hot-reload.
        </p>

        <div className="mono" style={{
          marginTop: 18, padding: "14px 16px", borderRadius: 10,
          background: "var(--bg-2)", border: "0.5px solid var(--line)",
          font: "400 12px/1.7 var(--font-mono)", color: "var(--ink-2)",
          whiteSpace: "pre", overflowX: "auto",
        }}>
{`# .env (project root)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
API_KEY_ENC_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")`}
        </div>

        <ol style={{ font: "400 13px/1.7 var(--font-sans)", color: "var(--ink-2)", paddingLeft: 18, marginTop: 18 }}>
          <li>Create a project at <span className="mono" style={{ color: "var(--accent-ink)" }}>supabase.com/dashboard</span></li>
          <li><b>Settings → API</b>: copy the URL, anon key, and service role key</li>
          <li><b>Authentication → Providers → Google</b>: enable and add redirect URI <span className="mono">http://localhost:3000/auth/callback</span></li>
          <li>Apply the schema: <span className="mono" style={{ color: "var(--accent-ink)" }}>supabase db push</span> (or paste <span className="mono">supabase/migrations/0001_init.sql</span> + <span className="mono">supabase/seed.sql</span> into the SQL editor)</li>
          <li>After your first sign-up, promote yourself: <span className="mono" style={{ color: "var(--accent-ink)" }}>update profiles set role='admin', status='active' where email=...;</span></li>
        </ol>

        <div className="mono muted" style={{ font: "400 11.5px/1.5 var(--font-mono)", marginTop: 18 }}>
          See <span style={{ color: "var(--ink-2)" }}>README.md</span> for the full guide.
        </div>
      </div>
    </div>
  );
}
