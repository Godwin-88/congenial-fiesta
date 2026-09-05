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
import "@/styles/globals.css";

const ralewaySans = Raleway({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const ralewayHeading = Raleway({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
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
  // Detect if we're on an admin route.
  // Admin routes have their own layout (src/app/admin/layout.tsx) with sidebar.
  // Skip the public site wrapper (Header, Footer, Chat, etc.) for admin routes.
  let pathname = "";
  try {
    const headerList = await headers();
    pathname = headerList.get("x-pathname") || "";
  } catch {
    // headers() may throw in some edge cases; fall back to empty string
  }

  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");

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
                {!isAdminRoute && <Header />}
                <PageViewBeacon />
                {isAdminRoute ? (
                  children
                ) : (
                  <>
                    <main id="main-content" className="flex-1">{children}</main>
                    <ComparisonTray />
                    <InstallPrompt />
                    <ChatBubbleWrapper />
                    <Footer />
                  </>
                )}
              </ChatProvider>
            </ComparisonTrayProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
