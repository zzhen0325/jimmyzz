// A fresh document loads normally; only a successfully retained scene skips it.
let sceneReady = false;

export function setHomeSceneReady(ready: boolean) {
  sceneReady = ready;
}

export function shouldShowHomeLoader() {
  return !sceneReady;
}
