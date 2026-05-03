import type { Metadata } from "next";
import { Jost } from "next/font/google";
import { PageVisitTracker } from "@/components/analytics/page-visit-tracker";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "run run run",
  description: "a running log derived directly from GPX files.",
  icons: {
    icon: [{ url: "/icon.jpeg", type: "image/jpeg" }],
    shortcut: [{ url: "/icon.jpeg", type: "image/jpeg" }],
  },
};

// Inline pre-hydration script: set data-theme from localStorage before first paint
// so the page doesn't flash the wrong mode.
const themeInit = `(function(){try{var t=localStorage.getItem('nodaysoff-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}else{document.documentElement.dataset.theme='dark';}}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jost.variable} h-full`} data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full antialiased font-sans">
        <PageVisitTracker />
        {children}
      </body>
    </html>
  );
}
