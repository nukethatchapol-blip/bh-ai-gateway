"use client";
import { TabBar } from "./tab-bar";

export function MobileShell({ role, children }) {
  return (
    <div className="m-shell-bg">
      <div className="m-shell">
        <div className="m-scroll" style={{ paddingBottom: 84 }}>{children}</div>
        <TabBar role={role} />
      </div>
    </div>
  );
}
