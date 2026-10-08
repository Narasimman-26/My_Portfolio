import * as THREE from 'three';
import confetti from 'canvas-confetti';

/* ==========================================================
   NARASIMMAN P - 3D PORTFOLIO INTERACTION ENGINE
   ========================================================== */

// --- Global Audio Synthesizer (Web Audio API) ---
class SoundController {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('sound_enabled') === 'true';
    this.updateIcons();
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.init();
    this.enabled = !this.enabled;
    localStorage.setItem('sound_enabled', this.enabled);
    this.updateIcons();
    this.showToast(this.enabled ? '🔊 Sci-Fi Sound FX Enabled' : '🔇 Sound FX Muted');
    if (this.enabled) {
      this.playBeep(600, 0.08, 'sine');
    }
  }

  updateIcons() {
    const iconOn = document.getElementById('sound-icon-on');
    const iconOff = document.getElementById('sound-icon-off');
    if (iconOn && iconOff) {
      if (this.enabled) {
        iconOn.classList.remove('hidden');
        iconOff.classList.add('hidden');
      } else {
        iconOn.classList.add('hidden');
        iconOff.classList.remove('hidden');
      }
    }
  }

  showToast(msg) {
    const toast = document.getElementById('audio-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  playBeep(freq = 520, duration = 0.05, type = 'sine', gainVal = 0.04) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // AudioContext fallback
    }
  }

  playClick() {
    this.playBeep(880, 0.04, 'triangle', 0.03);
  }

  playCyberBlip() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {}
  }
}

const sound = new SoundController();

// --- Background 3D Starfield & Space Canvas ---
function initBackgroundCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 400;

  // Starfield particles
  const particleCount = 700;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const color1 = new THREE.Color(0x00f0ff);
  const color2 = new THREE.Color(0x6366f1);
  const color3 = new THREE.Color(0x10b981);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1200;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1200;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;

    const chosenColor = Math.random() > 0.6 ? color1 : (Math.random() > 0.5 ? color2 : color3);
    colors[i * 3] = chosenColor.r;
    colors[i * 3 + 1] = chosenColor.g;
    colors[i * 3 + 2] = chosenColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });

  const starField = new THREE.Points(geometry, material);
  scene.add(starField);

  // Subtle Wireframe Cyber Plane at base
  const gridGeo = new THREE.PlaneGeometry(1600, 1600, 32, 32);
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.05
  });
  const gridMesh = new THREE.Mesh(gridGeo, gridMat);
  gridMesh.rotation.x = -Math.PI / 2;
  gridMesh.position.y = -220;
  scene.add(gridMesh);

  // Mouse & Scroll Parallax
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 0.08;
    mouseY = (e.clientY - window.innerHeight / 2) * 0.08;
  }, { passive: true });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);

    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    starField.rotation.y += 0.0006;
    starField.rotation.x += 0.0003;
    gridMesh.position.z = (gridMesh.position.z + 0.4) % 50;

    camera.position.x = targetX * 0.5;
    camera.position.y = -targetY * 0.5;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  animate();
}

