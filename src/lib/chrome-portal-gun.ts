import { homeAssetManager } from "./home-asset-manager";
import { FrontSide, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Vector3, type Material, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const bubbleGlow = { base: .15, amplitude: 6, period: 1.6 };

// 白色枪身与顶部面板：颜色使用十六进制；粗糙度、金属度范围为 0–1。
const housingMaterials: Record<string, { color: string; roughness: number; metalness: number }> = {
  "Warm grey molded housing": { color: "#EBEBEB", roughness: .1, metalness: 1 },
  "Ivory face": { color: "#edf0e6", roughness: .1, metalness: 1 },
};

/** Blender-authored Portal Gun Jr.; retain its molded surfaces and printed colors. */
export async function createChromePortalGun() {
  const { scene } = await new GLTFLoader(homeAssetManager).loadAsync("/assets/models/home-optimized/portal-gun/portal-gun-jr.glb?v=3");
  scene.name = "floating-green-portal-gun";
  const bubbles: Object3D[] = [];
  const glowMaterials: { material: MeshStandardMaterial; phase: number }[] = [];
  const housingOverrides = new Map<Material, MeshStandardMaterial>();
  let glowTime = 0;
  let floatTime = 0;
  const reservoir = new Group();
  reservoir.name = "portal-reservoir-bubbles";
  // The exported model is Y-up, centered on the reservoir's vertical axis.
  reservoir.position.set(-.43, 0, 0);
  scene.traverse(child => {
    if (/^Suspended[ _]portal[ _]bubble/.test(child.name)) bubbles.push(child);
    if (!(child instanceof Mesh)) return;
    if (!Array.isArray(child.material) && child.material.name === "Warm grey molded housing") {
      // The flat underside inherits slightly tilted bevel normals. Mirror-like
      // materials expose their interpolation as triangular reflection patches.
      // Split corners so correcting the plane does not flatten the rounded rim.
      const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
      const positions = geometry.getAttribute("position");
      const normals = geometry.getAttribute("normal");
      const a = new Vector3(), b = new Vector3(), c = new Vector3();
      const edge = new Vector3(), face = new Vector3();
      if (normals) {
        for (let i = 0; i < positions.count; i += 3) {
          a.fromBufferAttribute(positions, i);
          b.fromBufferAttribute(positions, i + 1);
          c.fromBufferAttribute(positions, i + 2);
          face.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
          if (Math.max(a.y, b.y, c.y) >= -.3 || face.y > -.9999) continue;
          for (let corner = 0; corner < 3; corner++) normals.setXYZ(i + corner, 0, -1, 0);
        }
        normals.needsUpdate = true;
      }
      child.geometry = geometry;
    }
    const applyMaterialOverrides = (material: Material) => {
      const housing = housingMaterials[material.name];
      if (housing && material instanceof MeshStandardMaterial) {
        let override = housingOverrides.get(material);
        if (!override) {
          override = material.clone();
          override.color.set(housing.color);
          override.roughness = housing.roughness;
          override.metalness = housing.metalness;
          housingOverrides.set(material, override);
        }
        return override;
      }
      if (!(material instanceof MeshPhysicalMaterial) || material.name !== "Green transparent reservoir") return material;
      const glass = material.clone();
      // Retain the authored green tint and a visible shell while revealing its contents.
      glass.transmission = 0;
      glass.transparent = true;
      glass.opacity = .48;
      glass.roughness = .12;
      glass.depthWrite = false;
      glass.side = FrontSide;
      return glass;
    };
    child.material = Array.isArray(child.material)
      ? child.material.map(applyMaterialOverrides)
      : applyMaterialOverrides(child.material);
  });
  scene.add(reservoir);
  scene.updateMatrixWorld(true);
  const floatingBubbles = bubbles.map((bubble, index) => {
    // Separate parents keep the rigid-mesh batcher from merging moving bubbles.
    const carrier = new Group();
    carrier.name = `portal-bubble-motion-${index}`;
    reservoir.add(carrier);
    carrier.attach(bubble);
    carrier.position.copy(bubble.position);
    bubble.position.set(0, 0, 0);
    const origin = carrier.position.clone();
    const bubbleMaterials = new Map<Material, MeshStandardMaterial>();
    bubble.traverse(child => {
      if (!(child instanceof Mesh)) return;
      const addGlow = (material: Material) => {
        if (!(material instanceof MeshStandardMaterial)) return material;
        let glowing = bubbleMaterials.get(material);
        if (!glowing) {
          // Keep the pool and emitter unchanged even when they share this material.
          glowing = material.clone();
          glowing.color.set("#14290E");
          glowing.emissive.set("#70ff16");
          glowing.emissiveIntensity = bubbleGlow.base;
          bubbleMaterials.set(material, glowing);
          glowMaterials.push({ material: glowing, phase: index * 2.399 });
        }
        return glowing;
      };
      child.material = Array.isArray(child.material)
        ? child.material.map(addGlow)
        : addGlow(child.material);
    });
    return { carrier, origin, phase: index * 2.399, speed: .7 + (index % 7) * .13 };
  });
  return {
    scene,
    update(delta: number) {
      floatTime += delta;
      const entrance = Math.min(1, floatTime / 1.2);
      const blend = entrance * entrance * (3 - 2 * entrance);
      floatingBubbles.forEach(({ carrier, origin, phase, speed }) => {
        const time = floatTime * speed;
        // Independent paths stay inside the dome, including each ball's radius.
        carrier.position.set(
          .23 * Math.sin(time + phase),
          .85 + .38 * (.5 + .5 * Math.sin(time * 1.3 + phase)),
          .18 * Math.sin(time * .83 + phase * 1.7),
        ).lerp(origin, 1 - blend);
        // The scene freezes internal matrices after batching rigid meshes.
        carrier.updateMatrix();
      });
      glowTime = (glowTime + delta) % bubbleGlow.period;
      // A dark pause and a short bright peak make each pulse clearly visible.
      glowMaterials.forEach(({ material, phase }) => {
        const pulse = (.5 - .5 * Math.cos(glowTime / bubbleGlow.period * Math.PI * 2 + phase)) ** 3;
        material.emissiveIntensity = bubbleGlow.base + pulse * bubbleGlow.amplitude;
      });
    },
  };
}
