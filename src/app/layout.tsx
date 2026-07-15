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
      <body className="m-0 overflow-x-hidden bg-[#090909] font-[family-name:var(--font-bdo)] text-[15px] leading-[1.25] text-[#f4f2ed] [--page-pad:40px] selection:bg-[#db3903] selection:text-[#f4f2ed] max-[1199px]:[--page-pad:24px] max-[809px]:text-[13px] max-[809px]:[--page-pad:16px] [&_a]:text-inherit [&_a]:no-underline [&_a]:transition-[opacity,color,background] [&_a]:duration-200 [&_button]:cursor-pointer [&_button]:transition-[opacity,color,background] [&_button]:duration-200 motion-reduce:[&_*,&_*.before,&_*.after]:!duration-[0.01ms]">
        <SmoothScroll />
        {children}
        <GlobalChrome />
      </body>
    </html>
  );
}
