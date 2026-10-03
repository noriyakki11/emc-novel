// Jane's workshop as a live 3D room, shared by the novel and the prototype viewer.
// The baked toon colour atlas is shown unlit (already through Blender's AgX look) and dimmed like the novel's 2D
// backgrounds; Freestyle-like lines are drawn where the object id changes, a part folds behind itself, or the surface
// bends sharper than 134 degrees. Lighting is a whole-atlas swap (day / night bake the same meshes and UV layout).
import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';

const SKY = { day: 0xc9dcea, night: 0x1a1d2c };
const LINE = new THREE.Color(0x1b1f2c);

// one file at a time with retries: simple static servers drop connections under parallel requests
async function retry(get, tries = 4) {
  for (let i = 1; ; i++) {
    try { return await get(i); } catch (e) { if (i >= tries) throw e; await new Promise(r => setTimeout(r, 300 * i)); }
  }
}

// Pictures are sampled and shown as stored sRGB values (the way the browser draws a 2D <img>); the room is dimmed
// like the novel's backgrounds (CSS brightness .86, saturate .95) so the card in front stands out the same way.
function flatMaterial(renderer, texture, { dim = 1, saturate = 1 } = {}) {
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: texture }, dim: { value: dim }, saturate: { value: saturate } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D map; uniform float dim; uniform float saturate; varying vec2 vUv;
      void main() {
        vec3 c = texture2D(map, vUv).rgb;
        float l = dot(c, vec3(0.213, 0.715, 0.072));
        gl_FragColor = vec4(mix(vec3(l), c, saturate) * dim, 1.0);
      }`,
  });
}

const passMaterial = (flag, body) => new THREE.ShaderMaterial({
  uniforms: { flag: { value: flag } }, vertexColors: true,
  vertexShader: 'varying vec3 vN; varying vec3 vId; void main() { vN = normalize(normalMatrix * normal); vId = color.rgb; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float flag; varying vec3 vN; varying vec3 vId; void main() { ${body} }`,
});

