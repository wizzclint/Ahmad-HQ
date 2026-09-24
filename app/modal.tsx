"use client";

import { useEffect, useRef, type ReactNode } from "react";

// A dialog over the page, so Add/Edit works from wherever you are. Esc closes it, Tab stays inside it,
// and focus goes back to the button that opened it.
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const card = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", onKey);
    card.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = scroll;
      opener?.focus?.();
    };
  }, []);
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const items = card.current?.querySelectorAll<HTMLElement>("input, select, textarea, button:not([disabled])");
    if (!items?.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title} ref={card} onKeyDown={trapTab}>
        <div className="modal-head">
          <h2 className="section-title" style={{ margin: 0 }}>{title}</h2>
          <button type="button" className="btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
