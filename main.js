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
const earthDayMap = loader.load(
  'https://unpkg.com/three-globe@2.35.0/example/img/earth-blue-marble.jpg'
);
const earthBumpMap = loader.load(
  'https://unpkg.com/three-globe@2.35.0/example/img/earth-topology.png'
);
const earthSpecMap = loader.load(
  'https://unpkg.com/three-globe@2.35.0/example/img/earth-water.png'
);

// ── Earth sphere ─────────────────────────────────────────────────────
const earthGeo = new THREE.SphereGeometry(1, 96, 96);
const earthMat = new THREE.MeshPhongMaterial({
  map: earthDayMap,
  bumpMap: earthBumpMap,
  bumpScale: 0.03,
  specularMap: earthSpecMap,
  specular: 0x333333,
  shininess: 25,
});
const earth = new THREE.Mesh(earthGeo, earthMat);
scene.add(earth);

// Cloud layer
const cloudMap = loader.load(
  'https://unpkg.com/three-globe@2.35.0/example/img/earth-clouds.png'
);
const cloudGeo = new THREE.SphereGeometry(1.01, 64, 64);
const cloudMat = new THREE.MeshPhongMaterial({
  map: cloudMap,
  transparent: true,
  opacity: 0.25,
  depthWrite: false,
});
const clouds = new THREE.Mesh(cloudGeo, cloudMat);
scene.add(clouds);

