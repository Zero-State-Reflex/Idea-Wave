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

  // Label
  const label = document.createElement('div');
  label.className = 'wave-label';
  label.textContent = topic.text;
  label.style.color = topic.color;
  label.style.opacity = '0';
  label.style.fontSize = '13px';
  label.style.fontWeight = '700';
  labelsContainer.appendChild(label);

  return { topic, pos, color, core, spriteMat, sprite, light, label, fired: false };
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

// ── Wave ring pool ───────────────────────────────────────────────────
const RING_PTS = 96, MAX_RINGS = 120;
const ringPool = [];

function createRing() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RING_PTS * 3), 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
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

function updateRingGeo(ring) {
  const pos = ring.geo.attributes.position;
  const o = ring.origin, r = ring.radius;
  const up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(o.dot(up)) > 0.99) up.set(1, 0, 0);
  const t1 = new THREE.Vector3().crossVectors(o, up).normalize();
  const t2 = new THREE.Vector3().crossVectors(o, t1).normalize();
  for (let i = 0; i < RING_PTS; i++) {
    const a = (i / RING_PTS) * Math.PI * 2;
    const d = new THREE.Vector3().addScaledVector(t1, Math.cos(a)).addScaledVector(t2, Math.sin(a));
    const p = o.clone().multiplyScalar(Math.cos(r)).addScaledVector(d, Math.sin(r)).normalize().multiplyScalar(1.008);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
}

// ── Wave system ──────────────────────────────────────────────────────
// Each idea fires ONE wave. When it hits a capital, that capital fires
// its own wave. Waves only come from idea nodes or infected capitals.

const WAVE_SPEED = 0.22;
const INFECT_COOLDOWN = 10;  // per-topic cooldown per city
const GLOW_DURATION = 5;
const CITY_WAVE_RADIUS = 0.5;   // how far a capital's secondary wave reaches
const IDEA_WAVE_RADIUS = Math.PI; // idea waves spread across entire globe

let totalTime = 0;
let currentIdeaIndex = 0;
let nextIdeaFireTime = 2;
const IDEA_FIRE_INTERVAL = 12; // seconds between each idea firing

// Track per-city per-topic cooldowns
const cityTopicLastInfect = new Map(); // "cityIdx-topicText" → time

function canInfect(cityIdx, topicText) {
  const key = `${cityIdx}-${topicText}`;
  const last = cityTopicLastInfect.get(key) || -Infinity;
  return totalTime - last > INFECT_COOLDOWN;
}

function markInfected(cityIdx, topicText) {
  cityTopicLastInfect.set(`${cityIdx}-${topicText}`, totalTime);
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

  // ── Fire idea waves one at a time, cycling through ──
  if (totalTime >= nextIdeaFireTime) {
    const idea = ideaNodes[currentIdeaIndex];
    spawnRing(idea.pos, idea.color, IDEA_WAVE_RADIUS, idea.topic.text);
    idea.fired = true;
    currentIdeaIndex = (currentIdeaIndex + 1) % ideaNodes.length;
    nextIdeaFireTime = totalTime + IDEA_FIRE_INTERVAL;
  }

  // ── Update idea node glow ──
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

  // ── Update wave rings + infect capitals ──
  for (const ring of ringPool) {
    if (!ring.active) continue;
    ring.radius += WAVE_SPEED * dt;
    const fade = 1 - ring.radius / ring.maxRadius;

    if (ring.radius >= ring.maxRadius || fade <= 0) {
      ring.active = false;
      ring.mesh.visible = false;
      continue;
    }

    ring.mat.opacity = Math.min(fade * 0.7, 0.6);
    updateRingGeo(ring);

    // Check if wave hits any capital city
    for (let ci = 0; ci < cityNodes.length; ci++) {
      const city = cityNodes[ci];
      if (!canInfect(ci, ring.topicText)) continue;
      const dist = angularDist(ring.origin, city.pos);
      if (Math.abs(dist - ring.radius) < 0.025) {
        // Infect this city
        markInfected(ci, ring.topicText);
        city.infectTime = totalTime;
        city.activeColor = ring.color.clone();
        city.activeTopicText = ring.topicText;
        city.glowIntensity = 1;
        // City emits its own wave
        spawnRing(city.pos, ring.color, CITY_WAVE_RADIUS, ring.topicText);
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