// --- Interactive 3D Hero Canvas ---
class Hero3DScene {
  constructor() {
    this.canvas = document.getElementById('hero-3d-canvas');
    this.container = document.getElementById('hero-canvas-container');
    this.fpsDisplay = document.getElementById('canvas-fps');
    if (!this.canvas || !this.container) return;

    this.currentShape = 'backend';
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };
    this.rotationVel = { x: 0.003, y: 0.006 };
    this.zoom = 5;

    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.z = this.zoom;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Spatial Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00f0ff, 3, 20);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x8a2be2, 3, 20);
    pointLight2.position.set(-5, -5, 3);
    this.scene.add(pointLight2);

    // Root model group
    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    this.buildCurrentShape();
    this.attachEvents();
    this.startLoop();
  }

  clearShape() {
    while (this.modelGroup.children.length > 0) {
      const obj = this.modelGroup.children[0];
      this.modelGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
  }

  updateShapeInfo(title, desc) {
    const titleEl = document.getElementById('shape-tech-title');
    const descEl = document.getElementById('shape-tech-desc');
    if (titleEl) titleEl.innerHTML = title;
    if (descEl) descEl.innerHTML = desc;
  }

  buildCurrentShape() {
    this.clearShape();

    switch (this.currentShape) {
      case 'backend':
      case 'core':
        this.buildCyberCore();
        this.updateShapeInfo('⚡ Backend Engine', 'Python &bull; Java &bull; Sockets &bull; APIs');
        break;
      case 'frontend':
      case 'torus':
        this.buildTorusKnot();
        this.updateShapeInfo('⚛️ Frontend &amp; Web', 'React.js &bull; HTML5/CSS3 &bull; Modern UI');
        break;
      case 'database':
      case 'matrix':
        this.buildNeuralWeb();
        this.updateShapeInfo('🗄️ Relational Database', 'PostgreSQL &bull; MySQL &bull; Supabase');
        break;
      case 'mobile':
      case 'shield':
        this.buildCyberShield();
        this.updateShapeInfo('📱 Mobile Applications', 'React Native &bull; Expo &bull; GPS Telemetry');
        break;
      default:
        this.buildCyberCore();
        this.updateShapeInfo('⚡ Backend Engine', 'Python &bull; Java &bull; Sockets');
    }
  }

  buildCyberCore() {
    // Inner glowing sphere
    const innerGeo = new THREE.IcosahedronGeometry(0.85, 2);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: true,
      emissive: 0x005577,
      emissiveIntensity: 0.6
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    this.modelGroup.add(innerMesh);

    // Outer Geodesic Cage
    const outerGeo = new THREE.IcosahedronGeometry(1.4, 1);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x8a2be2,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    this.modelGroup.add(outerMesh);

    // Gimbal Ring 1
    const ringGeo1 = new THREE.TorusGeometry(1.8, 0.02, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    this.modelGroup.add(ring1);

    // Gimbal Ring 2
    const ringGeo2 = new THREE.TorusGeometry(2.0, 0.018, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    this.modelGroup.add(ring2);

    // Floating data particles around core
    const pCount = 120;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const radius = 1.6 + Math.random() * 0.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = radius * Math.cos(phi);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.06,
      blending: THREE.AdditiveBlending
    });
    const pMesh = new THREE.Points(pGeo, pMat);
    this.modelGroup.add(pMesh);
  }

  buildTorusKnot() {
    const knotGeo = new THREE.TorusKnotGeometry(1.1, 0.35, 128, 32, 2, 3);
    const knotMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      wireframe: true,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.5
    });
    const knotMesh = new THREE.Mesh(knotGeo, knotMat);
    this.modelGroup.add(knotMesh);

    // Inner glowing sphere
    const coreGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff007f, wireframe: true });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.modelGroup.add(coreMesh);
  }

  buildNeuralWeb() {
    // Network nodes
    const nodeCount = 50;
    const positions = [];
    const nodeGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const nodeMat = new THREE.MeshStandardMaterial({ color: 0x00ff9d, emissive: 0x00ff9d, emissiveIntensity: 0.6 });

    for (let i = 0; i < nodeCount; i++) {
      const x = (Math.random() - 0.5) * 3;
      const y = (Math.random() - 0.5) * 3;
      const z = (Math.random() - 0.5) * 3;
      positions.push(new THREE.Vector3(x, y, z));
      const sphere = new THREE.Mesh(nodeGeo, nodeMat);
      sphere.position.set(x, y, z);
      this.modelGroup.add(sphere);
    }

    // Connect close nodes with lines
    const linePositions = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (positions[i].distanceTo(positions[j]) < 1.3) {
          linePositions.push(positions[i].x, positions[i].y, positions[i].z);
          linePositions.push(positions[j].x, positions[j].y, positions[j].z);
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.4 });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    this.modelGroup.add(lines);
  }

  buildCyberShield() {
    // Octahedron with layered defensive shields
    const octGeo = new THREE.OctahedronGeometry(1.3, 1);
    const octMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      wireframe: true,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.4
    });
    const octMesh = new THREE.Mesh(octGeo, octMat);
    this.modelGroup.add(octMesh);

    // Inner diamond core
    const innerGeo = new THREE.OctahedronGeometry(0.7, 0);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x059669,
      emissiveIntensity: 0.7
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    this.modelGroup.add(innerMesh);

    // Defensive orbit ring
    const ringGeo = new THREE.TorusGeometry(1.9, 0.03, 16, 80);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.2;
    this.modelGroup.add(ringMesh);
  }

  setShape(shapeName) {
    if (this.currentShape === shapeName) return;
    this.currentShape = shapeName;
    this.buildCurrentShape();
    sound.playCyberBlip();
  }

  attachEvents() {
    // Drag rotation
    this.container.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.prevMouse.x;
        const deltaY = e.clientY - this.prevMouse.y;
        this.rotationVel.y = deltaX * 0.008;
        this.rotationVel.x = deltaY * 0.008;
        this.prevMouse = { x: e.clientX, y: e.clientY };
      }
    });

    // Touch support for mobile
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - this.prevMouse.x;
        const deltaY = e.touches[0].clientY - this.prevMouse.y;
        this.rotationVel.y = deltaX * 0.008;
        this.rotationVel.x = deltaY * 0.008;
        this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    // Wheel zoom
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom += e.deltaY * 0.004;
      this.zoom = Math.max(3.2, Math.min(8.0, this.zoom));
      this.camera.position.z = this.zoom;
    }, { passive: false });

    // Click pulse
    this.container.addEventListener('click', () => {
      sound.playCyberBlip();
      // temporary quick spin
      this.rotationVel.y += 0.05;
    });

    // Resize
    window.addEventListener('resize', () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });

    // Shape buttons
    const shapeBtns = document.querySelectorAll('.shape-btn');
    shapeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        shapeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const shape = btn.getAttribute('data-shape');
        this.setShape(shape);
      });
    });
  }

  startLoop() {
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();

    const loop = (currentTime) => {
      requestAnimationFrame(loop);

      frameCount++;
      if (currentTime - fpsTimer >= 1000) {
        if (this.fpsDisplay) {
          this.fpsDisplay.textContent = `${frameCount} FPS`;
        }
        frameCount = 0;
        fpsTimer = currentTime;
      }

      // Smooth inertia rotation
      this.modelGroup.rotation.y += this.rotationVel.y;
      this.modelGroup.rotation.x += this.rotationVel.x;

      if (!this.isDragging) {
        // Damping back to baseline subtle rotation
        this.rotationVel.y += (0.006 - this.rotationVel.y) * 0.04;
        this.rotationVel.x += (0.002 - this.rotationVel.x) * 0.04;
      }

      this.renderer.render(this.scene, this.camera);
    };

    requestAnimationFrame(loop);
  }
}

