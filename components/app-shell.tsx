"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { NAV_ITEMS, navItemActive, titleForPathname } from "@/lib/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Home,
  Wrench,
  Package,
  Users,
  Target,
  Megaphone,
  Activity,
  Inbox,
  MessageCircle,
  Handshake,
} from "lucide-react";

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

function getIconForHref(href: string) {
  const props = { className: "h-5 w-5 shrink-0" };
  switch (href) {
    case "/":
      return <Home {...props} />;
    case "/servicos":
      return <Wrench {...props} />;
    case "/produtos":
      return <Package {...props} />;
    case "/parceiros":
      return <Handshake {...props} />;
    case "/clientes":
      return <Users {...props} />;
    case "/vendas-lg":
      return <Target {...props} />;
    case "/daily-ads":
      return <Megaphone {...props} />;
    case "/tracking":
      return <Activity {...props} />;
    case "/contact-requests":
      return <Inbox {...props} />;
    case "/whatsapp":
      return <MessageCircle {...props} />;
    default:
      return <Package {...props} />;
  }
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

  // Close mobile drawer when window resizes to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const currentTitle = titleForPathname(pathname);

  const NavigationList = ({ onItemClick }: { onItemClick?: () => void }) => (
    <ul className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-3">
      {NAV_ITEMS.map((item) => {
        const active = navItemActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onItemClick}
              className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 border-l-2 ${
                active
                  ? "bg-sky-600/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 border-sky-500"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 border-transparent"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  active
                    ? "bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400"
                    : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200/80 group-hover:text-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400 dark:group-hover:bg-zinc-800/80 dark:group-hover:text-zinc-200"
                }`}
              >
                {getIconForHref(item.href)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[14px]">
                  {item.label}
                </span>
                {item.description ? (
                  <span className="block truncate text-[11px] font-normal text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors">
                    {item.description}
                  </span>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex min-h-screen w-full">
      {/* Permanent Sidebar on Desktop (lg and up) */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-zinc-200 lg:bg-background lg:dark:border-zinc-800">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-zinc-200 px-6 dark:border-zinc-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-md shadow-sky-500/20 text-white font-black text-[10px]">
            G
          </div>
          <span className="text-base font-bold tracking-tight text-foreground bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text dark:from-white dark:to-zinc-300">
            Gestão
          </span>
        </div>
        <NavigationList />
        {/* Profile Footer */}
        <div className="mt-auto border-t border-zinc-200 p-4 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white font-semibold text-xs shadow-sm">
              WT
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Watanabe Thiago
              </p>
              <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                Administrador
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200/80 bg-background/95 px-4 backdrop-blur-md dark:border-zinc-800/80">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700 lg:hidden"
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
          <ThemeToggle />
        </header>

        <main className="flex-1 px-4 py-6">{children}</main>
      </div>

      {/* Mobile Drawer (visible on < lg) */}
      <div
        className={`fixed inset-0 z-50 transition-[visibility,opacity] duration-200 ease-out lg:hidden ${
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
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-md shadow-sky-500/20 text-white font-black text-[10px]">
                G
              </div>
              <span className="text-base font-bold tracking-tight text-foreground">
                Gestão
              </span>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800"
              onClick={close}
              aria-label="Fechar menu"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <NavigationList onItemClick={close} />
          {/* Mobile Profile Footer */}
          <div className="mt-auto border-t border-zinc-200 p-4 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white font-semibold text-xs shadow-sm">
                WT
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Watanabe Thiago
                </p>
                <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                  Administrador
                </p>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
