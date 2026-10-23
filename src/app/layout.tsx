import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wellnest — A little better, every day",
  description:
    "Your daily space for better sleep, mindful moments, movement, and everyday wellbeing.",
  icons: { icon: "/icon.svg" },
  // Added to the Home Screen, it opens full screen like an app.
  appleWebApp: { capable: true, title: "Wellnest", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Draw under the notch and home indicator; CSS pads with env(safe-area-inset-*).
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#111614" },
  ],
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
