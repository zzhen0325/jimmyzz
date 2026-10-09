import { homeAssetManager } from "./home-asset-manager";
import { Group, Mesh, MeshStandardMaterial, type Material, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** Blender-authored Portal Gun Jr.; retain its molded surfaces and printed colors. */
export async function createChromePortalGun() {
  const { scene } = await new GLTFLoader(homeAssetManager).loadAsync("/assets/models/home-optimized/portal-gun/portal-gun-jr.glb?v=3");
  scene.name = "floating-green-portal-gun";
  const bubbles: Object3D[] = [];
  const glowMaterials = new Map<Material, MeshStandardMaterial>();
  let glowTime = 0;
  let floatTime = 0;
  const reservoir = new Group();
  reservoir.name = "portal-reservoir-bubbles";
  // The exported model is Y-up, centered on the reservoir's vertical axis.
  reservoir.position.set(-.43, 0, 0);
  scene.traverse(child => {
    if (/^Suspended[ _]portal[ _]bubble/.test(child.name)) bubbles.push(child);
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
    bubble.traverse(child => {
      if (!(child instanceof Mesh)) return;
      const addGlow = (material: Material) => {
        if (!(material instanceof MeshStandardMaterial)) return material;
        let glowing = glowMaterials.get(material);
        if (!glowing) {
          // Keep the pool and emitter unchanged even when they share this material.
          glowing = material.clone();
          glowing.emissive.set("#70ff16");
          glowing.emissiveIntensity = .15;
          glowMaterials.set(material, glowing);
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
      glowTime = (glowTime + delta) % 1.6;
      const pulse = (.5 - .5 * Math.cos(glowTime / 1.6 * Math.PI * 2)) ** 3;
      glowMaterials.forEach(material => {
        material.emissiveIntensity = .15 + pulse * 3;
      });
    },
  };
}
