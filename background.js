// Bouncing particles. Mouse: hold left button to attract, right click to repel.
// Touch: hold to attract, double-tap to repel. Only the background reacts, not the nav or the panel.
const W = () => window.innerWidth;
const H = () => window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(W() / -2, W() / 2, H() / 2, H() / -2, 0.1, 1000);
camera.position.z = 1;
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('webgl-background'),
    antialias: true,
    alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(W(), H());
renderer.setClearColor(0x000000, 0);

// Soft round sprite, tinted by the material color
function glowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
}

// Same density on every screen size, at most 500 particles
const particleCount = Math.min(500, Math.round(W() * H() / 2600));
const particles = [];
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
    particles.push({
        position: new THREE.Vector3(Math.random() * W() - W() / 2, Math.random() * H() - H() / 2, 0),
        velocity: new THREE.Vector3(Math.random() * 5 - 2.5, Math.random() * 5 - 2.5, 0),
    });
}
const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const particleMaterial = new THREE.PointsMaterial({
    size: 75,
    map: glowTexture(),
    transparent: true,
    depthWrite: false,
});
scene.add(new THREE.Points(particleGeometry, particleMaterial));

// Follow the site theme: accent color, glowing (additive) on dark, plain on light
function applyTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    particleMaterial.color.set(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    particleMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    particleMaterial.opacity = 0.6;
    particleMaterial.needsUpdate = true;
}
applyTheme();
window.addEventListener('themechange', applyTheme);

// Interaction
let attractMode = false;
let repelMode = false;
let pointerX = 0, pointerY = 0;   // in scene coordinates (origin at screen center)

const isBackground = target => !target.closest('nav, .content');
function setPointer(clientX, clientY) {
    pointerX = clientX - W() / 2;
    pointerY = H() / 2 - clientY;
}
function repelPulse() {
    repelMode = true;
    setTimeout(() => { repelMode = false; }, 200);
}

window.addEventListener('mousemove', e => setPointer(e.clientX, e.clientY));
window.addEventListener('mousedown', e => {
    if (e.button === 0 && isBackground(e.target)) attractMode = true;
});
window.addEventListener('mouseup', e => {
    if (e.button === 0) attractMode = false;
});
window.addEventListener('contextmenu', e => {
    if (!isBackground(e.target)) return;
    e.preventDefault();
    setPointer(e.clientX, e.clientY);
    repelPulse();
});

let lastTap = 0;
window.addEventListener('touchstart', e => {
    if (!isBackground(e.target)) return;
    e.preventDefault();  // no scrolling, zooming or long-press menu on the background
    const t = e.touches[0];
    setPointer(t.clientX, t.clientY);
    if (e.timeStamp - lastTap < 300) {
        attractMode = false;
        repelPulse();
    } else {
        attractMode = true;
    }
    lastTap = e.timeStamp;
}, { passive: false });
window.addEventListener('touchmove', e => {
    if (!attractMode) return;
    const t = e.touches[0];
    setPointer(t.clientX, t.clientY);
}, { passive: true });
window.addEventListener('touchend', () => { attractMode = false; });
window.addEventListener('touchcancel', () => { attractMode = false; });

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const halfW = W() / 2, halfH = H() / 2;

    for (let i = 0; i < particles.length; i++) {
        const { position: p, velocity: v } = particles[i];
        const dx = pointerX - p.x;
        const dy = pointerY - p.y;
        const distSq = dx * dx + dy * dy;
        if (attractMode) {
            const force = Math.min(10 / (distSq + 0.1), 10);
            v.x += dx * force;
            v.y += dy * force;
        }
        if (repelMode) {
            const force = Math.min(100 / (distSq + 0.1), 400);
            v.x -= dx * force;
            v.y -= dy * force;
        }

        p.add(v);

        // Bounce off the screen edges (and stay inside, even after a strong push)
        if (p.x > halfW) { p.x = halfW; v.x = -Math.abs(v.x); }
        if (p.x < -halfW) { p.x = -halfW; v.x = Math.abs(v.x); }
        if (p.y > halfH) { p.y = halfH; v.y = -Math.abs(v.y); }
        if (p.y < -halfH) { p.y = -halfH; v.y = Math.abs(v.y); }

        v.multiplyScalar(0.995);   // slow down for a floating effect

        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
    }

    particleGeometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    renderer.setSize(W(), H());
    camera.left = W() / -2;
    camera.right = W() / 2;
    camera.top = H() / 2;
    camera.bottom = H() / -2;
    camera.updateProjectionMatrix();
});
