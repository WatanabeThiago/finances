"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { NAV_ITEMS, navItemActive, titleForPathname } from "@/lib/navigation";

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const currentTitle = titleForPathname(pathname);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200/80 bg-background/95 px-4 backdrop-blur-md dark:border-zinc-800/80">
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label="Abrir menu"
        >
          <HamburgerIcon />
        </button>
        <h1 className="min-w-0 truncate text-base font-semibold tracking-tight">
          {currentTitle}
        </h1>
      </header>

      {/* Overlay + drawer */}
      <div
        className={`fixed inset-0 z-50 transition-[visibility,opacity] duration-200 ease-out ${
          open
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          onClick={close}
          aria-label="Fechar menu"
          tabIndex={open ? 0 : -1}
        />
        <nav
          id={panelId}
          className={`absolute left-0 top-0 flex h-full w-[min(88vw,300px)] max-w-full flex-col border-r border-zinc-200 bg-background shadow-xl transition-transform duration-200 ease-out dark:border-zinc-800 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Navegação principal"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-3 dark:border-zinc-800">
            <span className="px-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Menu
            </span>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800"
              onClick={close}
              aria-label="Fechar menu"
            >
              <CloseIcon />
            </button>
          </div>
          <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
            {NAV_ITEMS.map((item) => {
              const active = navItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className={`block rounded-xl px-3 py-3 text-[15px] font-medium transition-colors ${
                      active
                        ? "bg-sky-600/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100"
                        : "text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="block">{item.label}</span>
                    {item.description ? (
                      <span className="mt-0.5 block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                        {item.description}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
