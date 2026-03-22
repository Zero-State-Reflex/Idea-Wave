import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CITIES, TOPICS } from './cities.js';

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

// ── Earth textures (NASA Blue Marble) ────────────────────────────────
const loader = new THREE.TextureLoader();
const earthDayMap = loader.load('https://unpkg.com/three-globe@2.35.0/example/img/earth-blue-marble.jpg');
const earthBumpMap = loader.load('https://unpkg.com/three-globe@2.35.0/example/img/earth-topology.png');
const earthSpecMap = loader.load('https://unpkg.com/three-globe@2.35.0/example/img/earth-water.png');

const earthGeo = new THREE.SphereGeometry(1, 96, 96);
const earthMat = new THREE.MeshPhongMaterial({
  map: earthDayMap, bumpMap: earthBumpMap, bumpScale: 0.03,
  specularMap: earthSpecMap, specular: 0x333333, shininess: 25,
});
const earth = new THREE.Mesh(earthGeo, earthMat);
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

// Point on sphere at angular distance `dist` from `origin` in direction `dir`
function pointOnSphere(origin, t1, t2, angle, dist) {
  const dir = new THREE.Vector3().addScaledVector(t1, Math.cos(angle)).addScaledVector(t2, Math.sin(angle));
  return origin.clone().multiplyScalar(Math.cos(dist)).addScaledVector(dir, Math.sin(dist)).normalize().multiplyScalar(1.008);
}

// Build tangent basis for a point on unit sphere
function tangentBasis(origin) {
  const o = origin.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(o.dot(up)) > 0.99) up.set(1, 0, 0);
  const t1 = new THREE.Vector3().crossVectors(o, up).normalize();
  const t2 = new THREE.Vector3().crossVectors(o, t1).normalize();
  return { o, t1, t2 };
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

// ── Idea topic nodes (permanent glowing markers) ─────────────────────
const ideaNodes = TOPICS.map(topic => {
  const pos = latLonToVec3(topic.lat, topic.lon, 1.008);
  const color = new THREE.Color(topic.color);

  // Core dot
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 12, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
  );
  core.position.copy(pos);
  earth.add(core);

  // Glow sprite
  const spriteMat = new THREE.SpriteMaterial({
    map: glowTex, color, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.copy(pos);
  sprite.scale.setScalar(0.12);
  earth.add(sprite);

  // Point light
  const light = new THREE.PointLight(topic.color, 0.5, 0.4);
  light.position.copy(pos);
  earth.add(light);

  // Static label at the node
  const label = document.createElement('div');
  label.className = 'wave-label';
  label.textContent = topic.text;
  label.style.color = topic.color;
  label.style.opacity = '0';
  label.style.fontSize = '13px';
  label.style.fontWeight = '700';
  labelsContainer.appendChild(label);

  return { topic, pos, color, core, spriteMat, sprite, light, label };
});

// ── City (capital) nodes ─────────────────────────────────────────────
const cityGeo = new THREE.SphereGeometry(0.005, 6, 6);

const cityNodes = CITIES.map(city => {
  const pos = latLonToVec3(city.lat, city.lon, 1.007);
  const mat = new THREE.MeshBasicMaterial({ color: 0x556677, transparent: true, opacity: 0.4 });
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
    activeColor: null, infectTime: -1, activeTopicText: null, glowIntensity: 0,
  };
});

// ── Wave band mesh (wide glowing ring with blur/fade) ────────────────
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

function createWaveMesh() {
  const vertCount = RING_PTS * BAND_ROWS;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertCount * 3), 3));
  geo.setAttribute('rowAlpha', new THREE.BufferAttribute(new Float32Array(vertCount), 1));

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
  geo.setIndex(indices);

  const mat = new THREE.ShaderMaterial({
    vertexShader: waveBandVert,
    fragmentShader: waveBandFrag,
    uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, mat, geo };
}