// --- Typing Subtitle Carousel ---
function initTypingText() {
  const target = document.getElementById('typing-text');
  if (!target) return;

  const roles = [
    "Software Developer & Engineer",
    "Backend & Systems Specialist",
    "Full-Stack Web & Mobile Developer",
    "Python, Java & SQL Developer",
    "Cybersecurity Enthusiast"
  ];

  let roleIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let delay = 100;

  function type() {
    const current = roles[roleIdx];
    if (isDeleting) {
      target.textContent = current.substring(0, charIdx - 1);
      charIdx--;
      delay = 45;
    } else {
      target.textContent = current.substring(0, charIdx + 1);
      charIdx++;
      delay = 90;
    }

    if (!isDeleting && charIdx === current.length) {
      isDeleting = true;
      delay = 2000; // Hold at full text
    } else if (isDeleting && charIdx === 0) {
      isDeleting = false;
      roleIdx = (roleIdx + 1) % roles.length;
      delay = 400;
    }

    setTimeout(type, delay);
  }

  type();
}

// --- Interactive Cyber Hacker Terminal (CLI) ---
class CyberTerminal {
  constructor() {
    this.input = document.getElementById('terminal-input');
    this.output = document.getElementById('terminal-output');
    this.btn = document.getElementById('terminal-submit-btn');
    this.history = [];
    this.historyIndex = -1;

    if (!this.input || !this.output) return;

    this.commands = {
      help: () => `
<div class="text-cyan-400 font-bold mb-1">AVAILABLE COMMANDS:</div>
<table class="w-full text-xs">
  <tr><td class="text-yellow-400 w-28">about</td><td class="text-gray-300">Display candidate summary, education & focus areas</td></tr>
  <tr><td class="text-yellow-400">skills</td><td class="text-gray-300">Inspect full technical proficiencies and stacks</td></tr>
  <tr><td class="text-yellow-400">projects</td><td class="text-gray-300">View real-world projects: SafeHer, ERP, SecureChat</td></tr>
  <tr><td class="text-yellow-400">experience</td><td class="text-gray-300">Cognifyz & InternzLearn internship reviews</td></tr>
  <tr><td class="text-yellow-400">certifications</td><td class="text-gray-300">List Cisco, Prodigy Infotech, HackerRank credentials</td></tr>
  <tr><td class="text-yellow-400">contact</td><td class="text-gray-300">Get direct email, phone, LinkedIn, and GitHub links</td></tr>
  <tr><td class="text-yellow-400">resume</td><td class="text-gray-300">Open interactive printable CV modal</td></tr>
  <tr><td class="text-yellow-400">matrix</td><td class="text-emerald-400">Initiate Matrix Digital Cyber Rain effect</td></tr>
  <tr><td class="text-yellow-400">sudo</td><td class="text-gray-300">Run privileged administrative command</td></tr>
  <tr><td class="text-yellow-400">clear</td><td class="text-gray-300">Clear terminal screen</td></tr>
</table>
      `,
      about: () => `
<div class="space-y-1.5">
  <div class="text-cyan-400 font-bold">[PROFILE SUMMARY]</div>
  <div><span class="text-white font-semibold">Name:</span> Narasimman P</div>
  <div><span class="text-white font-semibold">Role:</span> Software Developer</div>
  <div><span class="text-white font-semibold">Degree:</span> Final-year B.E. Computer Science &amp; Engineering (7.3 CGPA)</div>
  <div><span class="text-white font-semibold">Institution:</span> SCAD College of Engineering and Technology, Tirunelveli</div>
  <div><span class="text-white font-semibold">Focus Areas:</span> Software Development, Backend Technologies, Secure Systems, AI/Automation</div>
  <div class="text-gray-300 mt-2">Passionate about building practical solutions, learning new technologies, and contributing to real-world software projects.</div>
</div>
      `,
      skills: () => `
<div class="space-y-2">
  <div class="text-cyan-400 font-bold">[TECHNICAL ARSENAL]</div>
  <div><span class="text-yellow-400">Languages:</span> Python, Java, HTML, CSS, SQL</div>
  <div><span class="text-yellow-400">Developer Tools:</span> VS Code, Eclipse, Android Studio, Github Copilot, MySQL</div>
  <div><span class="text-yellow-400">Frameworks/Technologies:</span> React Native, Expo, Firebase, Linux, Git, PostgreSQL</div>
  <div><span class="text-yellow-400">AI/Automation:</span> Claude API, MCP (Model Context Protocol), Playwright, Selenium, n8n, Prompt Engineering</div>
</div>
      `,
      projects: () => `
<div class="space-y-3">
  <div class="text-cyan-400 font-bold">[FEATURED ENGINEERING PROJECTS]</div>
  <div class="p-2.5 rounded-lg bg-white/5 border border-white/10">
    <div class="text-pink-400 font-bold">1. SafeHer - Women Safety Application (Hackathon)</div>
    <div class="text-cyan-300 text-xs font-mono">Stack: React Native, Expo, Supabase, GPS integration, MySQL, MCP | March 2026</div>
    <div class="text-gray-300 text-xs mt-1">&bull; Real-time location sharing and instant SOS alerts.</div>
    <div class="text-gray-300 text-xs">&bull; Danger-zone tracking &amp; emergency contact management, reducing response time by 3 seconds.</div>
    <div class="text-gray-300 text-xs">&bull; MCP integration for contextual smart replies and dynamic tool integrations.</div>
  </div>
  <div class="p-2.5 rounded-lg bg-white/5 border border-white/10">
    <div class="text-cyan-400 font-bold">2. ERP Attendance Management System (College Academic Project)</div>
    <div class="text-cyan-300 text-xs font-mono">Stack: React.js, Firebase, PostgreSQL, MCP | April 2026</div>
    <div class="text-gray-300 text-xs mt-1">&bull; Automated student attendance tracking with RBAC (Admin, Faculty, Students).</div>
    <div class="text-gray-300 text-xs">&bull; Built automated percentage calculation &amp; report generation serving 180+ users.</div>
    <div class="text-gray-300 text-xs">&bull; Leveraged MCP to securely fetch real-time student records across databases.</div>
  </div>
  <div class="p-2.5 rounded-lg bg-white/5 border border-white/10">
    <div class="text-emerald-400 font-bold">3. SecureChat - Secure Communication Application</div>
    <div class="text-cyan-300 text-xs font-mono">Stack: IndexedDB, AES-256, React, Tailwind CSS, MCP | Nov 2025</div>
    <div class="text-gray-300 text-xs mt-1">&bull; End-to-end encrypted messaging with AES-256 and client-side IndexedDB storage.</div>
    <div class="text-gray-300 text-xs">&bull; Engineered reliable message handling protecting data privacy across conversations.</div>
    <div class="text-gray-300 text-xs">&bull; Utilized MCP architecture for secure communication protocols and tool context.</div>
  </div>
</div>
      `,
      experience: () => `
<div class="space-y-3">
  <div class="text-cyan-400 font-bold">[INTERNSHIPS & PROFESSIONAL ROLES]</div>
  <div>
    <div class="text-white font-semibold">1. Software Development Internship &bull; <span class="text-cyan-400">Cognifyz Technologies</span></div>
    <div class="text-xs text-gray-400">January 2026 – February 2026 &bull; Remote Nagpur, Maharashtra</div>
    <div class="text-xs text-gray-300 mt-1">&bull; Engineered software solutions in Python and Java on schedule.</div>
    <div class="text-xs text-gray-300">&bull; Debugged issues, optimized code, applying version control &amp; best practices.</div>
    <div class="text-xs text-gray-300">&bull; Automated daily test-result reporting and visualization using Python.</div>
  </div>
  <div class="pt-2 border-t border-white/10">
    <div class="text-white font-semibold">2. Cyber Security Internship &bull; <span class="text-indigo-400">InternzLearn</span></div>
    <div class="text-xs text-gray-400">March 2025 – April 2025 &bull; Remote Bengaluru, Karnataka</div>
    <div class="text-xs text-gray-300 mt-1">&bull; Analyzed network security fundamentals, common threats &amp; attack vectors.</div>
    <div class="text-xs text-gray-300">&bull; Conducted vulnerability assessments and applied system protection best practices.</div>
    <div class="text-xs text-gray-300">&bull; Evaluated web application exposure to cyber risks and applied secure coding.</div>
  </div>
</div>
      `,
      certifications: () => `
<div class="space-y-2">
  <div class="text-amber-400 font-bold">[HONORS & CREDENTIALS]</div>
  <div>🏆 <span class="text-white font-semibold">Outstanding Technical Achiever:</span> SCAD College of Engineering & Tech (Spring 2025)</div>
  <div>📜 <span class="text-white font-semibold">Python Essentials 1:</span> Cisco Networking Academy</div>
  <div>📜 <span class="text-white font-semibold">Web Development:</span> Prodigy Infotech</div>
  <div>📜 <span class="text-white font-semibold">Python Basics:</span> HackerRank Certified</div>
</div>
      `,
      contact: () => `
<div class="space-y-1.5">
  <div class="text-cyan-400 font-bold">[TRANSMISSION CHANNELS]</div>
  <div>✉️ Email: <a href="mailto:pnarasimman26@gmail.com" class="text-cyan-300 underline">pnarasimman26@gmail.com</a></div>
  <div>📞 Phone: <span class="text-white">+91 8526824759</span></div>
  <div>💼 LinkedIn: <a href="https://linkedin.com/in/narasimman" target="_blank" class="text-cyan-300 underline">linkedin.com/narasimman</a></div>
  <div>🐙 GitHub: <a href="https://github.com/Narasimman" target="_blank" class="text-cyan-300 underline">github.com/Narasimman</a></div>
  <div>📍 Location: <span class="text-gray-300">Tirunelveli, Tamil Nadu, India</span></div>
</div>
      `,
      resume: () => {
        document.getElementById('btn-open-resume')?.click();
        return `<div class="text-emerald-400">✓ Opening interactive CV modal...</div>`;
      },
      sudo: () => `
<div class="text-red-400">
  [SECURITY ALERT] User 'guest' is not in the sudoers file.<br>
  This incident has been logged and reported to Narasimman's security daemon. 🛡️
</div>
      `,
      matrix: () => {
        startMatrixRain();
        return `<div class="text-emerald-400">⚡ Initializing Matrix Rain simulation... Enjoy the terminal stream!</div>`;
      },
      clear: () => {
        this.output.innerHTML = '';
        return '';
      },
      date: () => `<div>${new Date().toString()}</div>`,
      quote: () => {
        const quotes = [
          "“There are only two kinds of companies: those that have been hacked, and those that will be.” — Robert Mueller",
          "“Security is always excessive until it's not enough.” — Robbie Sinclair",
          "“Simplicity is prerequisite for reliability.” — Edsger W. Dijkstra"
        ];
        return `<div class="text-cyan-300 italic">${quotes[Math.floor(Math.random() * quotes.length)]}</div>`;
      }
    };

    this.attach();
  }

