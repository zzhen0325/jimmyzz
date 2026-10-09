import { LoadingManager } from "three";
import { homeAssetUrl } from "./home-asset-url";

// Share URL resolution only; each scene still owns and disposes its GPU resources.
export const homeAssetManager = new LoadingManager().setURLModifier(homeAssetUrl);