// version: appended to asset URLs (?v=) so a new bake is not served from the browser's cache
export async function createRoom({ container, assets, lightings = ['day'], dim = 0.86, saturate = 0.95, version = '', onStep = () => {} }) {
  const v = version ? `?v=${version}` : '';
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = false;
  Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 60);
  let lens = 22, viewW = 2, viewH = 2, lighting = lightings[0];

  // ---- assets ------------------------------------------------------------------------------------------------------------
  // Pictures are decoded off the main thread where the browser can (an <img> is decoded on the main thread at its first
  // draw: the 4096 px colour atlas froze the page for about 0.2 s). ImageBitmaps ignore flipY, so a card is flipped here.
  const textures = new THREE.TextureLoader();
  const bitmaps = typeof createImageBitmap === 'function' && (orientation => new THREE.ImageBitmapLoader()
    .setOptions(orientation ? { imageOrientation: orientation, premultiplyAlpha: 'none' } : { premultiplyAlpha: 'none' }));
  const atlasBitmaps = bitmaps && bitmaps(), cardBitmaps = bitmaps && bitmaps('flipY');
  async function loadPicture(url, flip) {
    const loader = flip ? cardBitmaps : atlasBitmaps;
    if (!loader) { const t = await textures.loadAsync(url); t.flipY = flip; return t; }
    const t = new THREE.Texture(await loader.loadAsync(url));
    t.flipY = false;
    t.needsUpdate = true;
    return t;
  }
  onStep('카메라');
  const shots = await retry(() => fetch(`${assets}/workshop_shots.json${v}`).then(r => { if (!r.ok) throw new Error(`${r.status} shots`); return r.json(); }));
  onStep('작업실 형상');
  const gltf = await retry(() => new GLTFLoader().loadAsync(`${assets}/workshop.glb${v}`));
  onStep('색 지도');
  const atlasUrl = l => `${assets}/workshop_${l}.webp${v}`;
  const loadAtlas = l => retry(i => loadPicture(i > 1 ? `${atlasUrl(l)}${v ? '&' : '?'}retry=${i}` : atlasUrl(l), false));
  const atlases = {}, pending = {};
  for (const l of lightings) atlases[l] = await loadAtlas(l);
  const roomMaterial = flatMaterial(renderer, atlases[lighting], { dim, saturate });
  const room = gltf.scene;
  const meshes = [];
  room.traverse(o => {
    if (!o.isMesh) return;
    o.material = roomMaterial;
    o.userData.lines = /outlined|door/.test(`${o.name} ${o.parent?.name || ''}`) ? 'line' : 'plain';
    meshes.push(o);
  });
  scene.add(room);
  const door = room.getObjectByName('door');

  // ---- line pass ------------------------------------------------------------------------------------------------------
  const normalTarget = new THREE.WebGLRenderTarget(2, 2, { depthTexture: new THREE.DepthTexture(2, 2) });
  const idTarget = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const NORMAL = 'gl_FragColor = vec4(normalize(vN) * 0.5 + 0.5, flag);', ID = 'gl_FragColor = vec4(vId.rg, 0.0, flag);';
  const passes = {
    normal: { line: passMaterial(1, NORMAL), plain: passMaterial(0, NORMAL) },
    id: { line: passMaterial(1, ID), plain: passMaterial(0, ID) },
  };
  const edgeMaterial = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      tNormal: { value: normalTarget.texture }, tDepth: { value: normalTarget.depthTexture }, tId: { value: idTarget.texture },
      texel: { value: new THREE.Vector2() }, width: { value: 2 }, near: { value: camera.near }, far: { value: camera.far },
      lineColor: { value: LINE },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tNormal; uniform sampler2D tDepth; uniform sampler2D tId; uniform vec2 texel; uniform float width;
      uniform float near; uniform float far; uniform vec3 lineColor; varying vec2 vUv;
      float depthAt(vec2 uv) { float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
      float idAt(vec2 uv) { vec4 c = texture2D(tId, uv); return floor(c.r * 255.0 + 0.5) + 256.0 * floor(c.g * 255.0 + 0.5); }
      void main() {
        vec4 nc = texture2D(tNormal, vUv);
        if (nc.a < 0.5) { gl_FragColor = vec4(0.0); return; }
        float dc = depthAt(vUv), ic = idAt(vUv); vec3 n0 = nc.xyz * 2.0 - 1.0;
        float edge = 0.0;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.785398;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * texel * width;
          float dn = depthAt(uv);
          if (idAt(uv) != ic) {
            if (dn > dc * 0.995) edge += 1.0;
          } else {
            if ((dn - dc) / dc > 0.12) edge += 1.0;
            if (dot(n0, texture2D(tNormal, uv).xyz * 2.0 - 1.0) < 0.69) edge += 1.0;
          }
        }
        gl_FragColor = vec4(lineColor, clamp(edge * 0.5, 0.0, 1.0));
      }`,
  });
  const edgeScene = new THREE.Scene();
  edgeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), edgeMaterial));
  const flatCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // drawn last, depth-tested against the room but outside the line pass (a character card standing in the room)
  const overlay = new THREE.Scene();

  // Blender's sensor is 36 mm wide and fitted to the wider side of the frame
  function applyLens() {
    const half = Math.atan(18 / lens), aspect = viewW / viewH;
    camera.aspect = aspect;
    camera.fov = THREE.MathUtils.radToDeg(2 * (aspect >= 1 ? Math.atan(Math.tan(half) / aspect) : half));
    camera.updateProjectionMatrix();
  }
  function resize(w, h) {
    viewW = w; viewH = h;
    renderer.setSize(w, h, false);
    const pw = Math.round(w * renderer.getPixelRatio()), ph = Math.round(h * renderer.getPixelRatio());
    normalTarget.setSize(pw, ph);
    idTarget.setSize(pw, ph);
    edgeMaterial.uniforms.texel.value.set(1 / pw, 1 / ph);
    edgeMaterial.uniforms.width.value = Math.max(1, 1.9 * ph / 900);   // Freestyle 1.85-2.25 px at 1600x900
    applyLens();
  }

  function render() {
    for (const [pass, target] of [['normal', normalTarget], ['id', idTarget]]) {
      meshes.forEach(o => { o.material = passes[pass][o.userData.lines]; });
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0); renderer.clear();
      renderer.render(scene, camera);
    }
    meshes.forEach(o => { o.material = roomMaterial; });
    renderer.setRenderTarget(null);
    renderer.setClearColor(SKY[lighting] ?? SKY.day, 1); renderer.clear();
    renderer.render(scene, camera);
    renderer.render(edgeScene, flatCamera);
    renderer.render(overlay, camera);
  }

  // Compile every shader and send the atlases and meshes to the GPU now, while the page is still loading. Left to the
  // first frame, this froze the start of the opening for about 0.3 s (and the first night frame for 0.2 s).
  // Call after resize() and after making the cards, so their shaders and the line targets are ready too.
  async function prepare() {
    Object.values(atlases).forEach(t => renderer.initTexture(t));
    const jobs = [];
    for (const [pass, target] of [['normal', normalTarget], ['id', idTarget]]) {
      meshes.forEach(o => { o.material = passes[pass][o.userData.lines]; });
      renderer.setRenderTarget(target);   // a shader drawn into a target differs from one drawn on the page
      jobs.push(renderer.compileAsync(scene, camera));
    }
    meshes.forEach(o => { o.material = roomMaterial; });
    renderer.setRenderTarget(null);
    jobs.push(renderer.compileAsync(scene, camera), renderer.compileAsync(edgeScene, flatCamera),
      renderer.compileAsync(overlay, camera));
    await Promise.all(jobs);   // the GPU driver compiles in the background where it can
    render();
  }

  // A character card as a picture standing in the room, turned to the camera about its vertical axis. Drawn like the
  // browser draws a 2D <img> (stored sRGB values, no colour conversion), read 0.75 of a mip level sharper so its thin
  // lines keep the 2D card's weight when shrunk.
  function makeCard(height, aspect) {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { map: { value: null }, dim: { value: 1 }, saturate: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D map; uniform float dim; uniform float saturate; varying vec2 vUv;
        void main() {
          vec4 c = texture2D(map, vUv, -0.75);
          if (c.a < 0.04) discard;
          float l = dot(c.rgb, vec3(0.213, 0.715, 0.072));
          gl_FragColor = vec4(mix(vec3(l), c.rgb, saturate) * dim, c.a);
        }`,
    });
    material.visible = false;   // until its first picture is ready (an empty texture draws as a black board)
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height).translate(0, height / 2, 0), material);
    mesh.visible = false;
    overlay.add(mesh);
    let wanted = '';
    // src -> texture on the GPU (an <img> laid out on the page reports its on-screen size, not the picture's, so each
    // card is loaded again as its own picture)
    const loaded = new Map();
    function load(src) {
      const job = loadPicture(src, true).then(t => {
        t.colorSpace = THREE.NoColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        renderer.initTexture(t);
        return t;
      });
      job.catch(e => { loaded.delete(src); console.warn('[3D] card picture failed:', src, e); });
      return job;
    }
    return {
      mesh,
      // show the picture at this address on the card (the novel passes its currently shown card); the previous
      // picture stays until the new one is decoded and on the GPU
      setImage(src) {
        if (!src || src === wanted) return;
        wanted = src;
        if (!loaded.has(src)) loaded.set(src, load(src));
        loaded.get(src).then(t => {
          if (wanted !== src) return;
          material.uniforms.map.value = t;
          material.visible = true;
        }, () => {});
      },
      setTone(dim, sat) { material.uniforms.dim.value = dim; material.uniforms.saturate.value = sat; },
      place(position) {
        mesh.position.copy(position);
        mesh.rotation.y = Math.atan2(camera.position.x - position.x, camera.position.z - position.z);
      },
    };
  }

  // Blender coordinates (x, y, z up) -> three.js
  const b2t = ([x, y, z = 0]) => new THREE.Vector3(x, z, -y);

  return {
    THREE, renderer, camera, scene, shots, door, b2t, render, resize, makeCard, prepare,
    get viewW() { return viewW; }, get viewH() { return viewH; },
    setLens(mm) { lens = mm; applyLens(); },
    // a lighting not loaded up front is fetched now; the room keeps the current one until it is ready
    setLighting(l) {
      if (atlases[l]) { lighting = l; roomMaterial.uniforms.map.value = atlases[l]; return; }
      if (!SKY[l] || pending[l]) return;
      pending[l] = loadAtlas(l).then(t => {
        atlases[l] = t;
        renderer.initTexture(t);
        lighting = l; roomMaterial.uniforms.map.value = t;
      }, e => { delete pending[l]; console.warn('[3D] lighting failed:', l, e); });
    },
    get lighting() { return lighting; },
    setDoor(radians) { if (door) door.rotation.y = radians; },
    look(eye, target) { camera.position.copy(eye); camera.lookAt(target); },
    // screen position (CSS px from the top-left of the canvas) of a point in the room
    toScreen(v) {
      const p = v.clone().project(camera);
      return { x: (p.x + 1) / 2 * viewW, y: (1 - p.y) / 2 * viewH, behind: p.z > 1 };
    },
  };
}
