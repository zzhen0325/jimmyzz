import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { GlobalChrome } from "@/components/site-chrome";
import { SmoothScroll } from "@/components/smooth-scroll";

const bdo = localFont({
  src: "../../public/assets/fonts/bdo-grotesk.woff2",
  variable: "--font-bdo",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Jimmy™ — Noah Reyes, Video Editor", template: "%s — Jimmy™" },
  description: "I make videos people finish. Long-form film, short-form reels and colour grades for premium YouTubers and brands.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bdo.variable} bg-[#090909] scroll-auto`}>
      <body className="m-0 overflow-x-hidden bg-[#090909] font-[family-name:var(--font-bdo)] text-[15px] leading-[1.25] text-[#f4f2ed] [--page-pad:40px] selection:bg-[#db3903] selection:text-[#f4f2ed] max-[1199px]:[--page-pad:24px] max-[809px]:text-[13px] max-[809px]:[--page-pad:16px] [&_a]:text-inherit [&_a]:no-underline [&_button]:cursor-pointer">
        <SmoothScroll />
        {children}
        <GlobalChrome />
      </body>
    </html>
  );
}
