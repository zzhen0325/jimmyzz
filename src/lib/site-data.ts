export type Project = {
  slug: "meridian" | "citadel" | "karama" | "flora";
  title: string;
  kind: string;
  year: string;
  client: string;
  project: string;
  spec: string;
  deliverables: string;
  video: string;
  still: string;
  file: string;
  copy: [string, string, string, string];
  next?: string;
  previous?: string;
};

export const projects: Project[] = [
  {
    slug: "meridian",
    title: "Meridian",
    kind: "Brand Identity",
    year: "2026",
    client: "Atlas Group",
    project: "Identity & Launch Film",
    spec: "RED Komodo 4K 24p",
    deliverables: "Master and Six Cutdowns",
    video: "/assets/videos/giTLgTG1Xb4gSWKMSMwml7NXZw.mp4",
    still: "/assets/images/HUcLlaUYqr6pt7CKzv0P0k10A.png",
    file: "Jimmy_Meridian_MASTER.MP4",
    copy: [
      "A new identity needed a film that could carry it — sixty days from first board to launch, and a name the market hadn’t heard yet.",
      "We cut to the grade, not around it. Two-frame holds on the wordmark, hard cuts on the beat, nothing that lingers. The launch version ran 02:14; the boardroom sat through it twice.",
      "Lifted blacks and one warm accent pulled from the wordmark. The whole film sits inside the brand palette before the logo ever appears.",
      "The film opened the launch event and ran paid for six weeks. Average watch time held above ninety per cent.",
    ],
    next: "citadel",
  },
  {
    slug: "citadel",
    title: "Citadel",
    kind: "Brand Film",
    year: "2026",
    client: "Nomad Stays",
    project: "Nomad Stays Campaign",
    spec: "Alexa Mini 4K 25p",
    deliverables: "Film and Four Cutdowns",
    video: "/assets/videos/94fUd6REGZb4Oo12LAButtB6VVY.mp4",
    still: "/assets/images/raQMO0qzYMpy07sY9oXSFdMVHs.png",
    file: "Jimmy_Citadel_MASTER.MP4",
    copy: [
      "Nomad Stays wanted the feeling of arriving somewhere new and unpacking like you own it. Twelve locations, one film, no voiceover.",
      "The rhythm is built on doors opening — every location enters mid-motion, nothing establishes. The master runs under two minutes; each cutdown opens on a different city.",
      "Every city graded to the same warm base, so twelve locations read as one brand. No teal, no postcard look.",
      "Four cutdowns carried the campaign across three markets. The hero film doubled the previous campaign’s completion rate.",
    ],
    next: "karama",
    previous: "meridian",
  },
  {
    slug: "karama",
    title: "Karama",
    kind: "Title Sequence",
    year: "2025",
    client: "Lumen Field",
    project: "Lumen Field Titles",
    spec: "After Effects 2.39:1 24fps",
    deliverables: "Titles and Lower Thirds",
    video: "/assets/videos/gI3gSjvQJmrr3qBjdVGqryBlWuc.mp4",
    still: "/assets/images/4Yt6dkcImNpNqtCCcDHgHUQMTU.png",
    file: "Jimmy_Karama_MASTER.MP4",
    copy: [
      "Open titles for a documentary series about builders. Patient work — it deserved a patient open.",
      "Fifty-two seconds, eleven cards, one typeface. The pacing borrows from print: hold, breathe, turn the page. Nothing moves faster than it has to.",
      "Print stock, not screen. Soft highlights and a paper-white base so the type feels set, not rendered.",
      "The open ran unchanged across all eight episodes. The network asked who cut it.",
    ],
    next: "flora",
    previous: "citadel",
  },
  {
    slug: "flora",
    title: "Flora",
    kind: "Motion & 3D",
    year: "2025",
    client: "Signal",
    project: "Signal Product Reveal",
    spec: "C4D Resolve 4K 30p",
    deliverables: "Reveal Film and Loops",
    video: "/assets/videos/aU7ayUlJ80M1wHVsniHXxsf4QO0.mp4",
    still: "/assets/images/hVHqSf90SxrL8TSUE5s5ONxFCRU.png",
    file: "Jimmy_Flora_MASTER.MP4",
    copy: [
      "Signal’s reveal had one rule: show the product before you explain it. Hardware this small is easy to oversell.",
      "The film opens on the device at true scale and earns every zoom after it. Three loops shipped alongside — the store page runs the twelve-second one.",
      "Graded like hardware photography, deep neutrals and a single specular pass, so renders and live plates match.",
      "The reveal held the store page for a full quarter. The twelve-second loop outperformed every static frame.",
    ],
    previous: "karama",
  },
];

export const services = [
  { title: "Long-form Edits", text: "Documentaries, essays and brand films cut for the long watch — structured so every beat earns the next.", video: "/assets/videos/08wd5OrAVFV5gXaZFixJBQEYP0.mp4" },
  { title: "Short-form Reels", text: "Vertical cut-downs built to stop the scroll. Hook in the first second, paced for completion, turned around fast.", video: "/assets/videos/DFI6TcAeyw7Ns8yq5IEfDFBf7tw.mp4" },
  { title: "Colour Grade", text: "Log footage graded to feel like film — consistent skin, lifted blacks, a look that carries the whole cut.", video: "/assets/videos/xAkTCC9dvMELsLTAr48opuhgJ1I.mp4" },
  { title: "Motion & Titles", text: "Titles, lower-thirds and animated type that move with the edit — clean systems that scale across a full series.", video: "/assets/videos/OWrnqtJfoEHkOVQasE60wKTDQ.mp4" },
];

export const reviews = [
  { quote: "He sends one cut, not options. Ten episodes in, it’s still the right one. Unbelievable.", author: "DANA KOVAC", role: "SHOWRUNNER — MERIDIAN", file: "meridian_master.mp4 · 00:04:12" },
  { quote: "Retention beat our previous by nineteen per cent. We stopped testing other editors.", author: "SAM OKAFOR", role: "HEAD OF BRAND — CITADEL", file: "citadel_master.mp4 · 00:02:38" },
  { quote: "The grade alone was worth it. Nobody believes the footage came from our cameras.", author: "LEILA FARES", role: "DIRECTOR — KARAMA", file: "karama_master.mp4 · 00:00:52" },
];
