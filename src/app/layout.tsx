import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";
import PageTransition from "@/components/page-transition";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AceVision — Tennis AI Dashboard",
  description: "AI-powered tennis match analysis, predictions, and player insights",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#050810",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground">
        <div className="bg-scene" aria-hidden="true" />
        <TooltipProvider>
          <div className="relative z-10 flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto md:ml-64 pb-20 md:pb-0">
              <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