function updateWaveGeo(geo, origin, radius, maxRadius) {
  const positions = geo.attributes.position;
  const alphas = geo.attributes.rowAlpha;
  const { o, t1, t2 } = tangentBasis(origin);

  // Band gets wider as it expands (blur/disperse)
  const progress = radius / maxRadius;
  const bandWidth = 0.015 + progress * 0.12;

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

// ── One wave per idea node ───────────────────────────────────────────
const WAVE_SPEED = 0.04;          // very slow dispersion
const WAVE_MAX_RADIUS = 1.2;     // fades out well before covering full globe
const GLOW_DURATION = 6;
const INFECT_COOLDOWN = 20;
const cityTopicLastInfect = new Map();

let totalTime = 0;

// Each idea node owns exactly one wave
const ideaWaves = ideaNodes.map((idea, i) => {
  const waveMesh = createWaveMesh();
  waveMesh.mat.uniforms.uColor.value.copy(idea.color);

  // Floating topic name label that travels with the wave front
  const floatingLabel = document.createElement('div');
  floatingLabel.className = 'wave-label';
  floatingLabel.textContent = idea.topic.text;
  floatingLabel.style.color = idea.topic.color;
  floatingLabel.style.opacity = '0';
  floatingLabel.style.fontSize = '11px';
  floatingLabel.style.fontWeight = '600';
  labelsContainer.appendChild(floatingLabel);

  return {
    idea,
    ...waveMesh,
    floatingLabel,
    radius: 0,
    active: false,
    startTime: 3 + i * 4, // stagger: each idea fires 4s apart
    fired: false,
  };
});

function canInfect(ci, topic) {
  const key = `${ci}-${topic}`;
  const last = cityTopicLastInfect.get(key) || -Infinity;
  return totalTime - last > INFECT_COOLDOWN;
}

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

  // ── Update idea node glow + static labels ──
  for (const idea of ideaNodes) {
    const pulse = 0.7 + 0.3 * Math.sin(totalTime * 3 + idea.topic.lat);
    idea.spriteMat.opacity = 0.5 * pulse;
    idea.sprite.scale.setScalar(0.10 + 0.04 * pulse);
    idea.light.intensity = 0.3 + 0.3 * pulse;
    idea.core.scale.setScalar(0.8 + 0.4 * pulse);

    const dot = idea.pos.clone().normalize().dot(camLocal);
    if (dot > 0.1) {
      tmpVec.copy(idea.pos).applyMatrix4(earth.matrixWorld).project(camera);
      idea.label.style.left = (tmpVec.x * 0.5 + 0.5) * innerWidth + 'px';
      idea.label.style.top = (-tmpVec.y * 0.5 + 0.5) * innerHeight - 20 + 'px';
      idea.label.style.opacity = String(Math.min(0.95, dot * 1.5));
    } else {
      idea.label.style.opacity = '0';
    }
  }

  // ── Update each idea's single wave ──
  for (const wave of ideaWaves) {
    // Fire wave at scheduled time
    if (!wave.fired && totalTime >= wave.startTime) {
      wave.fired = true;
      wave.active = true;
      wave.radius = 0;
      wave.mesh.visible = true;
    }

    if (!wave.active) {
      wave.floatingLabel.style.opacity = '0';
      continue;
    }

    wave.radius += WAVE_SPEED * dt;
    const progress = wave.radius / WAVE_MAX_RADIUS;

    if (progress >= 1) {
      wave.active = false;
      wave.mesh.visible = false;
      wave.floatingLabel.style.opacity = '0';
      // Restart after a pause
      wave.startTime = totalTime + 15 + Math.random() * 10;
      wave.fired = false;
      continue;
    }

    // Opacity: fade in quickly, then steep fadeout
    const fadeIn = Math.min(1, progress * 10);
    const fadeOut = Math.pow(1 - progress, 2.5);
    wave.mat.uniforms.uOpacity.value = fadeIn * fadeOut * 0.5;

    updateWaveGeo(wave.geo, wave.idea.pos, wave.radius, WAVE_MAX_RADIUS);

    // ── Floating label rides the wave front ──
    // Position it at the leading edge, facing the camera
    const { o, t1, t2 } = tangentBasis(wave.idea.pos);
    // Find the point on the ring closest to camera
    let bestDot = -Infinity, bestPt = null;
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const pt = pointOnSphere(o, t1, t2, a, wave.radius);
      const d = pt.clone().normalize().dot(camLocal);
      if (d > bestDot) { bestDot = d; bestPt = pt; }
    }

    if (bestPt && bestDot > 0.05) {
      tmpVec.copy(bestPt).applyMatrix4(earth.matrixWorld).project(camera);
      const sx = (tmpVec.x * 0.5 + 0.5) * innerWidth;
      const sy = (-tmpVec.y * 0.5 + 0.5) * innerHeight;
      wave.floatingLabel.style.left = sx + 'px';
      wave.floatingLabel.style.top = (sy - 10) + 'px';
      wave.floatingLabel.style.opacity = String(Math.min(0.85, bestDot * fadeOut * 1.5));
    } else {
      wave.floatingLabel.style.opacity = '0';
    }

    // ── Infect capitals the wave passes through ──
    const topicText = wave.idea.topic.text;
    for (let ci = 0; ci < cityNodes.length; ci++) {
      const city = cityNodes[ci];
      if (!canInfect(ci, topicText)) continue;
      const dist = angularDist(wave.idea.pos, city.pos);
      if (Math.abs(dist - wave.radius) < 0.03) {
        cityTopicLastInfect.set(`${ci}-${topicText}`, totalTime);
        city.infectTime = totalTime;
        city.activeColor = wave.idea.color.clone();
        city.activeTopicText = topicText;
        city.glowIntensity = 1;
      }
    }
  }

  // ── Update city visuals ──
  for (const city of cityNodes) {
    const t = totalTime - city.infectTime;
    if (city.infectTime > 0 && t < GLOW_DURATION) {
      const pulse = 0.5 + 0.5 * Math.sin(totalTime * 5);
      city.glowIntensity = (1 - t / GLOW_DURATION) * (0.6 + 0.4 * pulse);
      city.mat.color.copy(city.baseColor.clone().lerp(city.activeColor, city.glowIntensity));
      city.mat.opacity = 0.4 + city.glowIntensity * 0.6;
      city.mesh.scale.setScalar(1 + city.glowIntensity * 4);
    } else {
      city.glowIntensity = 0;
      city.mat.color.copy(city.baseColor);
      city.mat.opacity = 0.4;
      city.mesh.scale.setScalar(1);
    }

    const dot = city.pos.clone().normalize().dot(camLocal);
    if (dot > 0.15 && city.glowIntensity > 0.3) {
      tmpVec.copy(city.pos).applyMatrix4(earth.matrixWorld).project(camera);
      const sx = (tmpVec.x * 0.5 + 0.5) * innerWidth;
      const sy = (-tmpVec.y * 0.5 + 0.5) * innerHeight;
      city.label.style.left = sx + 'px';
      city.label.style.top = (sy - 12) + 'px';
      city.label.style.opacity = String(Math.min(0.9, dot * city.glowIntensity * 2));
      city.label.style.color = city.activeColor ? '#' + city.activeColor.getHexString() : '#88aacc';
      city.label.textContent = city.activeTopicText ? `${city.name} — ${city.activeTopicText}` : city.name;
      city.label.style.fontSize = '10px';
      city.label.style.fontWeight = '400';
    } else {
      city.label.style.opacity = '0';
    }
  }

  renderer.render(scene, camera);
}

animate();
