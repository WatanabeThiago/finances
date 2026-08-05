import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { TrackingNotificationListener } from "@/components/tracking-notification-listener";
import { TrackingNotificationsVisual } from "@/components/tracking-notifications-visual";
import { ContactRequestNotifications } from "@/components/contact-request-notifications";
import "./globals.css";

const themeInitializer = `
  (() => {
    try {
      const saved = localStorage.getItem("finances.theme");
      const dark = saved
        ? saved === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    } catch {}
  })();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Gestão — serviços",
    template: "%s · Gestão",
  },
  description: "Gestão do negócio de prestação de serviços",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <TrackingNotificationListener />
        <TrackingNotificationsVisual />
        <ContactRequestNotifications />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
