"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const Ctx = createContext({ open: false, toggle: () => {}, close: () => {} });

export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);

  // Auto-close when the viewport widens past the drawer breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 961px)");
    const handler = (e) => { if (e.matches) setOpen(false); };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // Lock body scroll while the drawer is open on mobile.
  useEffect(() => {
    const wasOverflow = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = wasOverflow; };
  }, [open]);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  return <Ctx.Provider value={{ open, toggle, close }}>{children}</Ctx.Provider>;
}

export const useSidebar = () => useContext(Ctx);
