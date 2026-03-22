import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── 10 major city nodes ──────────────────────────────────────────────
const NODES = [
  { name: 'Los Angeles', lat: 34.05, lon: -118.25 },
  { name: 'New York', lat: 40.7, lon: -74.0 },
  { name: 'London', lat: 51.5, lon: -0.1 },
  { name: 'Paris', lat: 48.9, lon: 2.3 },
  { name: 'Tokyo', lat: 35.7, lon: 139.7 },
  { name: 'Dubai', lat: 25.2, lon: 55.3 },
  { name: 'São Paulo', lat: -23.6, lon: -46.6 },
  { name: 'Sydney', lat: -33.9, lon: 151.2 },
  { name: 'Lagos', lat: 6.5, lon: 3.4 },
  { name: 'Mumbai', lat: 19.1, lon: 72.9 },
];

const IDEA = { text: 'Heatwave', color: '#c4723a' };

// ── Scene setup ──────────────────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1.8;
controls.maxDistance = 6;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;
controls.enablePan = false;

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Lighting ─────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x334466, 1.5));
const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(5, 3, 5);
scene.add(sunLight);

// ── Earth ────────────────────────────────────────────────────────────
const loader = new THREE.TextureLoader();
const earth = new THREE.Mesh(
  new THREE.SphereGeometry(1, 96, 96),
  new THREE.MeshPhongMaterial({
    map: loader.load('https://unpkg.com/three-globe@2.35.0/example/img/earth-blue-marble.jpg'),
    bumpMap: loader.load('https://unpkg.com/three-globe@2.35.0/example/img/earth-topology.png'),
    bumpScale: 0.03,
    specularMap: loader.load('https://unpkg.com/three-globe@2.35.0/example/img/earth-water.png'),
    specular: 0x333333, shininess: 25,
  })
);
scene.add(earth);

const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(1.01, 64, 64),
  new THREE.MeshPhongMaterial({
    map: loader.load('https://unpkg.com/three-globe@2.35.0/example/img/earth-clouds.png'),
    transparent: true, opacity: 0.25, depthWrite: false,
  })
);
scene.add(clouds);

scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(1.02, 64, 64),
  new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 vN; void main(){float i=pow(0.65-dot(vN,vec3(0,0,1)),2.5);gl_FragColor=vec4(0.3,0.6,1.0,i*0.6);}`,
    blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true,
  })
));

const starGeo = new THREE.BufferGeometry();
const sv = new Float32Array(3000 * 3);
for (let i = 0; i < sv.length; i++) sv[i] = (Math.random() - 0.5) * 100;
starGeo.setAttribute('position', new THREE.BufferAttribute(sv, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08 })));

// ── Helpers ──────────────────────────────────────────────────────────
function latLonToVec3(lat, lon, r = 1.005) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function angularDist(a, b) {
  return Math.acos(Math.min(1, Math.max(-1, a.clone().normalize().dot(b.clone().normalize()))));
}

function tangentBasis(origin) {
  const o = origin.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(o.dot(up)) > 0.99) up.set(1, 0, 0);
  const t1 = new THREE.Vector3().crossVectors(o, up).normalize();
  const t2 = new THREE.Vector3().crossVectors(o, t1).normalize();
  return { o, t1, t2 };
}

function pointOnSphere(o, t1, t2, angle, dist) {
  const dir = new THREE.Vector3().addScaledVector(t1, Math.cos(angle)).addScaledVector(t2, Math.sin(angle));
  return o.clone().multiplyScalar(Math.cos(dist)).addScaledVector(dir, Math.sin(dist)).normalize().multiplyScalar(1.008);
}

function makeGlowTex() {
  const s = 128, cv = document.createElement('canvas');
  cv.width = s; cv.height = s;
  const cx = cv.getContext('2d');
  const g = cx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(0.15,'rgba(255,255,255,0.8)');
  g.addColorStop(0.4,'rgba(255,255,255,0.3)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  cx.fillStyle = g; cx.fillRect(0,0,s,s);
  return new THREE.CanvasTexture(cv);
}
const glowTex = makeGlowTex();
const labelsContainer = document.getElementById('labels');
const ideaColor = new THREE.Color(IDEA.color);
const dimColor = new THREE.Color(0x556677);

// ── Create the 10 city nodes (always visible, with glow + labels) ────
const originPos = latLonToVec3(NODES[0].lat, NODES[0].lon, 1.008);

const cityNodes = NODES.map((city, i) => {
  const pos = latLonToVec3(city.lat, city.lon, 1.008);
  const isOrigin = i === 0;

  // Core sphere
  const coreMat = new THREE.MeshBasicMaterial({
    color: isOrigin ? ideaColor : dimColor,
    transparent: true, opacity: isOrigin ? 1 : 0.6,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 12), coreMat);
  core.position.copy(pos);
  earth.add(core);

  // Glow sprite
  const spriteMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: isOrigin ? ideaColor : dimColor,
    transparent: true,
    opacity: isOrigin ? 0.7 : 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.copy(pos);
  sprite.scale.setScalar(isOrigin ? 0.14 : 0.08);
  earth.add(sprite);

  // Point light
  const light = new THREE.PointLight(
    isOrigin ? IDEA.color : 0x556677,
    isOrigin ? 0.6 : 0.1,
    isOrigin ? 0.5 : 0.2
  );
  light.position.copy(pos);
  earth.add(light);

  // Label
  const label = document.createElement('div');
  label.className = 'wave-label';
  label.textContent = city.name;
  label.style.color = isOrigin ? IDEA.color : '#8899aa';
  label.style.opacity = '0';
  label.style.fontSize = isOrigin ? '14px' : '11px';
  label.style.fontWeight = isOrigin ? '700' : '500';
  labelsContainer.appendChild(label);

  return {
    name: city.name, pos, core, coreMat, sprite, spriteMat, light, label,
    isOrigin,
    distFromOrigin: angularDist(originPos, pos),
    infectTime: isOrigin ? 0 : -1,
    glow: isOrigin ? 1 : 0,
  };
});

// ── Wave band mesh ───────────────────────────────────────────────────
const RING_PTS = 96, BAND_ROWS = 8;

const waveBandVert = `
  attribute float rowAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = rowAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const waveBandFrag = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uOpacity);
  }
