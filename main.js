import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CITIES } from './cities.js';

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
const earthDayMap = loader.load('https://unpkg.com/three-globe@2.35.0/example/img/earth-blue-marble.jpg');
const earthBumpMap = loader.load('https://unpkg.com/three-globe@2.35.0/example/img/earth-topology.png');
const earthSpecMap = loader.load('https://unpkg.com/three-globe@2.35.0/example/img/earth-water.png');

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(1, 96, 96),
  new THREE.MeshPhongMaterial({
    map: earthDayMap, bumpMap: earthBumpMap, bumpScale: 0.03,
    specularMap: earthSpecMap, specular: 0x333333, shininess: 25,
  })
);
scene.add(earth);

const cloudMap = loader.load('https://unpkg.com/three-globe@2.35.0/example/img/earth-clouds.png');
const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(1.01, 64, 64),
  new THREE.MeshPhongMaterial({ map: cloudMap, transparent: true, opacity: 0.25, depthWrite: false })
);
scene.add(clouds);

// Atmosphere
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(1.02, 64, 64),
  new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 vN; void main(){float i=pow(0.65-dot(vN,vec3(0,0,1)),2.5);gl_FragColor=vec4(0.3,0.6,1.0,i*0.6);}`,
    blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true,
  })
));

// Stars
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

// Glow sprite texture
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

// ── Single idea: Heatwave from LA ────────────────────────────────────
const IDEA = { text: 'Heatwave', color: '#c4723a', lat: 34.05, lon: -118.25 };
const ideaPos = latLonToVec3(IDEA.lat, IDEA.lon, 1.008);
const ideaColor = new THREE.Color(IDEA.color);

// Glowing origin node
const ideaCore = new THREE.Mesh(
  new THREE.SphereGeometry(0.018, 12, 12),
  new THREE.MeshBasicMaterial({ color: ideaColor, transparent: true, opacity: 1 })
);
ideaCore.position.copy(ideaPos);
earth.add(ideaCore);

const ideaSpriteMat = new THREE.SpriteMaterial({
  map: glowTex, color: ideaColor, transparent: true, opacity: 0.7,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const ideaSprite = new THREE.Sprite(ideaSpriteMat);
ideaSprite.position.copy(ideaPos);
ideaSprite.scale.setScalar(0.14);
earth.add(ideaSprite);

const ideaLight = new THREE.PointLight(IDEA.color, 0.6, 0.5);
ideaLight.position.copy(ideaPos);
earth.add(ideaLight);

// Origin label
const ideaLabel = document.createElement('div');
ideaLabel.className = 'wave-label';
ideaLabel.textContent = IDEA.text;
ideaLabel.style.color = IDEA.color;
ideaLabel.style.opacity = '0';
ideaLabel.style.fontSize = '14px';
ideaLabel.style.fontWeight = '700';
labelsContainer.appendChild(ideaLabel);

// ── City nodes ───────────────────────────────────────────────────────
const cityGeo = new THREE.SphereGeometry(0.006, 8, 8);

const cityNodes = CITIES.map(city => {
  const pos = latLonToVec3(city.lat, city.lon, 1.007);
  const mat = new THREE.MeshBasicMaterial({ color: 0x556677, transparent: true, opacity: 0.5 });
  const mesh = new THREE.Mesh(cityGeo, mat);
  mesh.position.copy(pos);
  earth.add(mesh);

  const label = document.createElement('div');
  label.className = 'wave-label';
  label.textContent = city.name;
  label.style.opacity = '0';
  labelsContainer.appendChild(label);

  return {
    name: city.name, pos, mesh, mat, label,
    baseColor: new THREE.Color(0x556677),
    infected: false,
    infectTime: -1,
    glowIntensity: 0,
  };
});

// ── Wave band mesh ───────────────────────────────────────────────────
const RING_PTS = 96;
const BAND_ROWS = 8;

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
    float a = vAlpha * uOpacity;
    gl_FragColor = vec4(uColor, a);
  }
`;

const waveGeo = new THREE.BufferGeometry();
const vertCount = RING_PTS * BAND_ROWS;
waveGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertCount * 3), 3));
waveGeo.setAttribute('rowAlpha', new THREE.BufferAttribute(new Float32Array(vertCount), 1));

const indices = [];
for (let row = 0; row < BAND_ROWS - 1; row++) {
  for (let i = 0; i < RING_PTS; i++) {
    const cur = row * RING_PTS + i;
    const next = row * RING_PTS + (i + 1) % RING_PTS;
    const curUp = (row + 1) * RING_PTS + i;
    const nextUp = (row + 1) * RING_PTS + (i + 1) % RING_PTS;
    indices.push(cur, next, curUp, next, nextUp, curUp);
  }
}
waveGeo.setIndex(indices);

const waveMat = new THREE.ShaderMaterial({
  vertexShader: waveBandVert,
  fragmentShader: waveBandFrag,
  uniforms: { uColor: { value: ideaColor.clone() }, uOpacity: { value: 0.55 } },
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
});

const waveMesh = new THREE.Mesh(waveGeo, waveMat);
scene.add(waveMesh);

