import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
controls.autoRotateSpeed = 0.4;
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
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
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

// ── Idea waves ───────────────────────────────────────────────────────
const IDEA_TOPICS = [
  { text: 'Iran War', color: '#ff4444', lat: 32, lon: 53 },
  { text: 'Healthcare', color: '#44ddff', lat: 39, lon: -98 },
  { text: 'Artificial Intelligence', color: '#aa66ff', lat: 37, lon: -122 },
  { text: 'Climate Change', color: '#44ff88', lat: 48, lon: 2 },
  { text: 'Cost of Living', color: '#ffaa33', lat: 51, lon: -0.1 },
  { text: 'Immigration', color: '#ff6699', lat: 30, lon: -97 },
  { text: 'Cryptocurrency', color: '#ffdd44', lat: 1, lon: 103 },
  { text: 'Mental Health', color: '#66bbff', lat: 43, lon: -79 },
  { text: 'Election Politics', color: '#ff5577', lat: 38, lon: -77 },
  { text: 'Space Exploration', color: '#8899ff', lat: 28, lon: -80 },
  { text: 'Misinformation', color: '#ff8844', lat: 35, lon: 139 },
  { text: 'Renewable Energy', color: '#33ff99', lat: 55, lon: 12 },
  { text: 'Student Debt', color: '#ddaa55', lat: 42, lon: -71 },
  { text: 'Global Trade', color: '#55ccdd', lat: 31, lon: 121 },
  { text: 'Nuclear Threat', color: '#ff3333', lat: 39, lon: 125 },
  { text: 'Water Crisis', color: '#3399ff', lat: 20, lon: 78 },
];

// Convert lat/lon to 3D position on sphere
function latLonToVec3(lat, lon, radius = 1.005) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Create a wave ring on the sphere surface
class IdeaWave {
  constructor(topic, delay) {
    this.topic = topic;
    this.origin = latLonToVec3(topic.lat, topic.lon);
    this.color = new THREE.Color(topic.color);
    this.maxRadius = 0.6 + Math.random() * 0.4;
    this.speed = 0.15 + Math.random() * 0.1;
    this.delay = delay;
    this.time = -delay;
    this.rings = [];
    this.label = null;

    this.createLabel();
    this.spawnRing();
  }

  createLabel() {
    const el = document.createElement('div');
    el.className = 'wave-label';
    el.textContent = this.topic.text;
    el.style.color = this.topic.color;
    el.style.opacity = '0';
    document.getElementById('labels').appendChild(el);
    this.label = el;
  }

  spawnRing() {
    const ringPoints = 128;
    const ringGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(ringPoints * 3);
    ringGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const ringMat = new THREE.LineBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.8,
      linewidth: 1,
    });

    const ring = new THREE.LineLoop(ringGeo, ringMat);
    scene.add(ring);

    this.rings.push({ mesh: ring, progress: 0 });
  }

  updateRingGeometry(ring, radius) {
    const positions = ring.mesh.geometry.attributes.position;
    const count = positions.count;
    const origin = this.origin.clone().normalize();

    // Build orthonormal basis on the sphere at origin
    const up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(origin.dot(up)) > 0.99) up.set(1, 0, 0);
    const tangent1 = new THREE.Vector3().crossVectors(origin, up).normalize();
    const tangent2 = new THREE.Vector3().crossVectors(origin, tangent1).normalize();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      // Point on a circle in tangent plane
      const dir = new THREE.Vector3()
        .addScaledVector(tangent1, Math.cos(angle))
        .addScaledVector(tangent2, Math.sin(angle));

      // Rotate from origin along great circle by `radius` radians
      const point = origin.clone()
        .multiplyScalar(Math.cos(radius))
        .addScaledVector(dir, Math.sin(radius))
        .normalize()
        .multiplyScalar(1.006);

      positions.setXYZ(i, point.x, point.y, point.z);
    }
    positions.needsUpdate = true;
  }

  update(dt) {
    this.time += dt;
    if (this.time < 0) {
      if (this.label) this.label.style.opacity = '0';
      return;
    }

    // Respawn cycle
    const cycleDuration = this.maxRadius / this.speed + 1.5;
    const cycleTime = this.time % cycleDuration;

    for (const ring of this.rings) {
      ring.progress = cycleTime * this.speed;
      const r = ring.progress;

      if (r < this.maxRadius) {
        ring.mesh.visible = true;
        this.updateRingGeometry(ring, r);
        const fade = 1 - r / this.maxRadius;
        ring.mesh.material.opacity = fade * 0.7;
      } else {
        ring.mesh.visible = false;
      }
    }

    // Update label position
    if (this.label) {
      const screenPos = this.origin.clone().applyMatrix4(earth.matrixWorld);
      screenPos.project(camera);
      const x = (screenPos.x * 0.5 + 0.5) * innerWidth;
      const y = (-screenPos.y * 0.5 + 0.5) * innerHeight;

      // Check if on front side
      const camDir = camera.position.clone().normalize();
      const dotProduct = this.origin.clone().normalize().dot(camDir);

      if (dotProduct > 0.05 && cycleTime < this.maxRadius / this.speed) {
        this.label.style.opacity = String(Math.min(1, dotProduct * 2));
        this.label.style.left = x + 'px';
        this.label.style.top = (y - 18) + 'px';
        this.label.style.fontSize = `${Math.max(10, Math.min(15, 12 + dotProduct * 6))}px`;
      } else {
        this.label.style.opacity = '0';
      }
    }
  }

  dispose() {
    for (const ring of this.rings) {
      scene.remove(ring.mesh);
      ring.mesh.geometry.dispose();
      ring.mesh.material.dispose();
    }
    if (this.label) this.label.remove();
  }
}

// Create origin markers (glowing dots)
const markerGeo = new THREE.SphereGeometry(0.012, 8, 8);

const waves = IDEA_TOPICS.map((topic, i) => {
  // Add a glowing dot at the origin
  const markerMat = new THREE.MeshBasicMaterial({ color: topic.color });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  const pos = latLonToVec3(topic.lat, topic.lon, 1.008);
  marker.position.copy(pos);
  earth.add(marker);

  // Add a point light for glow effect
  const glow = new THREE.PointLight(topic.color, 0.3, 0.3);
  glow.position.copy(pos);
  earth.add(glow);

  return new IdeaWave(topic, i * 0.8);
});

// ── Animate ──────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  controls.update();
  earth.rotation.y += 0.0005;
  clouds.rotation.y += 0.0007;

  for (const wave of waves) {
    wave.update(dt);
  }

  renderer.render(scene, camera);
}

animate();
