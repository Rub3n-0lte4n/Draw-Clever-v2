/**
 * Draw Clever v2 — 3D depth-displacement hero  (Midnight Couture)
 *
 * A single textured plane in Three.js, displaced per-fragment by a depth map.
 * The pointer vector drives a UV offset scaled by depth, so foreground pixels
 * swim more than background pixels — true motion parallax, not a CSS fake.
 * On touch devices an autonomous drift keeps the image alive.
 *
 * Active hero pair (white = near camera, black = far):
 *   image:  ./Renders/Casa Marbella/04-scaled.jpg
 *   depth:  ./Renders/depth_map_output.png
 *
 * To swap heroes, change HERO_IMG / HERO_DEPTH. New depth maps can be made at
 * https://huggingface.co/spaces/depth-anything/Depth-Anything-V2 (white=close).
 *
 * Graceful degradation:
 *   - No WebGL            → the CSS .hero-bg photo + grade stays visible.
 *   - WebGL, no depth map → uniform pointer-driven pan (cinematic glide, no
 *                           tearing). Never a "melting building" artifact.
 */
import * as THREE from 'three';

const HERO_IMG   = './Renders/Casa Marbella/04-scaled.jpg';
const HERO_DEPTH = './Renders/depth_map_output.png';

function init() {
  const container = document.getElementById('hero-canvas');
  if (!container) return;

  // Respect users who asked for less motion: keep the still CSS hero.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, powerPreference: 'high-performance',
    });
  } catch (e) {
    console.warn('[DrawClever] WebGL unavailable — CSS hero stays visible.', e);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  container.classList.add('is-live'); // lets CSS fade the canvas in over the photo

  const loader = new THREE.TextureLoader();
  loader.crossOrigin = 'anonymous';
  const imageRes = new THREE.Vector2(1920, 1080);

  const baseTex = loader.load(
    HERO_IMG,
    (t) => { t.colorSpace = THREE.SRGBColorSpace; if (t.image) imageRes.set(t.image.width, t.image.height); },
    undefined,
    (err) => console.error('[DrawClever] hero texture failed:', err)
  );
  baseTex.minFilter = THREE.LinearFilter;
  baseTex.magFilter = THREE.LinearFilter;

  // Placeholder depth — vertical gradient (top dark = far, bottom bright = near).
  const placeholder = (() => {
    const c = document.createElement('canvas'); c.width = 2; c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#000'); grad.addColorStop(1, '#fff');
    g.fillStyle = grad; g.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
  })();

  const uniforms = {
    uBase:       { value: baseTex },
    uDepth:      { value: placeholder },
    uHasDepth:   { value: 0.0 },
    uMouse:      { value: new THREE.Vector2(0, 0) },
    uTime:       { value: 0 },
    uIntro:      { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uImageRes:   { value: imageRes },
  };

  loader.load(
    HERO_DEPTH,
    (t) => {
      t.colorSpace = THREE.NoColorSpace;
      t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
      uniforms.uDepth.value = t;
      uniforms.uHasDepth.value = 1.0;
      console.info('[DrawClever] depth map loaded → full parallax active');
    },
    undefined,
    () => console.info(`[DrawClever] no depth map at "${HERO_DEPTH}" → procedural pan`)
  );

  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;
    uniform sampler2D uBase;
    uniform sampler2D uDepth;
    uniform float     uHasDepth;
    uniform vec2      uMouse;
    uniform float     uTime;
    uniform float     uIntro;
    uniform vec2      uResolution;
    uniform vec2      uImageRes;
    varying vec2 vUv;

    vec2 coverUV(vec2 uv) {
      float screenAR = uResolution.x / uResolution.y;
      float imageAR  = uImageRes.x  / uImageRes.y;
      vec2 r = uv;
      if (screenAR > imageAR) { float s = imageAR / screenAR; r.y = uv.y * s + (1.0 - s) * 0.5; }
      else                    { float s = screenAR / imageAR; r.x = uv.x * s + (1.0 - s) * 0.5; }
      return r;
    }
    float rand(vec2 st){ return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 baseUV = coverUV(vUv);

      // Slow intro dolly during the first ~1.4s — 6% zoom-out settling to 1.0
      float introZoom = 1.0 - (1.0 - uIntro) * 0.06;
      baseUV = (baseUV - 0.5) * introZoom + 0.5;

      // Depth-driven parallax when we have a map; uniform pan otherwise.
      vec2 shift;
      if (uHasDepth > 0.5) {
        float depth = texture2D(uDepth, baseUV).r;
        shift = -uMouse * 0.075 * uIntro * depth;
      } else {
        shift = -uMouse * 0.018 * uIntro;
      }
      vec4 colour = texture2D(uBase, baseUV + shift);

      // ── Midnight Couture grade ───────────────────────────────────────
      // Deeper cinematic vignette + warm champagne/bronze tint in shadows.
      float v = 1.0 - smoothstep(0.32, 1.08, distance(vUv, vec2(0.5)));
      colour.rgb *= mix(0.50, 1.0, v);
      colour.rgb *= vec3(1.05, 1.0, 0.90);           // warm the whole frame
      float lum = dot(colour.rgb, vec3(0.299, 0.587, 0.114));
      colour.rgb = mix(colour.rgb, colour.rgb * vec3(1.10, 0.97, 0.78), (1.0 - lum) * 0.35);
      colour.rgb = (colour.rgb - 0.5) * 1.06 + 0.5;  // gentle contrast

      // Fine film grain
      float g = rand(vUv * (uTime + 1.0));
      colour.rgb += (g - 0.5) * 0.020;

      gl_FragColor = vec4(colour.rgb, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  const target = { x: 0, y: 0 };
  const heroEl = document.getElementById('hero');
  window.addEventListener('pointermove', (e) => {
    const r = heroEl.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top)  / r.height;
    if (y < 0 || y > 1) return;
    target.x = (x * 2 - 1);
    target.y = -(y * 2 - 1);
  }, { passive: true });

  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  const start = performance.now();
  let raf;
  const tick = () => {
    const t = (performance.now() - start) / 1000;
    uniforms.uTime.value = t;
    uniforms.uIntro.value = Math.min(1, 1 - Math.pow(1 - Math.min(t / 1.4, 1), 3));

    if (isCoarse) {                 // autonomous drift on touch
      target.x = Math.sin(t * 0.32) * 0.55;
      target.y = Math.cos(t * 0.26) * 0.38;
    }
    const m = uniforms.uMouse.value;
    m.x += (target.x - m.x) * 0.06;
    m.y += (target.y - m.y) * 0.06;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  tick();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(tick);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
