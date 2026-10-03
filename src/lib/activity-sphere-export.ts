import * as THREE from "three";

/** Render a frozen view with the original images, independent of preview resolution. */
export async function exportSpherePng(
  geometry: THREE.InstancedBufferGeometry,
  material: THREE.ShaderMaterial,
  camera: THREE.PerspectiveCamera,
  viewport: THREE.Vector2,
  sources: string[],
  longEdge: number,
  trim = true,
) {
  if (![2048, 4096, 8192].includes(longEdge)) throw new Error("请选择 2048、4096 或 8192 像素");
  // Snapshot before loading: rotation and settings may continue changing in the preview.
  const frozenCamera = camera.clone();
  const uniforms: THREE.ShaderMaterial["uniforms"] = THREE.UniformsUtils.clone({ ...material.uniforms, atlas: { value: null } });
  uniforms.atlasTileSize.value.set(1, 1);
  const centers = new Float32Array(geometry.getAttribute("instanceCenter").array);
  const sizes = new Float32Array(geometry.getAttribute("instanceSize").array);
  const ids = new Float32Array(geometry.getAttribute("instanceId").array);
  const count = geometry.instanceCount;
  const vertexShader = material.vertexShader;
  const fragmentShader = material.fragmentShader;
  const output = document.createElement("canvas");
  const renderCanvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas: renderCanvas, alpha: true, antialias: true });
  const textures: THREE.Texture[] = [];
  const geometries: THREE.InstancedBufferGeometry[] = [];
  const materials: THREE.ShaderMaterial[] = [];
  const plane = new THREE.PlaneGeometry(1, 1);
  try {
    const gl = renderer.getContext();
    const limit = Math.min(renderer.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
    const tileSize = Math.min(2048, limit);
    renderer.setPixelRatio(1);

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const loader = new THREE.TextureLoader();
    // A separate material per source preserves every pixel of the 1080px originals.
    // These textures and the export renderer exist only for this export.
    for (let image = 0; image < sources.length; image++) {
      const indices: number[] = [];
      for (let i = 0; i < count; i++) if ((i * 17) % sources.length === image) indices.push(i);
      if (!indices.length) continue;
      const texture = await loader.loadAsync(sources[image]);
      textures.push(texture);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      const instanceCenters = new Float32Array(indices.length * 3);
      const instanceSizes = new Float32Array(indices.length * 2);
      const instanceIds = new Float32Array(indices.length);
      indices.forEach((index, i) => {
        instanceCenters.set(centers.subarray(index * 3, index * 3 + 3), i * 3);
        instanceSizes.set(sizes.subarray(index * 2, index * 2 + 2), i * 2);
        instanceIds[i] = ids[index];
      });
      const part = new THREE.InstancedBufferGeometry();
      part.index = plane.index;
      part.attributes.position = plane.attributes.position;
      part.attributes.uv = plane.attributes.uv;
      part.setAttribute("instanceCenter", new THREE.InstancedBufferAttribute(instanceCenters, 3));
      part.setAttribute("instanceSize", new THREE.InstancedBufferAttribute(instanceSizes, 2));
      part.setAttribute("instanceId", new THREE.InstancedBufferAttribute(instanceIds, 1));
      part.setAttribute("instanceAtlas", new THREE.InstancedBufferAttribute(new Float32Array(indices.length * 2), 2));
      part.instanceCount = indices.length;
      geometries.push(part);
      const originalMaterial = new THREE.ShaderMaterial({
        uniforms: { ...THREE.UniformsUtils.clone(uniforms), atlas: { value: texture } },
        vertexShader, fragmentShader, depthTest: true, depthWrite: true,
        transparent: false, side: THREE.DoubleSide,
      });
      materials.push(originalMaterial);
      const mesh = new THREE.Mesh(part, originalMaterial);
      mesh.frustumCulled = false;
      scene.add(mesh);
    }
    let cropX = 0, cropY = 0, cropWidth = viewport.x, cropHeight = viewport.y;
    if (trim) {
      const probeEdge = Math.min(1024, tileSize);
      const probeWidth = Math.max(1, Math.round(probeEdge * viewport.x / Math.max(viewport.x, viewport.y)));
      const probeHeight = Math.max(1, Math.round(probeEdge * viewport.y / Math.max(viewport.x, viewport.y)));
      renderer.setSize(probeWidth, probeHeight, false);
      renderer.render(scene, frozenCamera);
      const pixels = new Uint8Array(probeWidth * probeHeight * 4);
      gl.readPixels(0, 0, probeWidth, probeHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let left = probeWidth, right = -1, bottom = probeHeight, top = -1;
      for (let y = 0; y < probeHeight; y++) for (let x = 0; x < probeWidth; x++) {
        if (pixels[(y * probeWidth + x) * 4 + 3] === 0) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        bottom = Math.min(bottom, y); top = Math.max(top, y);
      }
      if (right < left) throw new Error("当前画面没有可导出的图片");
      const padding = Math.max(2, Math.ceil(Math.max(right - left + 1, top - bottom + 1) * 0.02));
      left = Math.max(0, left - padding); right = Math.min(probeWidth, right + 1 + padding);
      bottom = Math.max(0, bottom - padding); top = Math.min(probeHeight, top + 1 + padding);
      cropX = left / probeWidth * viewport.x;
      cropY = (probeHeight - top) / probeHeight * viewport.y;
      cropWidth = (right - left) / probeWidth * viewport.x;
      cropHeight = (top - bottom) / probeHeight * viewport.y;
    }
    const width = Math.max(1, Math.round(longEdge * cropWidth / Math.max(cropWidth, cropHeight)));
    const height = Math.max(1, Math.round(longEdge * cropHeight / Math.max(cropWidth, cropHeight)));
    output.width = width;
    output.height = height;
    const context = output.getContext("2d");
    if (!context) throw new Error("无法创建导出画布");
    // Render at final pixel density in small tiles; never enlarge the preview canvas.
    for (let y = 0; y < height; y += tileSize) for (let x = 0; x < width; x += tileSize) {
      const tileWidth = Math.min(tileSize, width - x);
      const tileHeight = Math.min(tileSize, height - y);
      frozenCamera.setViewOffset(viewport.x, viewport.y,
        cropX + x / width * cropWidth, cropY + y / height * cropHeight,
        tileWidth / width * cropWidth, tileHeight / height * cropHeight);
      renderer.setSize(tileWidth, tileHeight, false);
      renderer.render(scene, frozenCamera);
      context.drawImage(renderCanvas, x, y);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    const blob = await new Promise<Blob>((resolve, reject) => {
      output.toBlob(value => value ? resolve(value) : reject(new Error("PNG 生成失败，请重试")), "image/png");
    });
    return { blob, width, height };
  } finally {
    textures.forEach(texture => texture.dispose());
    materials.forEach(item => item.dispose());
    geometries.forEach(item => item.dispose());
    plane.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderCanvas.width = 0;
    renderCanvas.height = 0;
    output.width = 0;
    output.height = 0;
  }
}
