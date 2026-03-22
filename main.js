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

// Angular distance between two points on sphere (radians)
function angularDist(a, b) {
  return Math.acos(Math.min(1, Math.max(-1, a.clone().normalize().dot(b.clone().normalize()))));
}

// ── City nodes ───────────────────────────────────────────────────────
const labelsContainer = document.getElementById('labels');
const markerGeo = new THREE.SphereGeometry(0.006, 6, 6);

const cityNodes = CITIES.map(city => {
  const pos = latLonToVec3(city.lat, city.lon, 1.007);

  // Dot marker
  const mat = new THREE.MeshBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.6 });
  const mesh = new THREE.Mesh(markerGeo, mat);
  mesh.position.copy(pos);
  earth.add(mesh);

  // HTML label
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
    baseColor: new THREE.Color(0x88aacc),
    activeColor: null,    // color when infected
    infectTime: -1,       // when this node was infected
    glowIntensity: 0,     // current glow level 0-1
    activeTopicText: null, // which topic infected it
  };
});

// Pre-compute neighbors for each city (sorted by distance)
const MAX_INFECT_DIST = 0.45; // radians (~25° arc, ~2800km)
for (const node of cityNodes) {
  node.neighbors = cityNodes
    .filter(n => n !== node)
    .map(n => ({ node: n, dist: angularDist(node.pos, n.pos) }))
    .filter(n => n.dist < MAX_INFECT_DIST)
    .sort((a, b) => a.dist - b.dist);
}

// ── Wave rings (pooled for performance) ──────────────────────────────
const RING_POINTS = 96;
const MAX_RINGS = 60;
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
  return { mesh, mat, geo, active: false, origin: null, radius: 0, maxRadius: 0, color: null };
}

for (let i = 0; i < MAX_RINGS; i++) ringPool.push(createRing());

function spawnRing(origin, color, maxRadius) {
  const ring = ringPool.find(r => !r.active);
  if (!ring) return null;
  ring.active = true;
  ring.origin = origin.clone().normalize();
  ring.radius = 0;
  ring.maxRadius = maxRadius;
  ring.color = color.clone();
  ring.mat.color.copy(color);
  ring.mesh.visible = true;
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

// ── Wave propagation system ──────────────────────────────────────────
const WAVE_SPEED = 0.18;        // radians per second
const INFECT_COOLDOWN = 8;      // seconds before a node can be re-infected
const GLOW_DURATION = 4;        // seconds a node glows after infection
const WAVE_INTERVAL = 3;        // seconds between new topic waves

let totalTime = 0;
let nextWaveTime = 1;

function infectNode(node, color, topicText) {
  node.infectTime = totalTime;
  node.activeColor = color.clone();
  node.activeTopicText = topicText;
  node.glowIntensity = 1;

  // Spawn expanding ring from this node
  spawnRing(node.pos, color, MAX_INFECT_DIST * 1.2);
}

function startNewWave() {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const startNode = cityNodes[Math.floor(Math.random() * cityNodes.length)];
  const color = new THREE.Color(topic.color);
  infectNode(startNode, color, topic.text);
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

  // Spawn new topic waves periodically
  if (totalTime > nextWaveTime) {
    startNewWave();
    nextWaveTime = totalTime + WAVE_INTERVAL + Math.random() * 2;
  }

  // Update wave rings and check infections
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

    // Check if ring passes through any city node → infect it
    for (const node of cityNodes) {
      if (node.infectTime > 0 && totalTime - node.infectTime < INFECT_COOLDOWN) continue;
      const dist = angularDist(ring.origin, node.pos);
      // Ring is at radius ± tolerance
      if (Math.abs(dist - ring.radius) < 0.03) {
        infectNode(node, ring.color, ring._topicText || '');
      }
    }
  }

  // Update city node visuals
  const camWorldPos = camera.position.clone();
  // Account for earth rotation by transforming camera pos into earth's local space
  const earthInverse = earth.matrixWorld.clone().invert();
  const camLocal = camWorldPos.applyMatrix4(earthInverse).normalize();

  for (const node of cityNodes) {
    const timeSinceInfect = totalTime - node.infectTime;

    // Glow decay
    if (node.infectTime > 0 && timeSinceInfect < GLOW_DURATION) {
      const pulse = 0.5 + 0.5 * Math.sin(totalTime * 6);
      node.glowIntensity = (1 - timeSinceInfect / GLOW_DURATION) * (0.7 + 0.3 * pulse);
      const c = node.baseColor.clone().lerp(node.activeColor, node.glowIntensity);
      node.mat.color.copy(c);
      node.mat.opacity = 0.6 + node.glowIntensity * 0.4;
      node.mesh.scale.setScalar(1 + node.glowIntensity * 3);
    } else {
      node.glowIntensity = 0;
      node.mat.color.copy(node.baseColor);
      node.mat.opacity = 0.5;
      node.mesh.scale.setScalar(1);
    }

    // Label visibility (only front-facing, only when glowing)
    const dot = node.pos.clone().normalize().dot(camLocal);
    if (dot > 0.15 && node.glowIntensity > 0.2) {
      tmpVec.copy(node.pos).applyMatrix4(earth.matrixWorld).project(camera);
      const sx = (tmpVec.x * 0.5 + 0.5) * innerWidth;
      const sy = (-tmpVec.y * 0.5 + 0.5) * innerHeight;
      node.label.style.left = sx + 'px';
      node.label.style.top = (sy - 14) + 'px';
      node.label.style.opacity = String(Math.min(1, dot * node.glowIntensity * 2));
      node.label.style.color = node.activeColor ? '#' + node.activeColor.getHexString() : '#88aacc';
      node.label.textContent = node.activeTopicText
        ? `${node.name} — ${node.activeTopicText}`
        : node.name;
    } else {
      node.label.style.opacity = '0';
    }
  }

  renderer.render(scene, camera);
}

animate();