function updateWaveGeo(radius) {
  const positions = waveGeo.attributes.position;
  const alphas = waveGeo.attributes.rowAlpha;
  const { o, t1, t2 } = tangentBasis(ideaPos);

  const bandWidth = 0.02 + (radius / Math.PI) * 0.10;

  for (let row = 0; row < BAND_ROWS; row++) {
    const rowT = row / (BAND_ROWS - 1);
    const rowOffset = (rowT - 0.5) * bandWidth;
    const rowR = Math.max(0.001, radius + rowOffset);
    const distFromCenter = Math.abs(rowT - 0.5) * 2;
    const rowAlpha = Math.exp(-distFromCenter * distFromCenter * 3);

    for (let i = 0; i < RING_PTS; i++) {
      const p = pointOnSphere(o, t1, t2, (i / RING_PTS) * Math.PI * 2, rowR);
      const idx = row * RING_PTS + i;
      positions.setXYZ(idx, p.x, p.y, p.z);
      alphas.setX(idx, rowAlpha);
    }
  }
  positions.needsUpdate = true;
  alphas.needsUpdate = true;
}

// Floating label that rides the wave front
const floatingLabel = document.createElement('div');
floatingLabel.className = 'wave-label';
floatingLabel.textContent = IDEA.text;
floatingLabel.style.color = IDEA.color;
floatingLabel.style.opacity = '0';
floatingLabel.style.fontSize = '12px';
floatingLabel.style.fontWeight = '600';
labelsContainer.appendChild(floatingLabel);

// ── Wave state ───────────────────────────────────────────────────────
const WAVE_SPEED = 0.04;
const GLOW_DURATION = 8;
let waveRadius = 0;
let totalTime = 0;
const WAVE_START = 2; // start after 2s

// ── Animate ──────────────────────────────────────────────────────────
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

  // ── Idea origin node pulse ──
  const pulse = 0.7 + 0.3 * Math.sin(totalTime * 3);
  ideaSpriteMat.opacity = 0.5 * pulse;
  ideaSprite.scale.setScalar(0.12 + 0.04 * pulse);
  ideaLight.intensity = 0.4 + 0.3 * pulse;
  ideaCore.scale.setScalar(0.8 + 0.4 * pulse);

  // Origin label
  const ideaDot = ideaPos.clone().normalize().dot(camLocal);
  if (ideaDot > 0.1) {
    tmpVec.copy(ideaPos).applyMatrix4(earth.matrixWorld).project(camera);
    ideaLabel.style.left = (tmpVec.x * 0.5 + 0.5) * innerWidth + 'px';
    ideaLabel.style.top = (-tmpVec.y * 0.5 + 0.5) * innerHeight - 22 + 'px';
    ideaLabel.style.opacity = String(Math.min(0.95, ideaDot * 1.5));
  } else {
    ideaLabel.style.opacity = '0';
  }

  // ── Wave expansion (no fade — stays visible) ──
  if (totalTime >= WAVE_START && waveRadius < Math.PI) {
    waveRadius += WAVE_SPEED * dt;
    waveMesh.visible = true;
    waveMat.uniforms.uOpacity.value = 0.55;
    updateWaveGeo(waveRadius);

    // Floating label at wave front (camera-facing point)
    const { o, t1, t2 } = tangentBasis(ideaPos);
    let bestDot = -Infinity, bestPt = null;
    for (let i = 0; i < 32; i++) {
      const pt = pointOnSphere(o, t1, t2, (i / 32) * Math.PI * 2, waveRadius);
      const d = pt.clone().normalize().dot(camLocal);
      if (d > bestDot) { bestDot = d; bestPt = pt; }
    }
    if (bestPt && bestDot > 0.05) {
      tmpVec.copy(bestPt).applyMatrix4(earth.matrixWorld).project(camera);
      floatingLabel.style.left = (tmpVec.x * 0.5 + 0.5) * innerWidth + 'px';
      floatingLabel.style.top = (-tmpVec.y * 0.5 + 0.5) * innerHeight - 10 + 'px';
      floatingLabel.style.opacity = String(Math.min(0.85, bestDot * 1.5));
    } else {
      floatingLabel.style.opacity = '0';
    }

    // ── Infect cities the wave passes through ──
    for (const city of cityNodes) {
      if (city.infected) continue;
      const dist = angularDist(ideaPos, city.pos);
      if (Math.abs(dist - waveRadius) < 0.03) {
        city.infected = true;
        city.infectTime = totalTime;
        city.glowIntensity = 1;
      }
    }
  }

  // ── Update city visuals ──
  for (const city of cityNodes) {
    if (city.infected) {
      const t = totalTime - city.infectTime;
      if (t < GLOW_DURATION) {
        const p = 0.5 + 0.5 * Math.sin(totalTime * 5);
        city.glowIntensity = (1 - t / GLOW_DURATION) * (0.6 + 0.4 * p);
      } else {
        city.glowIntensity = 0;
      }

      // Lerp from base color to idea color based on glow
      const glow = city.glowIntensity;
      city.mat.color.copy(city.baseColor.clone().lerp(ideaColor, Math.max(glow, 0.3)));
      city.mat.opacity = 0.5 + glow * 0.5;
      city.mesh.scale.setScalar(1 + glow * 4);
    }

    // City label (show when infected + front-facing)
    const dot = city.pos.clone().normalize().dot(camLocal);
    if (dot > 0.15 && city.infected && city.glowIntensity > 0.15) {
      tmpVec.copy(city.pos).applyMatrix4(earth.matrixWorld).project(camera);
      city.label.style.left = (tmpVec.x * 0.5 + 0.5) * innerWidth + 'px';
      city.label.style.top = (-tmpVec.y * 0.5 + 0.5) * innerHeight - 12 + 'px';
      city.label.style.opacity = String(Math.min(0.9, dot * city.glowIntensity * 2));
      city.label.style.color = IDEA.color;
      city.label.textContent = `${city.name} — ${IDEA.text}`;
      city.label.style.fontSize = '10px';
      city.label.style.fontWeight = '400';
    } else {
      city.label.style.opacity = '0';
    }
  }

  renderer.render(scene, camera);
}

animate();
