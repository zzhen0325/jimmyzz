import { DoubleSide, type MeshPhysicalMaterialParameters } from "three";

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
  // 全部漂浮物的倍率；Logo 单独调整。手机断点为 700px。
  sizing: { desktop: .9, mobile: .72, mobileBreakpoint: 700 },
  logo: {
    scale: 1, // 正常尺寸上限
    maxViewportWidth: .68, // 窄屏最大占宽比例
    material: { ...silver },
  },
  // 原图手写 Jimmy，作为独立漂浮物参与物理互动。
  wordmark: {
    size: 1.65,
    material: { color: "#25282d", metalness: .72, roughness: .25, envMapIntensity: 1.15, clearcoat: .8, clearcoatRoughness: .16 },
  },
  plaques: {
    // 每个立牌可用 material 覆盖下方共用参数；letteringMaterial 单独调整文字。
    // 留空保留现有颜色和纹理，例：letteringMaterial: { color: "#101010" }。
    items: [
      { file: "01_think", size: 1.2, color: "#FF5ECF", material: {} as MeshPhysicalMaterialParameters, letteringMaterial: {} as MeshPhysicalMaterialParameters },
      { file: "02_plan", size: 0.8, color: "#3757F6", material: {} as MeshPhysicalMaterialParameters, letteringMaterial: {} as MeshPhysicalMaterialParameters },
      { file: "03_do", size: 0.8, color: "#51DA47", material: {} as MeshPhysicalMaterialParameters, letteringMaterial: {} as MeshPhysicalMaterialParameters },
      { file: "04_review", size: 0.6, color: "#FFE343", material: {} as MeshPhysicalMaterialParameters, letteringMaterial: {} as MeshPhysicalMaterialParameters },
      { file: "05_repeat", size: 0.8, color: "#B672FF", material: {} as MeshPhysicalMaterialParameters, letteringMaterial: {} as MeshPhysicalMaterialParameters },
    ],
    material: { roughness: .38, metalness: 0, envMapIntensity: .95, clearcoat: .32, clearcoatRoughness: .28 },
  },
  // Blender 模型：灰色情绪角色、蓝色 ZZ 与笑脸键帽。
  characters: {
    items: [

      {
        file: "02_meh", size: 1.0, axisScale: [1, 1, 1],
        materials: {
          "Cloud clay": { color: "#C4C6C9", metalness: 0, roughness: .54, clearcoat: .12, clearcoatRoughness: .4, envMapIntensity: .8 },
          "Raised charcoal expressions": { color: "#101311", metalness: 0, roughness: .48, clearcoat: .08, clearcoatRoughness: .3, envMapIntensity: .65 },
        },
      },
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
    planet: { size: 1.45, material: { color: "#ded9ce", metalness: 1, roughness: .2, envMapIntensity: 1.15 }, ringMaterial: { color: "#a6d3d5", metalness: .95, roughness: .23, envMapIntensity: 1.1 } },
    cloud: { size: 1.4, material: { color: "#e2e9f0", metalness: 1, roughness: .14, envMapIntensity: 1.2, clearcoat: .35, clearcoatRoughness: .12 } },
  },
  skater: {
    image: "/assets/images/skater-cutout.webp", size: 1.45,
    // 已烘焙光影的图片：color 为染色，白色保留原色；opacity 控制透明度。
    material: { color: "#ffffff", opacity: 1, transparent: true, alphaTest: .04, depthWrite: true, side: DoubleSide, toneMapped: false },
  },
  // 透明抠图始终朝向镜头，与现有物件共享漂浮和碰撞。
  cutouts: [
    { file: "barrier", size: 1.35 },
    { file: "chrome-head", size: 1.05 },
    { file: "cat-head", size: .95 },
    { file: "fries", size: .9 },
    { file: "cash-roll", size: .85 },
    { file: "trash-bag", size: 1.15 },
  ],
  // 程序化开放旋臂；arms 控制数量，pixels 控制颗粒，speed 控制速度。
  vortex: {
    size: 1, pixels: 80, speed: .65, arms: 5,
  },
  portalGun: {
    size: 1.6,
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
    // 参考站原图：https://www.twomuch.studio/glb/bg_medium.jpg
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
