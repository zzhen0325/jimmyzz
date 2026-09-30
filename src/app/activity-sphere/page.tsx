import type { Metadata } from "next";
import { ActivitySphere } from "@/components/activity-sphere";

export const metadata: Metadata = { title: "活动 · 图片球体" };

export default function ActivitySpherePage() {
  return <ActivitySphere />;
}
