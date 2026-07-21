import type { Metadata } from "next";
import Script from "next/script";
import { Raleway } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "@/styles/globals.css";

const ralewaySans = Raleway({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const ralewayHeading = Raleway({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | FweezyTech",
    default: "FweezyTech",
  },
  description:
    "Kenya's #1 tech review destination — honest device reviews, comparisons, and tech insights.",
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}