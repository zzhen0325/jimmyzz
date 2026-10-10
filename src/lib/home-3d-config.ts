import { DoubleSide, type MeshPhysicalMaterialParameters } from "three";
import type { GlassShapeConfig } from "./floating-glass";

export type ModelMaterialConfig = MeshPhysicalMaterialParameters & { normalStrength?: number };
export type FloatingModelConfig = {
  file: string; size: number;
  axisScale: [number, number, number];
  materials: Partial<Record<string, ModelMaterialConfig>>;
};

// 首页 3D 调整入口。保存后刷新页面即可查看。
// size：物件最长边的场景单位，会同步更新碰撞体；颜色使用十六进制。
// metalness：0 塑料 → 1 金属；roughness：0 镜面 → 1 磨砂。
// envMapIntensity：环境反射强度；clearcoat / clearcoatRoughness：清漆强度 / 粗糙度。
// axisScale：[宽、高、厚] 相对模型倍率；size 最后统一控制最长边。
// normalStrength：已有法线纹理的颗粒强度，0 为平滑，1 为当前烘焙强度。
const silver: MeshPhysicalMaterialParameters = {
  color: "#FFFFFF", metalness: 1, roughness: .1, envMapIntensity: 1,
};

export const home3DConfig = {
  // 相对原生分辨率：从 70% 起步，最低 70%，最高 100%；DPR 2 对应 1.4～2。
  // 稳定约 60fps 时逐步提高清晰度，低于约 50fps 时回退；两档间至少等 2 秒。
  resolution: { min: .7, max: 1, step: .1, sampleFrames: 60, cooldownMs: 2000, decreaseAboveMs: 20, increaseBelowMs: 17.5 },
  // 白色石膏只用于漂浮物；后景按镜头相对深度平滑切换，Logo 保持银铬。
  plaster: { color: "#eeede8", grain: .035, transitionStart: -.12, transitionEnd: .75 },
  // 全部漂浮物的倍率；Logo 单独调整。手机断点为 700px。
  sizing: { desktop: .4, mobile: .42, mobileBreakpoint: 700, referenceAspect: 1116 / 626 },
  // 后景保留 82% 尺寸，保持纵深，同时避免远处元素显得过小。
  depthSizing: { farScale: .82, range: .35 },
  entrance: { stagger: .035, launch: .3, duration: 3.2, turns: 1.15, endSpeed: .18 },
  magnet: { hoverRadius: .45, attractRadius: .85, repelStrength: 2.8, attractStrength: 40.5, burstSpeed: 5.1, burstRecovery: .9 },
  // 漂浮活动范围相对视口的倍率。桌面放宽边界，让 1.2 倍物件有空间翻滚；允许短暂出画。
  floatingBounds: { desktop: 1.5, mobile: 1 },
  logo: {
    scale: 0.9, // 正常尺寸上限
    maxViewportWidth: .3, // 天空首屏：中央 Logo 占约五分之一屏宽。
    mobileViewportWidth: .48,
    maxViewportHeight: .3,
    centerY: .50, // 首屏垂直居中。
    material: { ...silver },
  },
  // 原图手写 Jimmy，作为独立漂浮物参与物理互动。
  wordmark: {
    size: 2.5,
    material: { color: "#232323", metalness: .72, roughness: .25, envMapIntensity: 1.15, clearcoat: .8, clearcoatRoughness: .16 },
  },
  // 独立实体模型，与原有漂浮物共用碰撞和材质景深。
  sculptedProps: [
    { visible: true, file: "sculpted-branches", path: "/assets/models/sculpted-branches/sculpted-branches.glb", size: 1.2,
      // 绿色植物：保留 Blender 原始绿色与哑光质感。
      material: { color: "#f1f1ef", metalness: 0.7, roughness: .2, specularIntensity: .6, clearcoat: 0, envMapIntensity: 1 } },
    { visible: true, file: "crimson-cell", path: "/assets/models/crimson-cell/crimson-cell.glb", size: 1.1,
        material: { color: "#E38490", metalness: 1, roughness: .22, clearcoat: 0, envMapIntensity: .65 } 
     },
    { visible: true, file: "arrow", path: "/assets/models/arrow/arrow.glb", size: 1 },
    { visible: true, file: "c-mark", path: "/assets/models/figma-symbols/c-mark.glb", size: 1.2 ,
       material: { color: "#f1f1ef", metalness: 0, roughness: .32, envMapIntensity: .4 } 
    },
    { visible: false, file: "vinyl", path: "/assets/models/figma-symbols/vinyl.glb", size: 1.1 },
    { visible: false, file: "twomuch-vr-shape", path: "/assets/models/twomuch/vr-shape.glb", size: 1.4,
      material: { color: "#f1f1ef", metalness: 0, roughness: .32, envMapIntensity: .4 } },
    { visible: false, file: "twomuch-chrome-spool", path: "/assets/models/twomuch/chrome-spool.glb", size: 1.25,
      material: { color: "#ffffff", metalness: 1, roughness: .2, envMapIntensity: 1 } },
    { visible: false, file: "twomuch-blocky-teapot", path: "/assets/models/twomuch/blocky-teapot.glb", size: 1.3,
      material: { color: "#ffffff", metalness: 1, roughness: .2, envMapIntensity: 1 } },
  ].filter(item => item.visible),
  referenceSculptures: {
    goodLuck: {
      size: 1.15,
      // 煤气罐：罐身与护圈、黄铜阀门、阀孔、纸标分别调整。
      materials: {
        body: { color: "#329cd0", metalness: 0, roughness: .08, envMapIntensity: .35, ior: 1.42, clearcoat: .14, clearcoatRoughness: .42 },
        valve: { color: "#ba8945", metalness: .85, roughness: .24 },
        recess: { color: "#302117", roughness: .5 },
        label: { color: "#ffffff", roughness: .64, metalness: 0 },
      } satisfies Record<string, MeshPhysicalMaterialParameters>,
      labelColors: { background: "#eeeae3", ink: "#c82b33" },
    },
    eat: { size: 1.25, inflation: .12 },
  },
  // 仅显示三角玻璃，其余配置保留以便恢复。
  glass: {
    items: ([
      { name: "lavender-square", shape: "square", color: "#b875ff", size: .86 },
      { name: "lime-square", shape: "square", color: "#dfff58", size: .80 },
      { name: "pink-circle", shape: "circle", color: "#ff79f3", size: .88 },
      { name: "cyan-hexagon", shape: "hexagon", color: "#4de6ff", size: .91 },
      { name: "green-rosette", shape: "rosette", color: "#32d46d", size: .85 },
      { name: "lime-triangle", shape: "triangle", color: "#dfff58", size: 1.3 },
      { name: "coral-double-pill", shape: "double-pill", color: "#ff8987", size: .90 },
    ] satisfies GlassShapeConfig[]).filter(item => item.shape === "triangle"),
    finish: {
      depth: .09, bevel: .17, dome: .009, refraction: .32,
      dispersion: .025, glow: .32,
    },
  },
  // 黑胶：同心沟槽沿径向拉长高光，中心纸标单独保留原图。
  vinyl: {
    color: "#FF4545", roughness: .07, anisotropy: .9, ior: 1.54,
    envMapIntensity: 1, grooveCount: 180, grooveStrength: .12,
    labelRoughness: .78,
  },
  plaques: {
    // 每个立牌可用 material 覆盖下方共用参数；letteringMaterial 单独调整文字。
    // 留空保留现有颜色和纹理，例：letteringMaterial: { color: "#101010" }。
    items: [
      { visible: false, file: "02_plan", size: 0.8, color: "#FFFFFF", material: {} as MeshPhysicalMaterialParameters, letteringMaterial: {} as MeshPhysicalMaterialParameters },
      { visible: false, file: "03_do", size: 0.8, color: "#ffffff", material: {} as MeshPhysicalMaterialParameters, letteringMaterial: {} as MeshPhysicalMaterialParameters },
      { visible: false, file: "04_review", size: 0.6, color: "#FFFFFF", material: {} as MeshPhysicalMaterialParameters, letteringMaterial: {} as MeshPhysicalMaterialParameters },
    ].filter(item => item.visible),
    material: { roughness: .18, metalness: 0.2, envMapIntensity: .95, clearcoat: .8, clearcoatRoughness: .18 },
  },
  // Blender 模型：蓝色 ZZ 与笑脸键帽。
  characters: {
    items: ([
      {
        file: "06_blue_zz", size: .6, axisScale: [1, 1, 1], // 第三个值调整厚度。
        materials: {
          "Azure matte micrograin": { color: "#0369C8", metalness: 0, roughness: .32, clearcoat: .0, clearcoatRoughness: .5, envMapIntensity: .4, normalStrength: .55 },
        },
      },
      {
        file: "07_smiley_keycap", size: .95, axisScale: [1, 1, 1],
        materials: {
          "Keycap ivory polymer": { color: "#77FF6D", metalness: 0, roughness: .43, clearcoat: .24, clearcoatRoughness: .3, envMapIntensity: .7 },
          "Keycap charcoal smile": { color: "#121619", metalness: 0, roughness: .58, clearcoat: .06, clearcoatRoughness: .35, envMapIntensity: .65 },
        },
      },

    ] satisfies FloatingModelConfig[]).filter(item => item.file !== "07_smiley_keycap" && item.file !== "06_blue_zz"),
  },
  celestial: {
    planet: { path: "/assets/models/celestial/planet.glb?v=35289f38", size: 1.2, material: { color: "#ded9ce", metalness: 1, roughness: .4, envMapIntensity: 1.15 }, ringMaterial: { color: "#a6d3d5", metalness: .95, roughness: .23, envMapIntensity: 1.1 } },
    cloud: { path: "/assets/models/celestial/rain-cloud.glb?v=4a2e0064", size: 1.2, material: { color: "#e2e9f0", metalness: 1, roughness: .4, envMapIntensity: 1.2, clearcoat: .35, clearcoatRoughness: .12 } },
  },
  skater: {
    visible: false,
    image: "/assets/images/floating/skater-cutout.png", size: 1.72,
    // 已烘焙光影的图片：color 为染色，白色保留原色；opacity 控制透明度。
    material: { color: "#ffffff", opacity: 1, transparent: true, alphaTest: .04, depthWrite: true, side: DoubleSide, toneMapped: false },
  },
  // 按可见轮廓平衡视觉分量：细长、镂空物件略大，饱满物件略小。
  // 透明抠图始终朝向镜头，与现有物件共享漂浮和碰撞。
  cutouts: ([
    { file: "blue-organic-table", size: 1.2 },
    { file: "blue-pierced-star", size: 1.25 },
    { file: "yellow-smiley-loop", size: .8 },
    { file: "flat-apple", size: 1.3 },
    { file: "tufted-flower", size: 1.4 },
    { file: "cape-horse", size: 2.5 },
    { file: "cupid", size: 1.25 },
    { file: "flying-pig", size: 1.25 },
    { file: "goldfish-silver-headphones", size: 1.25 },
    { file: "jimmyzz-vintage-car", size: 1.35 },
  ] satisfies { file: string; size: number }[]).filter(item => item.file !== "tufted-flower"),
  // 程序化开放旋臂；arms 控制数量，pixels 控制颗粒，speed 控制速度。
  vortex: {
    size: 1.5, pixels: 80, speed: .65, arms: 5,
  },
  portalGun: {
    size: 1.8,
    materials: {
      shell: { color: "#35B221", metalness: .08, roughness: .4, clearcoat: 0.8, clearcoatRoughness: .16, envMapIntensity: 1.1 },
      trim: { color: "#FAFF66", metalness: .02, roughness: .25, clearcoat: .65 },
      buttons: { color: "#EDEDED", metalness: 1, roughness: .22, clearcoat: .35 },
    },
  },
  gamepad: {
    size: 1.35,
    materials: {
      shell: { color: "#FFFF85", metalness: 0, roughness: .4, envMapIntensity: .65, clearcoat: .18, clearcoatRoughness: .32 },
      edge: { color: "#44484d", metalness: 0, roughness: .52, envMapIntensity: .55 },
      rubber: { color: "#202428", metalness: 0, roughness: .78, envMapIntensity: .45 },
      buttons: { color: "#ff463a", metalness: 0, roughness: .27, clearcoat: .48, clearcoatRoughness: .18 },
      screws: { color: "#dfe5e5", metalness: 1, roughness: .18 },
    },
    labels: { onRed: "#25292b", onDark: "#ff594b", material: { color: "#ffffff", opacity: 1, transparent: true, depthWrite: false } },
  },
  // 金属外观也受环境与灯光影响。
  lighting: {
   
    exposure: 1, environment: "/assets/environments/bg.jpg", environmentIntensity: .9,
    // Logo 的局部反射独立于 environmentIntensity，需保留足够的棚拍亮部。
    reflectionBackgroundIntensity: 1.1,
    ambient: { color: "#FFFFFF", intensity: .08 },
    directional: { color: "#ffffff", intensity: 0 },
    // 左上主光与右侧补光拉开光比，收紧高光以突出曲面起伏。
    studio: [
      { color: "#FFFFFF", intensity: 8, width: 3, height: 2.5, position: [-4.5, 5, 4] },
      { color: "#FFFFFF", intensity: 3, width: 2.2, height: 3.5, position: [4, .5, 3] },
      // 侧后方窄条轮廓光，靠近物件以增强边缘高光。
      { color: "#ffffff", intensity: 6, width: 1.2, height: 3.5, position: [3, 2, -2.5] },
    ],
  },
};
