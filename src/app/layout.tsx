import type { Metadata } from "next";
import Script from "next/script";
import { Raleway } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { ComparisonTrayProvider } from "@/context/ComparisonTrayContext";
import ComparisonTray from "@/components/compare/ComparisonTray";
import PageViewBeacon from "@/components/analytics/PageViewBeacon";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import SkipLink from "@/components/a11y/SkipLink";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ralewaySans.variable} ${ralewayHeading.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              var t = localStorage.getItem('theme');
              if (!t) t = 'dark';
              document.documentElement.classList.add(t);
            } catch(e) {}
          `}
        </Script>
        <SkipLink />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <ComparisonTrayProvider>
              <Header />
              <PageViewBeacon />
              <main id="main-content" className="flex-1">{children}</main>
              <ComparisonTray />
              <InstallPrompt />
              <Footer />
            </ComparisonTrayProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
