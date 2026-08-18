import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "نظام إدارة المخزون",
  description: "نظام إدارة المخزون متعدد الفروع",

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },

  openGraph: {
    title: "نظام إدارة المخزون",
    description: "نظام إدارة المخزون متعدد الفروع",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "شعار نظام إدارة المخزون",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: "نظام إدارة المخزون",
    description: "نظام إدارة المخزون متعدد الفروع",
    images: ["/logo.png"],
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
    >
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}