  attach() {
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleCommand(this.input.value.trim());
      } else if (e.key === 'ArrowUp') {
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.input.value = this.history[this.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.input.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = this.history.length;
          this.input.value = '';
        }
      }
    });

    if (this.btn) {
      this.btn.addEventListener('click', () => {
        this.handleCommand(this.input.value.trim());
      });
    }

    // Quick Command Chips
    const chips = document.querySelectorAll('.cmd-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        this.input.value = cmd;
        this.handleCommand(cmd);
      });
    });
  }

  handleCommand(cmdRaw) {
    if (!cmdRaw) return;
    sound.playClick();
    const cmd = cmdRaw.toLowerCase();
    this.history.push(cmdRaw);
    this.historyIndex = this.history.length;

    // Render User Input Line
    const line = document.createElement('div');
    line.className = 'font-mono text-sm';
    line.innerHTML = `<span class="text-accent font-bold">narasimman@portfolio:~$</span> <span class="text-white">${escapeHtml(cmdRaw)}</span>`;
    this.output.appendChild(line);

    // Render Command Output
    const responseLine = document.createElement('div');
    responseLine.className = 'text-xs text-slate-300 pl-4 border-l border-[var(--color-border)] my-2';

    if (this.commands[cmd]) {
      const result = this.commands[cmd]();
      if (result) {
        responseLine.innerHTML = result;
        this.output.appendChild(responseLine);
      }
    } else {
      responseLine.innerHTML = `<span class="text-red-400">Command not found: '${escapeHtml(cmdRaw)}'. Type <span class="text-yellow-400 font-bold cursor-pointer" onclick="document.getElementById('terminal-input').value='help';document.getElementById('terminal-submit-btn').click();">'help'</span> for a list of commands.</span>`;
      this.output.appendChild(responseLine);
    }

    this.input.value = '';
    this.output.scrollTop = this.output.scrollHeight;
  }
}

