import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── City nodes ───────────────────────────────────────────────────────
const NODES = [
  // Origin
  { name: 'Los Angeles', lat: 34.05, lon: -118.25 },

  // Major US cities (wave hits these first as it spreads from LA)
  { name: 'San Francisco', lat: 37.77, lon: -122.42 },
  { name: 'Las Vegas', lat: 36.17, lon: -115.14 },
  { name: 'Phoenix', lat: 33.45, lon: -112.07 },
  { name: 'Denver', lat: 39.74, lon: -104.99 },
  { name: 'Dallas', lat: 32.78, lon: -96.80 },
  { name: 'Houston', lat: 29.76, lon: -95.37 },
  { name: 'Chicago', lat: 41.88, lon: -87.63 },
  { name: 'Atlanta', lat: 33.75, lon: -84.39 },
  { name: 'Miami', lat: 25.76, lon: -80.19 },
  { name: 'Washington D.C.', lat: 38.91, lon: -77.04 },
  { name: 'New York', lat: 40.71, lon: -74.01 },
  { name: 'Boston', lat: 42.36, lon: -71.06 },
  { name: 'Seattle', lat: 47.61, lon: -122.33 },

  // Canada
  { name: 'Vancouver', lat: 49.28, lon: -123.12 },
  { name: 'Toronto', lat: 43.65, lon: -79.38 },
  { name: 'Montreal', lat: 45.50, lon: -73.57 },

  // Mexico & Central America
  { name: 'Mexico City', lat: 19.43, lon: -99.13 },
  { name: 'Guadalajara', lat: 20.67, lon: -103.35 },
  { name: 'Panama City', lat: 9.0, lon: -79.5 },

  // South America
  { name: 'Bogotá', lat: 4.71, lon: -74.07 },
  { name: 'Lima', lat: -12.05, lon: -77.04 },
  { name: 'São Paulo', lat: -23.55, lon: -46.63 },
  { name: 'Rio de Janeiro', lat: -22.91, lon: -43.17 },
  { name: 'Buenos Aires', lat: -34.60, lon: -58.38 },
  { name: 'Santiago', lat: -33.45, lon: -70.67 },

  // Europe
  { name: 'London', lat: 51.51, lon: -0.13 },
  { name: 'Paris', lat: 48.86, lon: 2.35 },
  { name: 'Berlin', lat: 52.52, lon: 13.41 },
  { name: 'Madrid', lat: 40.42, lon: -3.70 },
  { name: 'Rome', lat: 41.90, lon: 12.50 },
  { name: 'Amsterdam', lat: 52.37, lon: 4.90 },
  { name: 'Stockholm', lat: 59.33, lon: 18.07 },
  { name: 'Moscow', lat: 55.76, lon: 37.62 },
  { name: 'Istanbul', lat: 41.01, lon: 28.98 },

  // Africa
  { name: 'Lagos', lat: 6.52, lon: 3.38 },
  { name: 'Cairo', lat: 30.04, lon: 31.24 },
  { name: 'Nairobi', lat: -1.29, lon: 36.82 },
  { name: 'Johannesburg', lat: -26.20, lon: 28.04 },
  { name: 'Cape Town', lat: -33.93, lon: 18.42 },
  { name: 'Casablanca', lat: 33.57, lon: -7.59 },

  // Middle East
  { name: 'Dubai', lat: 25.20, lon: 55.27 },
  { name: 'Riyadh', lat: 24.69, lon: 46.72 },
  { name: 'Tel Aviv', lat: 32.09, lon: 34.78 },
  { name: 'Tehran', lat: 35.69, lon: 51.39 },

  // South Asia
  { name: 'Mumbai', lat: 19.08, lon: 72.88 },
  { name: 'New Delhi', lat: 28.61, lon: 77.21 },
  { name: 'Bangalore', lat: 12.97, lon: 77.59 },
  { name: 'Karachi', lat: 24.86, lon: 67.01 },
  { name: 'Dhaka', lat: 23.81, lon: 90.41 },

  // East & Southeast Asia
  { name: 'Beijing', lat: 39.90, lon: 116.41 },
  { name: 'Shanghai', lat: 31.23, lon: 121.47 },
  { name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Seoul', lat: 37.57, lon: 126.98 },
  { name: 'Hong Kong', lat: 22.32, lon: 114.17 },
  { name: 'Singapore', lat: 1.35, lon: 103.82 },
  { name: 'Bangkok', lat: 13.76, lon: 100.50 },
  { name: 'Jakarta', lat: -6.21, lon: 106.85 },
  { name: 'Manila', lat: 14.60, lon: 120.98 },
  { name: 'Hanoi', lat: 21.03, lon: 105.85 },

  // Oceania
  { name: 'Sydney', lat: -33.87, lon: 151.21 },
  { name: 'Melbourne', lat: -37.81, lon: 144.96 },
  { name: 'Auckland', lat: -36.85, lon: 174.76 },

  // Hawaii & Pacific
  { name: 'Honolulu', lat: 21.31, lon: -157.86 },
  { name: 'Anchorage', lat: 61.22, lon: -149.90 },
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

  // 3 pulse rings that expand from city center on infection
  const PULSE_RING_PTS = 64;
  const pulseRings = [];
  for (let r = 0; r < 3; r++) {
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PULSE_RING_PTS * 3), 3));
    const rMat = new THREE.LineBasicMaterial({
      color: ideaColor, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const rMesh = new THREE.LineLoop(rGeo, rMat);
    rMesh.visible = false;
    earth.add(rMesh);
    pulseRings.push({ geo: rGeo, mat: rMat, mesh: rMesh, radius: 0 });
  }

  return {
    name: city.name, pos, core, coreMat, sprite, spriteMat, light, label,
    isOrigin,
    distFromOrigin: angularDist(originPos, pos),
    infectTime: isOrigin ? 0 : -1,
    glow: isOrigin ? 1 : 0,
    pulseRings,
    pulseFired: false,
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

// 5 wave bands: leading wave + 4 trailing waves that fade
const NUM_WAVES = 5;
const WAVE_STAGGER = 1.5; // seconds between each wave launch

function createWaveBand() {
  const geo = new THREE.BufferGeometry();
  const vc = RING_PTS * BAND_ROWS;
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vc * 3), 3));
  geo.setAttribute('rowAlpha', new THREE.BufferAttribute(new Float32Array(vc), 1));
  const idx = [];
  for (let row = 0; row < BAND_ROWS - 1; row++) {
    for (let i = 0; i < RING_PTS; i++) {
      const c = row * RING_PTS + i, n = row * RING_PTS + (i+1)%RING_PTS;
      const cu = (row+1)*RING_PTS + i, nu = (row+1)*RING_PTS + (i+1)%RING_PTS;
      idx.push(c,n,cu, n,nu,cu);
    }
  }
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    vertexShader: waveBandVert, fragmentShader: waveBandFrag,
    uniforms: { uColor: { value: ideaColor.clone() }, uOpacity: { value: 0 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  earth.add(mesh);
  return { geo, mat, mesh, radius: 0, active: false };
}

const waveBands = [];
for (let i = 0; i < NUM_WAVES; i++) waveBands.push(createWaveBand());

function updateWaveBandGeo(band) {
  const positions = band.geo.attributes.position;
  const alphas = band.geo.attributes.rowAlpha;
  const { o, t1, t2 } = tangentBasis(originPos);
  const bandWidth = band.radius * 0.06;

  for (let row = 0; row < BAND_ROWS; row++) {
    const rowT = row / (BAND_ROWS - 1);
    const rowR = Math.max(0.001, band.radius + (rowT - 0.5) * bandWidth);
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

// ── Pulse ring helpers ───────────────────────────────────────────────
const PULSE_RING_PTS = 64;
const PULSE_MAX_RADIUS = 0.08;  // small local rings around city
const PULSE_SPEED = 0.06;
const PULSE_STAGGER = 0.4;      // seconds between each of the 3 rings

function updatePulseRingGeo(geo, origin, radius) {
  const positions = geo.attributes.position;
  const { o, t1, t2 } = tangentBasis(origin);
  for (let i = 0; i < PULSE_RING_PTS; i++) {
    const a = (i / PULSE_RING_PTS) * Math.PI * 2;
    const p = pointOnSphere(o, t1, t2, a, radius);
    positions.setXYZ(i, p.x, p.y, p.z);
  }
  positions.needsUpdate = true;
}

// ── Animate ──────────────────────────────────────────────────────────
const WAVE_SPEED = 0.04;
const GLOW_FADE = 6;
let totalTime = 0;
const WAVE_START = 2;
// Leading wave radius (wave 0) — used for city infection checks
let leadWaveRadius = 0;
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

  // ── Update 5 wave bands ──
  for (let wi = 0; wi < NUM_WAVES; wi++) {
    const band = waveBands[wi];
    const bandStart = WAVE_START + wi * WAVE_STAGGER;

    if (totalTime < bandStart) continue;

    if (!band.active) {
      band.active = true;
      band.radius = 0;
      band.mesh.visible = true;
    }

    band.radius += WAVE_SPEED * dt;

    if (band.radius >= Math.PI) {
      band.mesh.visible = false;
      continue;
    }

    // Trailing waves fade more — wave 0 is full opacity, wave 4 is faintest
    const baseFade = 1 - wi * 0.18; // 1.0, 0.82, 0.64, 0.46, 0.28
    const progress = band.radius / Math.PI;
    const fadeOut = Math.pow(1 - progress, 1.5);
    band.mat.uniforms.uOpacity.value = baseFade * fadeOut * 0.55;

    updateWaveBandGeo(band);

    // Track leading wave for city infection
    if (wi === 0) leadWaveRadius = band.radius;
  }

  // Floating label follows leading wave front
  if (waveBands[0].active && waveBands[0].radius < Math.PI) {
    const { o, t1, t2 } = tangentBasis(originPos);
    let bestDot = -Infinity, bestPt = null;
    for (let i = 0; i < 32; i++) {
      const pt = pointOnSphere(o, t1, t2, (i/32)*Math.PI*2, waveBands[0].radius);
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
  } else {
    floatingLabel.style.opacity = '0';
  }

  // ── Update each city node ──
  for (const city of cityNodes) {
    const dot = city.pos.clone().normalize().dot(camLocal);

    // Check if leading wave has reached this city
    if (!city.isOrigin && city.infectTime < 0 && leadWaveRadius >= city.distFromOrigin) {
      city.infectTime = totalTime;
      city.pulseFired = true;
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
    city.spriteMat.opacity = city.isOrigin ? 0.5 + g * 0.3 : g * 0.9;
    city.sprite.scale.setScalar(city.isOrigin ? 0.12 + g * 0.04 : 0.08 + g * 0.14);

    // Point light
    city.light.color.copy(g > 0.1 ? ideaColor : dimColor);
    city.light.intensity = city.isOrigin ? 0.4 + g * 0.3 : g * 0.8;

    // Pulse rings — 3 staggered expanding rings from city center
    if (city.pulseFired && city.infectTime > 0) {
      const timeSince = totalTime - city.infectTime;
      for (let r = 0; r < 3; r++) {
        const ring = city.pulseRings[r];
        const ringTime = timeSince - r * PULSE_STAGGER;
        if (ringTime < 0) {
          ring.mesh.visible = false;
          continue;
        }
        const ringRadius = ringTime * PULSE_SPEED;
        if (ringRadius > PULSE_MAX_RADIUS) {
          ring.mesh.visible = false;
          continue;
        }
        ring.mesh.visible = true;
        const progress = ringRadius / PULSE_MAX_RADIUS;
        ring.mat.opacity = (1 - progress) * 0.8;
        updatePulseRingGeo(ring.geo, city.pos, Math.max(0.001, ringRadius));
      }
    }

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
