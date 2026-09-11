import type { MeshPhysicalMaterialParameters } from "three";

// 首页 3D 调整入口。保存后刷新页面即可查看。
// size：物件最长边的场景单位，会同步更新碰撞体；颜色使用十六进制。
// metalness：0 塑料 → 1 金属；roughness：0 镜面 → 1 磨砂。
// envMapIntensity：环境反射强度；clearcoat / clearcoatRoughness：清漆强度 / 粗糙度。
const silver: MeshPhysicalMaterialParameters = {
  color: "#ffffff", metalness: 1, roughness: .2, envMapIntensity: 1,
};
const silverObject = (size: number) => ({ size, material: { ...silver }, animateMaterial: true });

export const home3DConfig = {
  // 全部漂浮物的倍率；Logo 单独调整。手机断点为 700px。
  sizing: { desktop: 1, mobile: .72, mobileBreakpoint: 700 },
  logo: {
    scale: 1.2, // 正常尺寸上限
    maxViewportWidth: .68, // 窄屏最大占宽比例
    material: { ...silver },
  },
  plaques: {
    // 只替换 Resin 材质颜色，保留模型自带的文字颜色和纹理。
    items: [
      { file: "01_think", size: 1.2, color: "#FF5ECF" },
      { file: "02_plan", size: 0.8, color: "#3757F6" },
      { file: "03_do", size: 0.8, color: "#51DA47" },
      { file: "04_review", size: 0.6, color: "#FFE343" },
      { file: "05_repeat", size: 0.8, color: "#B672FF" },
    ],
    material: { roughness: .72, metalness: .02, envMapIntensity: 1, clearcoat: .2, clearcoatRoughness: .52 },
  },
  objects: {
    torus: silverObject(.95), // 粗圆环
    knot: silverObject(.85), // 扭结
    sphere: silverObject(.6), // 球
    capsule: silverObject(.8), // 胶囊
    thinRing: silverObject(.9), // 细圆环
    star: { size: .22, material: { color: "#ffbd42", metalness: .15, roughness: .82, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.5 } },
    spring: silverObject(.82), // 弹簧
    crystal: { size: .64, material: { color: "#b7a2ff", metalness: .5, roughness: .16, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.6 } },
    linkedRings: silverObject(.78), // 链环
  },
  // animateMaterial 为 true 的物件使用以下范围覆盖静态材质；关闭后使用 material。
  materialAnimation: {
    speed: .4, power: 5,
    envMapIntensity: [1.1, 1.75], metalness: [.72, 1], roughness: [.3, .14],
  },
  gamepad: {
    size: 1.35,
    materials: {
      shell: { color: "#FFECC7", metalness: 0, roughness: .48, envMapIntensity: .3 },
      edge: { color: "#44484d", metalness: 0, roughness: .6, envMapIntensity: .3 },
      rubber: { color: "#202428", metalness: .08, roughness: .65 },
      buttons: { color: "#ff463a", metalness: .15, roughness: .32 },
      screws: { color: "#dfe5e5", metalness: 1, roughness: .18 },
    },
    labels: { onRed: "#25292b", onDark: "#ff594b" },
  },
  // 金属外观也受环境与灯光影响。
  lighting: {
    exposure: 1, environment: "/assets/environments/twomuch-studio.jpg", environmentIntensity: 1,
    ambient: { color: "#ffffff", intensity: .02 },
    directional: { color: "#ffffff", intensity: .1 },
    studio: [
      { color: "#fff3e5", intensity: 2.2, position: [-4, 5, 5] },
      { color: "#2471FF", intensity: .8, position: [4, 1, 4] },
      { color: "#ffffff", intensity: 2.6, position: [2, -3, -4] },
    ],
  },
};
