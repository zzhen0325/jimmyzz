import type { Metadata } from "next";
import { Footer, TopNav } from "@/components/site-chrome";
import { ProjectIndex } from "@/components/project-index";
export const metadata: Metadata = {
  title: "全部作品",
  description:
    "张振的品牌、H5、海外活动、AIGC 与设计管理作品，共 12 个项目案例。",
};
export default function WorkPage() {
  return (
    <main id="top">
      <section className="work-intro">
        <TopNav />
        <p className="eyebrow">SELECTED & COLLECTED / 作品索引</p>
        <h1>
          Work, with
          <br />
          <span>something to say.</span>
        </h1>
        <div className="work-intro-bottom">
          <p>
            品牌、体验与创意技术。
            <br />
            每一个项目，都是一次把想法做实的过程。
          </p>
          <span>12 PROJECTS / 06 PRACTICES</span>
        </div>
      </section>
      <ProjectIndex />
      <Footer variant="work" />
    </main>
  );
}