// Atmosphere glow
const atmosGeo = new THREE.SphereGeometry(1.02, 64, 64);
const atmosMat = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
      gl_FragColor = vec4(0.3, 0.6, 1.0, intensity * 0.6);
    }
  `,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  transparent: true,
});
scene.add(new THREE.Mesh(atmosGeo, atmosMat));

// ── Stars ────────────────────────────────────────────────────────────
const starGeo = new THREE.BufferGeometry();
const starVerts = new Float32Array(3000 * 3);
for (let i = 0; i < starVerts.length; i++) {
  starVerts[i] = (Math.random() - 0.5) * 100;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starVerts, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08 })));

// ── Helpers ──────────────────────────────────────────────────────────
function latLonToVec3(lat, lon, radius = 1.005) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function angularDist(a, b) {
  return Math.acos(Math.min(1, Math.max(-1, a.clone().normalize().dot(b.clone().normalize()))));
}

// ── Glow sprite texture ─────────────────────────────────────────────
function createGlowTexture() {
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const cx = cv.getContext('2d');
  const grad = cx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.15, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = grad;
  cx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cv);
}
const glowTex = createGlowTexture();

// ── Idea topic nodes (permanent, glowing) ────────────────────────────
const labelsContainer = document.getElementById('labels');

const ideaNodes = TOPICS.map((topic, i) => {
  const pos = latLonToVec3(topic.lat, topic.lon, 1.008);
  const color = new THREE.Color(topic.color);

  // Core dot
  const coreMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
  const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), coreMat);
  coreMesh.position.copy(pos);
  earth.add(coreMesh);

  // Glow sprite
  const spriteMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: color,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.copy(pos);
  sprite.scale.setScalar(0.12);
  earth.add(sprite);

  // Point light for local glow
  const light = new THREE.PointLight(topic.color, 0.5, 0.4);
  light.position.copy(pos);
  earth.add(light);

  // HTML label
  const label = document.createElement('div');
  label.className = 'wave-label';
  label.textContent = topic.text;
  label.style.color = topic.color;
  label.style.opacity = '0';
  label.style.fontSize = '13px';
  label.style.fontWeight = '700';
  labelsContainer.appendChild(label);

  return {
    topic,
    pos,
    color,
    coreMesh,
    coreMat,
    sprite,
    spriteMat,
    light,
    label,
    // Wave timing: each idea pulses on its own schedule
    waveInterval: 6 + Math.random() * 6,  // 6-12s between pulses
    nextWaveTime: 1 + i * 0.7,            // staggered start
  };
});

// ── City nodes (smaller, get infected by waves) ─────────────────────
const cityMarkerGeo = new THREE.SphereGeometry(0.005, 6, 6);

const cityNodes = CITIES.map(city => {
  const pos = latLonToVec3(city.lat, city.lon, 1.007);
  const mat = new THREE.MeshBasicMaterial({ color: 0x556677, transparent: true, opacity: 0.4 });
  const mesh = new THREE.Mesh(cityMarkerGeo, mat);
  mesh.position.copy(pos);
  earth.add(mesh);

  const label = document.createElement('div');
  label.className = 'wave-label';
  label.textContent = city.name;
  label.style.opacity = '0';
  labelsContainer.appendChild(label);

  return {
    name: city.name,
    pos,
    mesh,
    mat,
    label,
    baseColor: new THREE.Color(0x556677),
    activeColor: null,
    infectTime: -1,
    activeTopicText: null,
    glowIntensity: 0,
  };
});

// ── Wave rings (pooled) ──────────────────────────────────────────────
const RING_POINTS = 96;
const MAX_RINGS = 80;
const ringPool = [];

function createRing() {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(RING_POINTS * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    linewidth: 1,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.LineLoop(geo, mat);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, mat, geo, active: false, origin: null, radius: 0, maxRadius: 0, color: null, topicText: '' };
}

for (let i = 0; i < MAX_RINGS; i++) ringPool.push(createRing());

function spawnRing(origin, color, maxRadius, topicText) {
  const ring = ringPool.find(r => !r.active);
  if (!ring) return null;
  ring.active = true;
  ring.origin = origin.clone().normalize();
  ring.radius = 0;
  ring.maxRadius = maxRadius;
  ring.color = color.clone();
  ring.mat.color.copy(color);
  ring.mesh.visible = true;
  ring.topicText = topicText;
  return ring;
}

function updateRingGeometry(ring) {
  const positions = ring.geo.attributes.position;
  const origin = ring.origin;
  const radius = ring.radius;

  const up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(origin.dot(up)) > 0.99) up.set(1, 0, 0);
  const t1 = new THREE.Vector3().crossVectors(origin, up).normalize();
  const t2 = new THREE.Vector3().crossVectors(origin, t1).normalize();

  for (let i = 0; i < RING_POINTS; i++) {
    const angle = (i / RING_POINTS) * Math.PI * 2;
    const dir = new THREE.Vector3()
      .addScaledVector(t1, Math.cos(angle))
      .addScaledVector(t2, Math.sin(angle));
    const point = origin.clone()
      .multiplyScalar(Math.cos(radius))
      .addScaledVector(dir, Math.sin(radius))
      .normalize()
      .multiplyScalar(1.008);
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  positions.needsUpdate = true;
}

// ── Wave propagation ─────────────────────────────────────────────────
const WAVE_SPEED = 0.2;
const INFECT_COOLDOWN = 6;
const GLOW_DURATION = 5;
const MAX_WAVE_RADIUS = 0.55; // ~30° arc

let totalTime = 0;

function infectCity(node, color, topicText) {
  node.infectTime = totalTime;
  node.activeColor = color.clone();
  node.activeTopicText = topicText;
  node.glowIntensity = 1;

  // Infected cities also emit a smaller secondary wave
  spawnRing(node.pos, color, MAX_WAVE_RADIUS * 0.6, topicText);
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

  // Camera in earth-local space (for front-face checks)
  const earthInverse = earth.matrixWorld.clone().invert();
  const camLocal = camera.position.clone().applyMatrix4(earthInverse).normalize();

  // ── Update idea nodes: pulse glow + emit waves ──
  for (const idea of ideaNodes) {
    // Pulsing glow
    const pulse = 0.7 + 0.3 * Math.sin(totalTime * 3 + idea.topic.lat);
    idea.spriteMat.opacity = 0.5 * pulse;
    idea.sprite.scale.setScalar(0.10 + 0.04 * pulse);
    idea.light.intensity = 0.3 + 0.3 * pulse;
    idea.coreMesh.scale.setScalar(0.8 + 0.4 * pulse);

    // Emit wave on schedule
    if (totalTime >= idea.nextWaveTime) {
      spawnRing(idea.pos, idea.color, MAX_WAVE_RADIUS, idea.topic.text);
      idea.nextWaveTime = totalTime + idea.waveInterval + Math.random() * 2;
    }

    // Label (always visible when front-facing)
    const dot = idea.pos.clone().normalize().dot(camLocal);
    if (dot > 0.1) {
      tmpVec.copy(idea.pos).applyMatrix4(earth.matrixWorld).project(camera);
      const sx = (tmpVec.x * 0.5 + 0.5) * innerWidth;
      const sy = (-tmpVec.y * 0.5 + 0.5) * innerHeight;
      idea.label.style.left = sx + 'px';
      idea.label.style.top = (sy - 20) + 'px';
      idea.label.style.opacity = String(Math.min(0.95, dot * 1.5));
    } else {
      idea.label.style.opacity = '0';
    }
  }

  // ── Update wave rings + infect cities ──
  for (const ring of ringPool) {
    if (!ring.active) continue;
    ring.radius += WAVE_SPEED * dt;
    const fade = 1 - ring.radius / ring.maxRadius;

    if (ring.radius >= ring.maxRadius || fade <= 0) {
      ring.active = false;
      ring.mesh.visible = false;
      continue;
    }

    ring.mat.opacity = fade * 0.6;
    updateRingGeometry(ring);

    // Infect city nodes the wave passes through
    for (const city of cityNodes) {
      if (city.infectTime > 0 && totalTime - city.infectTime < INFECT_COOLDOWN) continue;
      const dist = angularDist(ring.origin, city.pos);
      if (Math.abs(dist - ring.radius) < 0.025) {
        infectCity(city, ring.color, ring.topicText);
      }
    }
  }

  // ── Update city node visuals ──
  for (const city of cityNodes) {
    const timeSinceInfect = totalTime - city.infectTime;

    if (city.infectTime > 0 && timeSinceInfect < GLOW_DURATION) {
      const pulse = 0.5 + 0.5 * Math.sin(totalTime * 5);
      city.glowIntensity = (1 - timeSinceInfect / GLOW_DURATION) * (0.6 + 0.4 * pulse);
      city.mat.color.copy(city.baseColor.clone().lerp(city.activeColor, city.glowIntensity));
      city.mat.opacity = 0.4 + city.glowIntensity * 0.6;
      city.mesh.scale.setScalar(1 + city.glowIntensity * 4);
    } else {
      city.glowIntensity = 0;
      city.mat.color.copy(city.baseColor);
      city.mat.opacity = 0.4;
      city.mesh.scale.setScalar(1);
    }

    // City label (only when glowing + front-facing)
    const dot = city.pos.clone().normalize().dot(camLocal);
    if (dot > 0.15 && city.glowIntensity > 0.3) {
      tmpVec.copy(city.pos).applyMatrix4(earth.matrixWorld).project(camera);
      const sx = (tmpVec.x * 0.5 + 0.5) * innerWidth;
      const sy = (-tmpVec.y * 0.5 + 0.5) * innerHeight;
      city.label.style.left = sx + 'px';
      city.label.style.top = (sy - 12) + 'px';
      city.label.style.opacity = String(Math.min(0.9, dot * city.glowIntensity * 2));
      city.label.style.color = city.activeColor ? '#' + city.activeColor.getHexString() : '#88aacc';
      city.label.textContent = city.activeTopicText
        ? `${city.name} — ${city.activeTopicText}`
        : city.name;
      city.label.style.fontSize = '10px';
      city.label.style.fontWeight = '400';
    } else {
      city.label.style.opacity = '0';
    }
  }

  renderer.render(scene, camera);
}

animate();
