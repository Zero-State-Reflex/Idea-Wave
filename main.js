// Idea Globe — main.js
// A 3D rotating globe where ideas are pinned as glowing nodes

const canvas = document.getElementById('globe');
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// --- Idea data ---
const ideas = [];
const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6fb7', '#c084fc', '#22d3ee'];

function addIdea(text) {
  const phi = Math.random() * Math.PI * 2;
  const theta = Math.acos(2 * Math.random() - 1);
  ideas.push({
    text,
    phi,
    theta,
    color: colors[Math.floor(Math.random() * colors.length)],
    pulse: Math.random() * Math.PI * 2,
  });
}

// Seed some starter ideas
['Creativity', 'Innovation', 'Collaboration', 'Discovery',
 'Curiosity', 'Imagination', 'Vision', 'Empathy',
 'Resilience', 'Growth', 'Connection', 'Wonder'].forEach(addIdea);

// --- Globe settings ---
const GLOBE_RADIUS = Math.min(width, height) * 0.3;
let rotation = 0;
let isDragging = false;
let dragStartX = 0;
let rotationOffset = 0;

// --- Mouse interaction ---
canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragStartX = e.clientX;
  rotationOffset = rotation;
});
canvas.addEventListener('mousemove', (e) => {
  if (isDragging) {
    rotation = rotationOffset + (e.clientX - dragStartX) * 0.005;
  }
});
canvas.addEventListener('mouseup', () => { isDragging = false; });

// --- Double-click to add idea ---
canvas.addEventListener('dblclick', () => {
  const text = prompt('Enter your idea:');
  if (text && text.trim()) addIdea(text.trim());
});

// --- Render ---
function project(phi, theta) {
  const r = GLOBE_RADIUS;
  const x = r * Math.sin(theta) * Math.cos(phi + rotation);
  const y = r * Math.cos(theta);
  const z = r * Math.sin(theta) * Math.sin(phi + rotation);
  const scale = 1 + z / (r * 3);
  return { x: width / 2 + x, y: height / 2 + y, z, scale };
}

function drawGlobe() {
  // Wireframe rings
  ctx.strokeStyle = 'rgba(100, 140, 255, 0.08)';
  ctx.lineWidth = 1;

  // Latitude lines
  for (let lat = 0; lat < Math.PI; lat += Math.PI / 8) {
    ctx.beginPath();
    for (let lon = 0; lon <= Math.PI * 2; lon += 0.05) {
      const p = project(lon, lat);
      if (lon === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  // Longitude lines
  for (let lon = 0; lon < Math.PI * 2; lon += Math.PI / 8) {
    ctx.beginPath();
    for (let lat = 0; lat <= Math.PI; lat += 0.05) {
      const p = project(lon, lat);
      if (lat === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
}

function drawIdeas(time) {
  // Sort by z for depth ordering
  const projected = ideas.map((idea, i) => {
    const p = project(idea.phi, idea.theta);
    return { ...idea, ...p, index: i };
  }).sort((a, b) => a.z - b.z);

  for (const idea of projected) {
    const alpha = 0.3 + 0.7 * ((idea.z / GLOBE_RADIUS + 1) / 2);
    const pulseSize = 4 + 2 * Math.sin(time * 0.003 + idea.pulse);
    const nodeSize = pulseSize * idea.scale;

    // Glow
    const gradient = ctx.createRadialGradient(idea.x, idea.y, 0, idea.x, idea.y, nodeSize * 4);
    gradient.addColorStop(0, idea.color + Math.round(alpha * 60).toString(16).padStart(2, '0'));
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(idea.x, idea.y, nodeSize * 4, 0, Math.PI * 2);
    ctx.fill();

    // Node dot
    ctx.fillStyle = idea.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(idea.x, idea.y, nodeSize, 0, Math.PI * 2);
    ctx.fill();

    // Label
    if (alpha > 0.5) {
      ctx.font = `${Math.round(12 * idea.scale)}px -apple-system, sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillText(idea.text, idea.x + nodeSize + 6, idea.y + 4);
    }

    ctx.globalAlpha = 1;
  }
}

function animate(time) {
  ctx.clearRect(0, 0, width, height);

  if (!isDragging) {
    rotation += 0.002;
  }

  drawGlobe();
  drawIdeas(time);

  // Instructions
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '14px -apple-system, sans-serif';
  ctx.fillText('Drag to rotate  •  Double-click to add an idea', 20, height - 20);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
