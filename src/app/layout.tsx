import type { Metadata } from "next";
import { headers } from "next/headers";
import { Raleway } from "next/font/google";
import { ThemeProvider } from "@ecosy/next-themes";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { ComparisonTrayProvider } from "@/context/ComparisonTrayContext";
import ComparisonTray from "@/components/compare/ComparisonTray";
import PageViewBeacon from "@/components/analytics/PageViewBeacon";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import SkipLink from "@/components/a11y/SkipLink";
import { ChatProvider } from "@/context/ChatContext";
import ChatBubbleWrapper from "@/components/chat/ChatBubbleWrapper";
import ChunkLoadReload from "@/components/dev/ChunkLoadReload";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import BackToTop from "@/components/devices/BackToTop";
import UserAppShell from "@/components/user/UserAppShell";
import "@/styles/globals.css";

const ralewaySans = Raleway({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

// Heading instance: preload already happens via ralewaySans — skip the
// duplicate preload so the browser stops warning about the 2nd woff2.
const ralewayHeading = Raleway({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SERVER_URL ?? "https://fweezytech.com",
  ),
  title: {
    template: "%s | FweezyTech",
    default: "FweezyTech",
  },
  description:
    "Kenya's #1 tech review destination — honest device reviews, comparisons, and tech insights.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FweezyTech",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "FweezyTech",
    description:
      "Kenya's #1 tech review destination — honest device reviews, comparisons, and tech insights.",
    url: "https://fweezytech.com",
    siteName: "FweezyTech",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FweezyTech",
    description:
      "Kenya's #1 tech review destination — honest device reviews, comparisons, and tech insights.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
    { media: "(prefers-color-scheme: light)", color: "#0066FF" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Route + auth detection. The middleware (src/proxy.ts →
  // src/lib/supabase/middleware.ts) stamps `x-pathname` and
  // `x-user-authenticated`, so we can decide the shell by AUTH STATE, not just
  // by route:
  //   • signed-in, non-admin, non-auth routes → the signed-in "app" shell
  //     (left sidebar) — the public header/footer/bottom-nav are never shown.
  //   • admin routes → the admin layout owns the chrome.
  //   • auth/preview routes → rendered bare (the login page redirects signed-in
  //     users to their dashboard itself).
  //   • everything else → the public site wrapper (header, footer, …).
  let pathname = "";
  let isAuthenticated = false;
  try {
    const headerList = await headers();
    pathname = headerList.get("x-pathname") || "";
    isAuthenticated = headerList.get("x-user-authenticated") === "1";
  } catch {
    // headers() may throw in some edge cases; fall back to empty string
  }

  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");

  const isAuthBareRoute =
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/preview" ||
    pathname.startsWith("/preview/");

  // Signed-in users always get the app shell (sidebar) — never the public
  // header — except on admin and auth/preview routes.
  const isAppMode = isAuthenticated && !isAdminRoute && !isAuthBareRoute;
  const isPublicMode = !isAdminRoute && !isAuthBareRoute && !isAppMode;

  return (
    <html
      lang="en"
      className={`${ralewaySans.variable} ${ralewayHeading.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SkipLink />
        <ChunkLoadReload />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <ComparisonTrayProvider>
              <ChatProvider>
                {isPublicMode && <Header />}
                <PageViewBeacon />
                {isAppMode ? (
                  <UserAppShell>{children}</UserAppShell>
                ) : isPublicMode ? (
                  <>
                    <main id="main-content" className="flex-1">{children}</main>
                    <InstallPrompt />
                    <ChatBubbleWrapper />
                    <Footer />
                    {/* Clearance so the fixed mobile bottom nav never covers the footer */}
                    <div className="h-16 lg:hidden" aria-hidden="true" />
                  </>
                ) : (
                  // Admin routes render their own chrome via src/app/admin/layout.tsx;
                  // auth + preview routes render bare.
                  children
                )}
                {!isAdminRoute && !isAuthBareRoute && (
                  <ComparisonTray sidebarOffset={isAppMode} />
                )}
                {isPublicMode && <BackToTop />}
                {isPublicMode && <MobileBottomNav />}
              </ChatProvider>
            </ComparisonTrayProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