// Matrix Rain Easter Egg
function startMatrixRain() {
  sound.playCyberBlip();
  const canvas = document.createElement('canvas');
  canvas.id = 'matrix-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.zIndex = '99999';
  canvas.style.pointerEvents = 'auto';
  canvas.style.cursor = 'pointer';
  canvas.title = 'Click anywhere to exit Matrix Rain';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const letters = '01NARASIMMANPCYBERSECURITY2026PYTHONJAVASQLSCADCET';
  const fontSize = 16;
  const columns = canvas.width / fontSize;
  const drops = Array.from({ length: columns }, () => 1);

  let active = true;

  function draw() {
    if (!active) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ff9d';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const text = letters.charAt(Math.floor(Math.random() * letters.length));
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }

    requestAnimationFrame(draw);
  }

  draw();

  canvas.addEventListener('click', () => {
    active = false;
    canvas.remove();
  });

  setTimeout(() => {
    if (document.getElementById('matrix-canvas')) {
      active = false;
      canvas.remove();
    }
  }, 12000);
}

// Helper to escape HTML in terminal
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Custom Glow Cursor ---
function initCursor() {
  const dot = document.getElementById('cursor-dot');
  const glow = document.getElementById('cursor-glow');
  if (!dot || !glow) return;

  let mouse = { x: -100, y: -100 };
  let glowPos = { x: -100, y: -100 };

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
  });

  function renderCursor() {
    glowPos.x += (mouse.x - glowPos.x) * 0.18;
    glowPos.y += (mouse.y - glowPos.y) * 0.18;
    glow.style.transform = `translate(${glowPos.x}px, ${glowPos.y}px)`;
    requestAnimationFrame(renderCursor);
  }
  renderCursor();

  // Enlarge cursor on interactive elements
  const interactiveTargets = document.querySelectorAll('a, button, input, textarea, .skill-card, .project-card');
  interactiveTargets.forEach(el => {
    el.addEventListener('mouseenter', () => {
      glow.style.width = '55px';
      glow.style.height = '55px';
      glow.style.borderColor = 'var(--color-accent)';
    });
    el.addEventListener('mouseleave', () => {
      glow.style.width = '38px';
      glow.style.height = '38px';
      glow.style.borderColor = 'var(--color-border-hover)';
    });
  });
}

