import type { Metadata } from "next";
import { OverloadFooter, OverloadNav } from "@/components/overload-system";
import { OverloadWorkIndex } from "@/components/overload-work";

export const metadata: Metadata = { title: "作品档案", description: "Jimmy ZZ 的品牌、角色、数字体验与创意工具作品。" };

export default function WorkPage() {
  return <main id="top" className="ol-work-page"><OverloadNav light /><OverloadWorkIndex /><OverloadFooter /></main>;
}
