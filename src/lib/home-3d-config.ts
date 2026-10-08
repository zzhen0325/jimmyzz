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
  color: "#FFFFFF", metalness: 1, roughness: .16, envMapIntensity: 0.6,
};

export const home3DConfig = {
  // 白色石膏只用于漂浮物；后景按镜头相对深度平滑切换，Logo 保持银铬。
  plaster: { color: "#eeede8", grain: .035, transitionStart: -.12, transitionEnd: .75 },
  // 全部漂浮物的倍率；Logo 单独调整。手机断点为 700px。
  sizing: { desktop: .6, mobile: .42, mobileBreakpoint: 700, referenceAspect: 1116 / 626 },
  logo: {
    scale: 1, // 正常尺寸上限
    maxViewportWidth: .87, // 参考图：两侧各留约 6.5%。
    mobileViewportWidth: .82,
    maxViewportHeight: .54,
    centerY: .50, // 首屏垂直居中。
    material: { ...silver },
  },
  // 原图手写 Jimmy，作为独立漂浮物参与物理互动。
  wordmark: {
    size: 1.85,
    material: { color: "#25282d", metalness: .72, roughness: .25, envMapIntensity: 1.15, clearcoat: .8, clearcoatRoughness: .16 },
  },
  // 独立实体模型，与原有漂浮物共用碰撞和材质景深。
  sculptedProps: [
    { file: "c-mark", size: .75 },
    { file: "vinyl", size: 1.1 },
  ],
  // 七个彩边模拟玻璃：灰度高度图驱动形变，共用背景采样；保留实体厚度与圆角。
  glass: {
    items: [
      { name: "lavender-square", shape: "square", color: "#b875ff", size: .86 },
      { name: "lime-square", shape: "square", color: "#dfff58", size: .80 },
      { name: "pink-circle", shape: "circle", color: "#ff79f3", size: .88 },
      { name: "cyan-hexagon", shape: "hexagon", color: "#4de6ff", size: .91 },
      { name: "green-rosette", shape: "rosette", color: "#32d46d", size: .85 },
      { name: "lime-triangle", shape: "triangle", color: "#dfff58", size: .95 },
      { name: "coral-double-pill", shape: "double-pill", color: "#ff8987", size: .90 },
    ] satisfies GlassShapeConfig[],
    finish: {
      depth: .09, bevel: .17, dome: .009, refraction: .32,
      dispersion: .025, glow: .32,
    },
  },
  // 黑胶：同心沟槽沿径向拉长高光，中心纸标单独保留原图。
  vinyl: {
    color: "#090a0c", roughness: .27, anisotropy: .9, ior: 1.54,
    envMapIntensity: 1, grooveCount: 180, grooveStrength: .12,
    labelRoughness: .78,
  },
  plaques: {
    // 每个立牌可用 material 覆盖下方共用参数；letteringMaterial 单独调整文字。
    // 留空保留现有颜色和纹理，例：letteringMaterial: { color: "#101010" }。
    items: [
      { file: "02_plan", size: 0.8, color: "#FFFFFF", material: {} as MeshPhysicalMaterialParameters, letteringMaterial: {} as MeshPhysicalMaterialParameters },
      { file: "03_do", size: 0.8, color: "#ffffff", material: {} as MeshPhysicalMaterialParameters, letteringMaterial: {} as MeshPhysicalMaterialParameters },
      { file: "04_review", size: 0.6, color: "#FFFFFF", material: {} as MeshPhysicalMaterialParameters, letteringMaterial: {} as MeshPhysicalMaterialParameters },
    ],
    material: { roughness: .18, metalness: 0.2, envMapIntensity: .95, clearcoat: .8, clearcoatRoughness: .18 },
  },
  // Blender 模型：蓝色 ZZ 与笑脸键帽。
  characters: {
    items: [
      {
        file: "06_blue_zz", size: .6, axisScale: [1, 1, 1], // 第三个值调整厚度。
        materials: {
          "Azure matte micrograin": { color: "#0369C8", metalness: 0, roughness: .66, clearcoat: .06, clearcoatRoughness: .5, envMapIntensity: .65, normalStrength: .55 },
        },
      },
      {
        file: "07_smiley_keycap", size: .95, axisScale: [1, 1, 1],
        materials: {
          "Keycap ivory polymer": { color: "#77FF6D", metalness: 0, roughness: .43, clearcoat: .24, clearcoatRoughness: .3, envMapIntensity: .7 },
          "Keycap charcoal smile": { color: "#121619", metalness: 0, roughness: .58, clearcoat: .06, clearcoatRoughness: .35, envMapIntensity: .65 },
        },
      },

    ] satisfies FloatingModelConfig[],
  },
  celestial: {
    planet: { size: .58, material: { color: "#ded9ce", metalness: 1, roughness: .2, envMapIntensity: 1.15 }, ringMaterial: { color: "#a6d3d5", metalness: .95, roughness: .23, envMapIntensity: 1.1 } },
    cloud: { size: .38, material: { color: "#e2e9f0", metalness: 1, roughness: .14, envMapIntensity: 1.2, clearcoat: .35, clearcoatRoughness: .12 } },
  },
  skater: {
    image: "/assets/images/skater-cutout.webp", size: 1.72,
    // 已烘焙光影的图片：color 为染色，白色保留原色；opacity 控制透明度。
    material: { color: "#ffffff", opacity: 1, transparent: true, alphaTest: .04, depthWrite: true, side: DoubleSide, toneMapped: false },
  },
  // 透明抠图始终朝向镜头，与现有物件共享漂浮和碰撞。
  cutouts: [
    { file: "weather-cylinder", size: 1.15 },
    { file: "flat-apple", size: 1.25 },
    { file: "tufted-flower", size: 1.4 },
    { file: "cape-horse", size: 1.85 },
  ] satisfies { file: string; size: number }[],
  // 程序化开放旋臂；arms 控制数量，pixels 控制颗粒，speed 控制速度。
  vortex: {
    size: 1, pixels: 80, speed: .65, arms: 5,
  },
  portalGun: {
    size: 1.3,
    materials: {
      shell: { color: "#35B221", metalness: .08, roughness: .4, clearcoat: 0.8, clearcoatRoughness: .16, envMapIntensity: 1.1 },
      trim: { color: "#FAFF66", metalness: .02, roughness: .25, clearcoat: .65 },
      buttons: { color: "#e5e8eb", metalness: 1, roughness: .22, clearcoat: .35 },
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
   
    exposure: 1, environment: "/assets/environments/twomuch-bg-medium.jpg", environmentIntensity: .9,
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
