import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "@/components/portfolio-system.css";
import { ProjectTransition } from "@/components/project-transition";
import { GlobalChrome } from "@/components/site-chrome";
import { SmoothScroll } from "@/components/smooth-scroll";

const bdo = localFont({
  src: "../../public/assets/fonts/bdo-grotesk.woff2",
  variable: "--font-bdo",
  display: "swap",
});

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
    <html lang="zh-CN" className={`${bdo.variable} bg-[#090909] scroll-auto`}>
      <head><script src="/figma-export-prep.js" /></head>
      <body className="m-0 overflow-x-hidden bg-[#090909] font-[family-name:var(--font-bdo)] text-[15px] leading-[1.25] text-[#f4f2ed] [--page-pad:40px] selection:bg-[#db3903] selection:text-[#f4f2ed] max-[1199px]:[--page-pad:24px] max-[809px]:text-[13px] max-[809px]:[--page-pad:16px] [&_a]:text-inherit [&_a]:no-underline [&_button]:cursor-pointer">
        <SmoothScroll />
        {children}
        <ProjectTransition />
        <GlobalChrome />
      </body>
    </html>
  );
}