`;

const waveGeo = new THREE.BufferGeometry();
const vc = RING_PTS * BAND_ROWS;
waveGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vc * 3), 3));
waveGeo.setAttribute('rowAlpha', new THREE.BufferAttribute(new Float32Array(vc), 1));
const idx = [];
for (let row = 0; row < BAND_ROWS - 1; row++) {
  for (let i = 0; i < RING_PTS; i++) {
    const c = row * RING_PTS + i, n = row * RING_PTS + (i+1)%RING_PTS;
    const cu = (row+1)*RING_PTS + i, nu = (row+1)*RING_PTS + (i+1)%RING_PTS;
    idx.push(c,n,cu, n,nu,cu);
  }
}
waveGeo.setIndex(idx);

const waveMat = new THREE.ShaderMaterial({
  vertexShader: waveBandVert, fragmentShader: waveBandFrag,
  uniforms: { uColor: { value: ideaColor.clone() }, uOpacity: { value: 0.5 } },
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
});
const waveMesh = new THREE.Mesh(waveGeo, waveMat);
scene.add(waveMesh);

function updateWaveGeo(radius) {
  const positions = waveGeo.attributes.position;
  const alphas = waveGeo.attributes.rowAlpha;
  const { o, t1, t2 } = tangentBasis(originPos);
  const bandWidth = 0.02 + (radius / Math.PI) * 0.10;

  for (let row = 0; row < BAND_ROWS; row++) {
    const rowT = row / (BAND_ROWS - 1);
    const rowR = Math.max(0.001, radius + (rowT - 0.5) * bandWidth);
    const d = Math.abs(rowT - 0.5) * 2;
    const rowAlpha = Math.exp(-d * d * 3);
    for (let i = 0; i < RING_PTS; i++) {
      const p = pointOnSphere(o, t1, t2, (i/RING_PTS)*Math.PI*2, rowR);
      const ix = row * RING_PTS + i;
      positions.setXYZ(ix, p.x, p.y, p.z);
      alphas.setX(ix, rowAlpha);
    }
  }
  positions.needsUpdate = true;
  alphas.needsUpdate = true;
}

// Floating wave label
const floatingLabel = document.createElement('div');
floatingLabel.className = 'wave-label';
floatingLabel.textContent = IDEA.text;
floatingLabel.style.color = IDEA.color;
floatingLabel.style.opacity = '0';
floatingLabel.style.fontSize = '12px';
floatingLabel.style.fontWeight = '600';
labelsContainer.appendChild(floatingLabel);

// ── Animate ──────────────────────────────────────────────────────────
const WAVE_SPEED = 0.04;
const GLOW_FADE = 3; // seconds for a city glow to fade after wave passes
let waveRadius = 0;
let totalTime = 0;
const WAVE_START = 2;
const clock = new THREE.Clock();
const tmpVec = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  totalTime += dt;

  controls.update();
  earth.rotation.y += 0.0005;
  clouds.rotation.y += 0.0007;

  const earthInv = earth.matrixWorld.clone().invert();
  const camLocal = camera.position.clone().applyMatrix4(earthInv).normalize();

  // ── Wave expansion ──
  if (totalTime >= WAVE_START && waveRadius < Math.PI) {
    waveRadius += WAVE_SPEED * dt;
    waveMesh.visible = true;
    updateWaveGeo(waveRadius);

    // Floating label at wave front
    const { o, t1, t2 } = tangentBasis(originPos);
    let bestDot = -Infinity, bestPt = null;
    for (let i = 0; i < 32; i++) {
      const pt = pointOnSphere(o, t1, t2, (i/32)*Math.PI*2, waveRadius);
      const d = pt.clone().normalize().dot(camLocal);
      if (d > bestDot) { bestDot = d; bestPt = pt; }
    }
    if (bestPt && bestDot > 0.05) {
      tmpVec.copy(bestPt).applyMatrix4(earth.matrixWorld).project(camera);
      floatingLabel.style.left = (tmpVec.x*0.5+0.5)*innerWidth + 'px';
      floatingLabel.style.top = (-tmpVec.y*0.5+0.5)*innerHeight - 10 + 'px';
      floatingLabel.style.opacity = String(Math.min(0.85, bestDot * 1.5));
    } else {
      floatingLabel.style.opacity = '0';
    }
  }

  // ── Update each city node ──
  for (const city of cityNodes) {
    const dot = city.pos.clone().normalize().dot(camLocal);

    // Check if wave has reached this city
    if (!city.isOrigin && city.infectTime < 0 && waveRadius >= city.distFromOrigin) {
      city.infectTime = totalTime;
    }

    // Compute glow intensity
    if (city.isOrigin) {
      // Origin always glows with pulse
      city.glow = 0.7 + 0.3 * Math.sin(totalTime * 3);
    } else if (city.infectTime > 0) {
      const timeSince = totalTime - city.infectTime;
      if (timeSince < GLOW_FADE) {
        const p = 0.5 + 0.5 * Math.sin(totalTime * 6);
        city.glow = (1 - timeSince / GLOW_FADE) * (0.6 + 0.4 * p);
      } else {
        city.glow = 0;
      }
    }

    const g = city.glow;

    // Core sphere — fixed size, only color changes
    city.coreMat.color.copy(dimColor.clone().lerp(ideaColor, city.isOrigin ? 1 : g));
    city.coreMat.opacity = 0.6 + g * 0.4;

    // Glow sprite — pulse the glow aura only
    city.spriteMat.color.copy(dimColor.clone().lerp(ideaColor, city.isOrigin ? 1 : Math.max(g, 0.05)));
    city.spriteMat.opacity = city.isOrigin ? 0.5 + g * 0.3 : g * 0.7;
    city.sprite.scale.setScalar(city.isOrigin ? 0.12 + g * 0.04 : 0.08 + g * 0.08);

    // Point light
    city.light.color.copy(g > 0.1 ? ideaColor : dimColor);
    city.light.intensity = city.isOrigin ? 0.4 + g * 0.3 : g * 0.5;

    // Label
    if (dot > 0.1 && (city.isOrigin || g > 0.1)) {
      tmpVec.copy(city.pos).applyMatrix4(earth.matrixWorld).project(camera);
      city.label.style.left = (tmpVec.x*0.5+0.5)*innerWidth + 'px';
      city.label.style.top = (-tmpVec.y*0.5+0.5)*innerHeight - 18 + 'px';
      city.label.style.opacity = String(Math.min(0.95, dot * (city.isOrigin ? 1.5 : g * 2)));
      city.label.style.color = g > 0.1 || city.isOrigin ? IDEA.color : '#8899aa';
    } else {
      city.label.style.opacity = '0';
    }
  }

  renderer.render(scene, camera);
}

animate();
