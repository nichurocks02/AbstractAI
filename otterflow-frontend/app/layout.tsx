import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "OtterFlow - AI Model Routing",
  description: "Optimize your AI development with intelligent model routing.",
  icons: {
    icon: "/favicon.ico",  // Default favicon for most browsers
    shortcut: "/favicon-32x32.png",  // Alternative smaller favicon
    apple: "/apple-touch-icon.png",  // Apple touch icon for iOS devices
    other: [
      {
        rel: "manifest",
        url: "/site.webmanifest",  // Web manifest for Android Chrome
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "192x192",
        url: "/android-chrome-192x192.png",  // Android Chrome home screen
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "512x512",
        url: "/android-chrome-512x512.png",  // Large Android icon
      }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
