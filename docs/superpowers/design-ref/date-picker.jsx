// date-picker.jsx — Reusable date-range picker with presets.
// Usage: <DatePicker value={{from, to}} onChange={...}><TriggerButton/></DatePicker>

const { useState: useDPState, useRef: useDPRef, useEffect: useDPEffect, useMemo: useDPMemo } = React;

const _MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const _DOW = ["S", "M", "T", "W", "T", "F", "S"];

function _fmt(d) {
  if (!d) return "—";
  return `${_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}
function _fmtLong(d) {
  if (!d) return "—";
  return `${_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}
function _sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function _addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function _startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function _today() { return new Date(2026, 4, 25); } // May 25, 2026 — pinned for demo determinism

const PRESETS = [
  { id: "today",     label: "Today",       range: () => { const t = _today(); return [t, t]; } },
  { id: "yesterday", label: "Yesterday",   range: () => { const t = _addDays(_today(), -1); return [t, t]; } },
  { id: "7d",        label: "Last 7 days", range: () => [_addDays(_today(), -6), _today()] },
  { id: "14d",       label: "Last 14 days",range: () => [_addDays(_today(), -13), _today()] },
  { id: "30d",       label: "Last 30 days",range: () => [_addDays(_today(), -29), _today()] },
  { id: "tw",        label: "This week",   range: () => { const t = _today(); const dow = t.getDay(); return [_addDays(t, -dow), t]; } },
  { id: "lw",        label: "Last week",   range: () => { const t = _today(); const dow = t.getDay(); return [_addDays(t, -dow - 7), _addDays(t, -dow - 1)]; } },
  { id: "tm",        label: "This month",  range: () => [_startOfMonth(_today()), _today()] },
  { id: "lm",        label: "Last month",  range: () => { const t = _today(); const last = new Date(t.getFullYear(), t.getMonth(), 0); return [_startOfMonth(last), last]; } },
  { id: "qtd",       label: "Quarter to date", range: () => { const t = _today(); const qStart = new Date(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3, 1); return [qStart, t]; } },
  { id: "ytd",       label: "Year to date",range: () => [new Date(_today().getFullYear(), 0, 1), _today()] },
];

function DatePicker({ value, onChange, align = "left" }) {
  const [open, setOpen] = useDPState(false);
  const [draft, setDraft] = useDPState(value || { from: PRESETS[2].range()[0], to: _today(), presetId: "7d" });
  const [viewMonth, setViewMonth] = useDPState(() => _startOfMonth(_today()));
  const [hovered, setHovered] = useDPState(null);
  const ref = useDPRef();

  useDPEffect(() => {
    if (!open) return;
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pickPreset(id) {
    const p = PRESETS.find(x => x.id === id);
    const [from, to] = p.range();
    setDraft({ from, to, presetId: id });
    setViewMonth(_startOfMonth(to));
  }
  function pickDay(d) {
    if (!draft.from || (draft.from && draft.to)) {
      setDraft({ from: d, to: null, presetId: null });
    } else {
      // setting the second date
      if (d < draft.from) setDraft({ from: d, to: draft.from, presetId: null });
      else setDraft({ from: draft.from, to: d, presetId: null });
    }
  }
  function apply() {
    if (draft.from && draft.to) {
      onChange?.(draft);
      setOpen(false);
    }
  }

  const label = useDPMemo(() => {
    if (!value || !value.from) return "Select range";
    if (value.presetId) return PRESETS.find(p => p.id === value.presetId)?.label || _fmt(value.from);
    if (_sameDay(value.from, value.to)) return _fmtLong(value.from);
    if (value.from.getFullYear() === value.to.getFullYear() && value.from.getMonth() === value.to.getMonth())
      return `${_MONTHS[value.from.getMonth()].slice(0, 3)} ${value.from.getDate()}–${value.to.getDate()}, ${value.from.getFullYear()}`;
    return `${_fmt(value.from)} – ${_fmt(value.to)}, ${value.to.getFullYear()}`;
  }, [value]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button className="btn btn-sm" onClick={() => setOpen(o => !o)}
        style={{ font: "500 12.5px/1 var(--font-sans)" }}>
        <Icon name="dashboard" size={12} stroke={1.5} />
        <span>{label}</span>
        <Icon name="chevdown" size={11} style={{ color: "var(--muted)" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)",
          [align]: 0, zIndex: 80,
          width: 540, background: "var(--panel)", border: ".5px solid var(--line)",
          borderRadius: 14, boxShadow: "var(--shadow-lg)", overflow: "hidden",
          display: "grid", gridTemplateColumns: "160px 1fr",
        }}>
          {/* presets */}
          <div style={{
            background: "var(--panel-2)", borderRight: ".5px solid var(--line)",
            padding: 8, display: "flex", flexDirection: "column", gap: 1,
            maxHeight: 380, overflowY: "auto",
          }}>
            <div className="eyebrow" style={{ padding: "6px 8px 4px" }}>Quick ranges</div>
            {PRESETS.map(p => {
              const a = p.id === draft.presetId;
              return (
                <button key={p.id} onClick={() => pickPreset(p.id)}
                  style={{
                    appearance: "none", border: 0, textAlign: "left",
                    padding: "7px 8px", borderRadius: 6,
                    background: a ? "var(--accent-soft)" : "transparent",
                    color: a ? "var(--accent-ink)" : "var(--ink-2)",
                    font: `${a ? 500 : 400} 12.5px/1 var(--font-sans)`,
                    cursor: "default",
                  }}
                  onMouseEnter={e => { if (!a) e.currentTarget.style.background = "var(--hover)"; }}
                  onMouseLeave={e => { if (!a) e.currentTarget.style.background = "transparent"; }}>
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* calendar pane */}
          <div style={{ padding: 14 }}>
            {/* from / to display */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <DateInput label="From" value={draft.from} />
              <div style={{ alignSelf: "flex-end", padding: "0 0 11px", color: "var(--muted)" }}>→</div>
              <DateInput label="To" value={draft.to} />
            </div>

            {/* calendar */}
            <Calendar
              viewMonth={viewMonth} setViewMonth={setViewMonth}
              from={draft.from} to={draft.to}
              hovered={hovered} setHovered={setHovered}
              onPickDay={pickDay}
            />

            {/* footer */}
            <div style={{
              marginTop: 12, paddingTop: 12, borderTop: ".5px solid var(--line)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div className="mono" style={{ font: "400 11.5px/1 var(--font-mono)", color: "var(--muted)" }}>
                {draft.from && draft.to
                  ? `${Math.round((draft.to - draft.from) / 86400000) + 1}d selected`
                  : draft.from ? "Pick end date" : "Pick start date"}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-sm" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn btn-sm btn-primary" onClick={apply}
                  style={{ opacity: draft.from && draft.to ? 1 : 0.5 }}>Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DateInput({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{
        height: 32, padding: "0 10px", borderRadius: 7,
        border: ".5px solid var(--line)", background: "var(--panel-2)",
        display: "flex", alignItems: "center",
        font: "500 13px/1 var(--font-sans)", color: value ? "var(--ink)" : "var(--muted-2)",
      }}>{value ? _fmtLong(value) : "Select…"}</div>
    </div>
  );
}

function Calendar({ viewMonth, setViewMonth, from, to, hovered, setHovered, onPickDay }) {
  const year = viewMonth.getFullYear(), m = viewMonth.getMonth();
  const firstDow = new Date(year, m, 1).getDay();
  const daysIn = new Date(year, m + 1, 0).getDate();
  const today = _today();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(new Date(year, m, d));
  while (cells.length % 7) cells.push(null);

  function nav(delta) {
    setViewMonth(new Date(year, m + delta, 1));
  }
  function inRange(d) {
    if (!d || !from) return false;
    const end = to || hovered;
    if (!end) return _sameDay(d, from);
    const [lo, hi] = end >= from ? [from, end] : [end, from];
    return d >= lo && d <= hi;
  }

  return (
    <div>
      {/* month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button className="btn btn-icon btn-ghost btn-sm" onClick={() => nav(-1)}>
          <Icon name="chevleft" size={12} stroke={2} />
        </button>
        <div style={{ font: "600 14px/1 var(--font-sans)" }}>{_MONTHS[m]} {year}</div>
        <button className="btn btn-icon btn-ghost btn-sm" onClick={() => nav(1)}>
          <Icon name="chevright" size={12} stroke={2} />
        </button>
      </div>

      {/* DOW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
        {_DOW.map((d, i) => (
          <div key={i} style={{
            textAlign: "center", padding: "4px 0",
            font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)",
            textTransform: "uppercase", letterSpacing: ".08em",
          }}>{d}</div>
        ))}
      </div>

      {/* days */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ aspectRatio: "1" }} />;
          const isStart = _sameDay(d, from);
          const isEnd = _sameDay(d, to);
          const inR = inRange(d);
          const isToday = _sameDay(d, today);
          const isFuture = d > today;

          return (
            <button key={i}
              disabled={isFuture}
              onClick={() => !isFuture && onPickDay(d)}
              onMouseEnter={() => from && !to && setHovered(d)}
              onMouseLeave={() => setHovered(null)}
              style={{
                appearance: "none", border: 0, padding: 0,
                aspectRatio: "1", position: "relative",
                background: "transparent", cursor: isFuture ? "not-allowed" : "default",
              }}>
              {/* range highlight (full width when middle) */}
              {inR && !isStart && !isEnd && (
                <div style={{ position: "absolute", inset: "3px 0", background: "var(--accent-soft)" }} />
              )}
              {(isStart || isEnd) && (
                <>
                  <div style={{ position: "absolute", top: 3, bottom: 3,
                    left: isStart && to ? "50%" : 0, right: isEnd && from && !isStart ? "50%" : 0,
                    background: "var(--accent-soft)" }} />
                  <div style={{
                    position: "absolute", top: 3, bottom: 3, left: 3, right: 3,
                    background: "var(--accent)", borderRadius: 8,
                  }} />
                </>
              )}
              <span style={{
                position: "relative", zIndex: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "100%", height: "100%",
                font: `${isToday || isStart || isEnd ? 600 : 400} 12.5px/1 var(--font-sans)`,
                color: isFuture ? "var(--muted-2)"
                  : (isStart || isEnd) ? "#fff"
                  : inR ? "var(--accent-ink)"
                  : isToday ? "var(--accent)"
                  : "var(--ink-2)",
              }}>{d.getDate()}</span>
              {isToday && !isStart && !isEnd && (
                <span style={{
                  position: "absolute", left: "50%", bottom: 5, transform: "translateX(-50%)",
                  width: 3, height: 3, borderRadius: 999, background: "var(--accent)",
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { DatePicker, _datepicker_today: _today, _datepicker_presets: PRESETS });
