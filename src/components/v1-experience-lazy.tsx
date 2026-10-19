"use client";

import dynamic from "next/dynamic";

// Keep the legacy shaders, video processing and games out of normal case pages.
export const V1ExperienceLazy = dynamic(() => import("./v1-experience").then(module => module.V1Experience));
