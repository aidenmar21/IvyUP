import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "IvyUp · Ivy League tutors for SAT, ACT, AP and admissions tests",
    template: "%s · IvyUp",
  },
  description:
    "One-on-one tutoring from current Ivy League students. SAT, PSAT, ACT, SHSAT, SSAT, ISEE and AP exams. Start with a free consultation.",
  openGraph: {
    type: "website",
    siteName: "IvyUp",
    url: SITE_URL,
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f4ec",
  viewportFit: "cover",
};

// Adds `js-motion` before first paint so scroll reveals don't flash. If the
// motion runtime hasn't started within 3s, content is shown anyway.
const motionBootstrap = `(function(){try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){var d=document.documentElement;d.classList.add('js-motion');setTimeout(function(){if(!d.classList.contains('motion-ready'))d.classList.remove('js-motion')},3000)}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${newsreader.variable} ${hanken.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionBootstrap }} />
      </head>
      <body className="min-h-dvh bg-paper text-ink-900">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