// --- Skills Filter Tabs ---
function initSkillsFilter() {
  const filterBtns = document.querySelectorAll('.skill-filter-btn');
  const skillCards = document.querySelectorAll('.skill-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playClick();
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.getAttribute('data-category');
      skillCards.forEach(card => {
        const cardCat = card.getAttribute('data-category');
        if (cat === 'all' || cardCat === cat) {
          card.style.display = 'block';
          card.style.animation = 'fadeIn 0.3s ease';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// --- Project Architecture Modal Logic ---
const projectData = {
  safeher: {
    icon: '🛡️',
    title: 'SafeHer - Women Safety Application (Hackathon)',
    subtitle: 'React Native, Expo, Supabase, GPS integration, MySQL, MCP | March 2026',
    content: `
      <div class="space-y-4">
        <div>
          <h4 class="text-base font-bold text-white mb-1">Overview &amp; Problem Solved</h4>
          <p class="text-gray-300 text-sm">
            Architected a mobile safety app delivering real-time location sharing and instant SOS alerts. Integrated emergency contact management, danger-zone tracking, and quick-alert features, reducing emergency response time by 3 seconds.
          </p>
        </div>

        <div class="p-4 rounded-[6px] bg-[#07090e] border border-[var(--color-border)] font-mono text-xs space-y-2">
          <div class="text-accent font-bold uppercase tracking-wider">// ARCHITECTURAL FLOW (WITH MCP PROTOCOL)</div>
          <div class="text-slate-300">
            [User / Mobile Device] &rarr; (GPS Native Sensor) &rarr; [Location Telemetry Stream]<br>
            &emsp;&emsp;&darr;<br>
            [MCP Smart Engine] &rarr; Contextual Smart Replies &amp; Dynamic Emergency Safety Tools<br>
            &emsp;&emsp;&darr;<br>
            [Supabase Real-Time Engine] &rarr; Instant WebSocket Dispatch (Reduced Response Time by 3s)<br>
            &emsp;&emsp;&darr;<br>
            [MySQL Persistence Store] &rarr; Danger Zone Geofencing &amp; Historic Audit Logs
          </div>
        </div>

        <div>
          <h4 class="text-base font-bold text-white mb-2">Key Technical Implementations</h4>
          <ul class="list-disc list-inside text-sm text-slate-300 space-y-1.5">
            <li><strong>Real-Time Location Sharing &amp; SOS:</strong> Rapid trigger sending live GPS coordinates directly to predefined emergency contacts.</li>
            <li><strong>Danger-Zone Tracking:</strong> Real-time proximity calculation alerting users near danger zones, cutting response time by 3 seconds.</li>
            <li><strong>Secure Authentication &amp; DB:</strong> Secured user authentication and database management using Supabase and MySQL.</li>
            <li><strong>MCP Integration:</strong> Integrated Model Context Protocol to enable contextual smart replies and dynamic tool integrations for safety users.</li>
          </ul>
        </div>
      </div>
    `
  },
  erp: {
    icon: '📊',
    title: 'ERP Attendance Management System (College Academic Project)',
    subtitle: 'React.js, Firebase, PostgreSQL, MCP | April 2026',
    content: `
      <div class="space-y-4">
        <div>
          <h4 class="text-base font-bold text-white mb-1">Overview &amp; Problem Solved</h4>
          <p class="text-slate-300 text-sm">
            Developed an ERP-based attendance management system to automate student attendance tracking and eliminate manual paper record-keeping across academic departments, serving 180+ users.
          </p>
        </div>

        <div class="p-4 rounded-[6px] bg-[#07090e] border border-[var(--color-border)] font-mono text-xs space-y-2">
          <div class="text-accent font-bold uppercase tracking-wider">// ACCESS ROLES &amp; MCP PROTOCOL ARCHITECTURE</div>
          <div class="text-slate-300">
            &bull; <strong class="text-white">Admin Module:</strong> Semester configuration, faculty assignment, institutional audit reports.<br>
            &bull; <strong class="text-white">Faculty Module:</strong> Daily period attendance marking, student status modification, leave approval.<br>
            &bull; <strong class="text-white">Student Portal:</strong> Live attendance percentage tracker, shortage alerts, subject analytics.<br>
            &bull; <strong class="text-accent">MCP Connectivity:</strong> Secure cross-database student records fetching and automated tool execution.
          </div>
        </div>

        <div>
          <h4 class="text-base font-bold text-white mb-2">Key Technical Implementations</h4>
          <ul class="list-disc list-inside text-sm text-slate-300 space-y-1.5">
            <li><strong>Automated Percentage Calculation:</strong> Automated attendance calculation and report generation serving 180+ active users.</li>
            <li><strong>Role-Based Access Control (RBAC):</strong> Strict permission boundaries for Admin, Faculty, and Students.</li>
            <li><strong>PostgreSQL Relational Schema:</strong> Robust normalization connecting student rosters, class sessions, and faculty assignments.</li>
            <li><strong>MCP Integration:</strong> Leveraged Model Context Protocol to securely connect and fetch real-time student records across databases and external automated tools.</li>
          </ul>
        </div>
      </div>
    `
  },
  securechat: {
    icon: '🔐',
    title: 'SecureChat - Secure Communication Application',
    subtitle: 'IndexedDB, AES-256, React, Tailwind CSS, MCP | November 2025',
    content: `
      <div class="space-y-4">
        <div>
          <h4 class="text-base font-bold text-white mb-1">Overview &amp; Problem Solved</h4>
          <p class="text-slate-300 text-sm">
            Engineered an end-to-end encrypted real-time messaging platform using AES-256 with secure authentication and encrypted message persistence stored locally via IndexedDB.
          </p>
        </div>

        <div class="p-4 rounded-[6px] bg-[#07090e] border border-[var(--color-border)] font-mono text-xs space-y-2">
          <div class="text-accent font-bold uppercase tracking-wider">// CRYPTOGRAPHIC &amp; MCP PIPELINE</div>
          <div class="text-slate-300">
            [React + Tailwind UI] &rarr; Client-side AES-256 encryption &rarr; [Encrypted Payload]<br>
            &emsp;&emsp;&darr;<br>
            [IndexedDB Storage] &rarr; Secure client-side persistent storage with cryptographic hashing<br>
            &emsp;&emsp;&darr;<br>
            [MCP Architecture] &rarr; Seamless secure communication protocols &amp; tool context between users<br>
            &emsp;&emsp;&darr;<br>
            [Encrypted Messaging Stream] &rarr; Zero-knowledge delivery preserving end-to-end user privacy
          </div>
        </div>

        <div>
          <h4 class="text-base font-bold text-white mb-2">Key Technical Implementations</h4>
          <ul class="list-disc list-inside text-sm text-slate-300 space-y-1.5">
            <li><strong>AES-256 End-to-End Encryption:</strong> Complete cryptographic data security ensuring zero-knowledge message secrecy.</li>
            <li><strong>IndexedDB Encrypted Persistence:</strong> Secure authentication and encrypted message storage directly in IndexedDB.</li>
            <li><strong>Reliable Message Handling:</strong> High-integrity message transmission engineered to protect data privacy across conversations.</li>
            <li><strong>MCP Architecture:</strong> Utilized Model Context Protocol architecture to seamlessly handle secure communication protocols and manage tool context between users.</li>
          </ul>
        </div>
      </div>
    `
  }
};

window.openProjectModal = function(projectId) {
  const modal = document.getElementById('project-modal');
  const data = projectData[projectId];
  if (!modal || !data) return;

  sound.playClick();
  document.getElementById('modal-icon').textContent = data.icon;
  document.getElementById('modal-title').textContent = data.title;
  document.getElementById('modal-subtitle').textContent = data.subtitle;
  document.getElementById('modal-body').innerHTML = data.content;

  modal.classList.remove('hidden');
};

window.closeProjectModal = function() {
  const modal = document.getElementById('project-modal');
  if (modal) modal.classList.add('hidden');
};

// --- Resume Modal Logic ---
function initResumeModal() {
  const resumeModal = document.getElementById('resume-modal');
  const openBtn = document.getElementById('btn-open-resume');
  const openBtnMobile = document.getElementById('btn-open-resume-mobile');
  const closeBtn = document.getElementById('resume-close-btn');
  const printBtn = document.getElementById('btn-print-resume');

  const open = () => {
    sound.playClick();
    if (resumeModal) resumeModal.classList.remove('hidden');
  };

  const close = () => {
    if (resumeModal) resumeModal.classList.add('hidden');
  };

  if (openBtn) openBtn.addEventListener('click', open);
  if (openBtnMobile) openBtnMobile.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      sound.playClick();
      window.print();
    });
  }

  // Close modals on backdrop click or ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeProjectModal();
      close();
    }
  });

  const pModal = document.getElementById('project-modal');
  if (pModal) {
    pModal.addEventListener('click', (e) => {
      if (e.target === pModal) window.closeProjectModal();
    });
  }

  const pCloseBtn = document.getElementById('modal-close-btn');
  if (pCloseBtn) {
    pCloseBtn.addEventListener('click', () => window.closeProjectModal());
  }

  if (resumeModal) {
    resumeModal.addEventListener('click', (e) => {
      if (e.target === resumeModal) close();
    });
  }
}

