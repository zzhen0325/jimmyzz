// A fresh document uses the full loader; a retained scene uses its compact variant.
let sceneReady = false;

export function setHomeSceneReady(ready: boolean) {
  sceneReady = ready;
}

export function shouldShowHomeLoader() {
  return !sceneReady;
}
