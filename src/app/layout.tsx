import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";
import "./warevance-ui.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      "https://inventory-management-2-wheat.vercel.app"
  ),
  title: "WAREVANCE",
  description: "WAREVANCE لإدارة المخزون والفروع",

  icons: {
    icon: "/warevance-favicon.png",
    shortcut: "/warevance-favicon.png",
    apple: "/warevance-favicon.png",
  },

  openGraph: {
    title: "WAREVANCE",
    description: "WAREVANCE لإدارة المخزون والفروع",
    type: "website",
    images: [
      {
        url: "/warevance-favicon.png",
        width: 512,
        height: 512,
        alt: "شعار WAREVANCE",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: "WAREVANCE",
    description: "WAREVANCE لإدارة المخزون والفروع",
    images: ["/warevance-favicon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={ibmPlexSansArabic.variable}
    >
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
