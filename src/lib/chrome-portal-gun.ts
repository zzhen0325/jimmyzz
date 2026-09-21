import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** Blender-authored Portal Gun Jr.; retain its molded surfaces and printed colors. */
export async function createChromePortalGun() {
  const { scene } = await new GLTFLoader().loadAsync("/assets/models/portal-gun/portal-gun-jr.glb?v=3");
  scene.name = "floating-green-portal-gun";
  return scene;
}