// --- Clipboard Copy Helper ---
window.copyToClipboard = function(text, successMessage) {
  sound.playClick();
  navigator.clipboard.writeText(text).then(() => {
    sound.showToast(`✓ ${successMessage}`);
  }).catch(() => {
    sound.showToast(`Copied: ${text}`);
  });
};

// --- Contact Form Submission ---
window.handleContactSubmit = function(e) {
  e.preventDefault();
  sound.playClick();

  const name = document.getElementById('sender-name').value;
  const email = document.getElementById('sender-email').value;
  const subject = document.getElementById('sender-subject').value || 'Portfolio Contact Inquiry';
  const message = document.getElementById('sender-message').value;

  // Trigger celebration confetti
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#00f0ff', '#6366f1', '#10b981', '#ffffff']
  });

  sound.showToast('🚀 Transmission Sent! Thank you, Narasimman will respond shortly.');

  // Pre-generate mailto link fallback
  const mailtoUrl = `mailto:pnarasimman26@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`From: ${name} (${email})\n\n${message}`)}`;
  
  setTimeout(() => {
    const confirmSend = window.confirm("Message recorded! Would you like to also open your email client to send this directly to pnarasimman26@gmail.com?");
    if (confirmSend) {
      window.location.href = mailtoUrl;
    }
  }, 1000);

  document.getElementById('contact-form').reset();
};

