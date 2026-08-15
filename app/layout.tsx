import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VisionForge AI — Free AI Image & Video Generator",
  description:
    "Create AI-generated images and videos using powerful open-source AI models.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  keywords: [
    "AI image generator",
    "AI video generator",
    "text to image",
    "text to video",
    "image to video",
    "stable diffusion",
    "open source AI",
    "free AI generator",
  ],
  openGraph: {
    title: "VisionForge AI — Free AI Image & Video Generator",
    description:
      "Create AI-generated images and videos using powerful open-source AI models.",
    type: "website",
    siteName: "VisionForge AI",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "VisionForge AI — Free AI Image & Video Generator",
    description:
      "Create AI-generated images and videos using powerful open-source AI models.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
