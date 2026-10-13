import type { Metadata } from "next";
import Script from "next/script";
import "./misans.css";
import "./globals.css";
import "@/components/portfolio-system.css";
import { ProjectTransition } from "@/components/project-transition";
import { GlobalChrome } from "@/components/site-chrome";
import { SiteSound } from "@/components/site-sound";
import { SmoothScroll } from "@/components/smooth-scroll";

export const metadata: Metadata = {
  icons: {
    icon: { url: "/assets/images/favicon.svg", type: "image/svg+xml" },
  },
  title: { default: "Jimmy ZZ", template: "%s — Jimmy ZZ" },
  description:
    "Jimmy‘Space ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="bg-[#090909] scroll-auto">
      <head>
        <link rel="preload" href="/assets/fonts/apfel-grotezk-regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <Script src="/figma-export-prep.js" strategy="beforeInteractive" />
      </head>
      <body className="m-0 overflow-x-hidden bg-[#090909] font-sans text-[15px] leading-[1.25] text-[#f4f2ed] [--page-pad:40px] selection:bg-[#db3903] selection:text-[#f4f2ed] max-[1199px]:[--page-pad:24px] max-[809px]:text-[13px] max-[809px]:[--page-pad:16px] [&_a]:text-inherit [&_a]:no-underline [&_button]:cursor-pointer">
        <SmoothScroll />
        <SiteSound />
        {children}
        <ProjectTransition />
        <GlobalChrome />
      </body>
    </html>
  );
}
