"use client";

import { type ReactNode, useRef, useState } from "react";
import { gsap, motionConditions, motionTiming, useGSAP } from "@/lib/gsap";

/** Keep content mounted through its exit; each update cancels the previous timeline. */
export function GsapPresence({ open, children }: { open: boolean; children: ReactNode }) {
  const [present, setPresent] = useState(open);
  const scope = useRef<HTMLDivElement>(null);
  if (open && !present) setPresent(true);

  useGSAP(() => {
    if (!present) return;
    const mm = gsap.matchMedia();
    mm.add(motionConditions, ({ conditions }) => {
      const duration = conditions?.reduced ? 0 : motionTiming.normal;
      const timeline = gsap.timeline({ defaults: { duration, ease: motionTiming.ease } });
      if (open) {
        timeline.fromTo("[data-presence-fade]", { autoAlpha: 0 }, { autoAlpha: 1 }, 0)
          .fromTo("[data-presence-panel]", { autoAlpha: 0, y: 24, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1 }, 0);
      } else {
        timeline.to("[data-presence-panel]", { autoAlpha: 0, y: conditions?.reduced ? 0 : 20 }, 0)
          .to("[data-presence-fade]", { autoAlpha: 0 }, 0)
          .call(() => setPresent(false));
      }
    }, scope);
    return () => mm.revert();
  }, { scope, dependencies: [open, present], revertOnUpdate: true });

  return present ? <div ref={scope} className="contents" inert={!open}>{children}</div> : null;
}
