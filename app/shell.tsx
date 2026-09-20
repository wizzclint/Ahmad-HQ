"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// The app frame: a fixed sidebar on desktop, and on phones a top bar with a menu button that
// opens the same navigation as a slide-in drawer. Both render from the same `sections`, so the
// two can't drift apart.

export type NavItem = { id: string; label: string; icon: string; active?: boolean; onSelect: () => void };
export type NavSection = { label: string; items: NavItem[] };

// The breakpoint where the sidebar becomes a drawer — keep in sync with the 800px rule in globals.css.
const DESKTOP_QUERY = "(min-width: 801px)";

export function AppShell({ sections, title, footer, overlays, children }: {
  sections: NavSection[];
  /** Name of the current page, shown in the phone top bar. */
  title: string;
  /** The user panel at the bottom of the sidebar; gets a function that closes the drawer. */
  footer: (closeMenu: () => void) => ReactNode;
  /** Fixed-position layers (guide tour, toasts) rendered above the page. */
  overlays?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);

  // While the drawer is open: focus moves into it and is kept there, Escape closes it, the page
  // behind doesn't scroll, and widening the window past the breakpoint closes it. Closing hands
  // focus back to the menu button that opened it.
  useEffect(() => {
    if (!open) return;
    const panel = drawer.current;
    const opener = menuButton.current;
    const focusable = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])") ?? []).filter(el => !el.hasAttribute("disabled"));
    focusable()[0]?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const wide = window.matchMedia(DESKTOP_QUERY);
    const onResize = () => { if (wide.matches) setOpen(false); };

    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onResize);
      opener?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  const sidebar = (afterSelect?: () => void) => (
    <>
      <div className="brand-mark">AHMAD HQ<small>Management System</small></div>
      <div className="motto">Plan · Execute · Monitor<br />Close · Improve</div>
      {sections.map(section => (
        <div key={section.label}>
          <div className="nav-label">{section.label}</div>
          <nav aria-label={section.label}>
            {section.items.map(item => (
              <button
                key={item.id}
                className={item.active ? "active" : ""}
                aria-current={item.active ? "page" : undefined}
                onClick={() => { item.onSelect(); afterSelect?.(); }}
              >
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>
        </div>
      ))}
      {footer(afterSelect ?? (() => {}))}
    </>
  );

  return (
    <div className="system-shell">
      <header className="mobile-bar">
        <button
          ref={menuButton}
          className="menu-btn"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-drawer"
          onClick={() => setOpen(true)}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <b className="mobile-brand">AHMAD HQ</b>
        <span className="mobile-title">{title}</span>
      </header>

      <aside>{sidebar()}</aside>

      <div className={`drawer-backdrop${open ? " open" : ""}`} onClick={close} aria-hidden="true" />
      <aside id="mobile-drawer" ref={drawer} className={`drawer${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Main menu">
        <button className="drawer-close" aria-label="Close menu" onClick={close}>×</button>
        {sidebar(close)}
      </aside>

      <main className="main-content">{children}</main>
      {overlays}
    </div>
  );
}