// --- Mobile Navigation Drawer ---
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    sound.playClick();
    menu.classList.toggle('hidden');
  });

  const links = menu.querySelectorAll('a, button');
  links.forEach(l => {
    l.addEventListener('click', () => {
      menu.classList.add('hidden');
    });
  });
}

// --- Sound Toggle Button in Nav ---
function initSoundToggle() {
  const btn = document.getElementById('sound-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => sound.toggle());
}

// --- Theme Toggle (Black & White / Accent) ---
function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('np_portfolio_theme') || 'bw';
  if (saved === 'accent') {
    document.documentElement.setAttribute('data-theme', 'accent');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  if (!btn) return;
  btn.addEventListener('click', () => {
    const isAccent = document.documentElement.getAttribute('data-theme') === 'accent';
    if (isAccent) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('np_portfolio_theme', 'bw');
      if (typeof sound !== 'undefined') sound.playClick();
    } else {
      document.documentElement.setAttribute('data-theme', 'accent');
      localStorage.setItem('np_portfolio_theme', 'accent');
      if (typeof sound !== 'undefined') sound.playClick();
    }
  });
}

// --- Initialize Everything On DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initSoundToggle();
  initBackgroundCanvas();
  new Hero3DScene();
  initTypingText();
  new CyberTerminal();
  initCursor();
  initSkillsFilter();
  initResumeModal();
  initMobileMenu();

  // Update dynamic year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
