
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
}
showSection("home")
const navMenu = document.getElementById('nav_menu');
// Basic setup

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 0.6); 
document.body.appendChild(renderer.domElement);

// Load a texture to create a glowing effect
const textureLoader = new THREE.TextureLoader();
//const glowTexture = textureLoader.load('https://imgs.search.brave.com/mo_xJFw-ml97YM8mRgOh7DfwjlSLt353ZUoN5D6-4Zc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9wbHVz/cG5nLmNvbS9pbWct/cG5nL2dsb3ctcG5n/LWdsb3ctcG5nLXBo/b3RvLTQwMy5wbmc');
const glowTexture = textureLoader.load('https://imgs.search.brave.com/DxKw9Lqh2sQPY7QtQpfQzQgtU5ZSLStZ4HEgZOH7o9U/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9mcmVl/cG5naW1nLmNvbS90/aHVtYi9nbG93LzM1/NDM3LTYtZ2xvdy10/cmFuc3BhcmVudC10/aHVtYi5wbmc');


// Particle variables
const particles = [];
const particleCount = 500;  // Number of particles
const particleGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);

// Helper function to create a new particle in 2D
function createParticle(x = Math.random() * window.innerWidth - window.innerWidth / 2,
                        y = Math.random() * window.innerHeight - window.innerHeight / 2) {
    return {
        velocity: new THREE.Vector3(Math.random() * 5 - 2.5, Math.random() * 5 - 2.5, 0),
        position: new THREE.Vector3(x, y, 0)
    };
}

// Initialize particles
for (let i = 0; i < particleCount; i++) {
    particles.push(createParticle());
    positions[i * 3] = particles[i].position.x;
    positions[i * 3 + 1] = particles[i].position.y;
    positions[i * 3 + 2] = particles[i].position.z;
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

// Material to make particles glow like light sources
const particleMaterial = new THREE.PointsMaterial({
    color: 0xf03ff0,  //5e60e9
    size: 75,  // Increase size to make them look like light sources
    map: glowTexture,  // Use a texture for glowing effect
    blending: THREE.AdditiveBlending,  // Additive blending to make particles look like they emit light
    transparent: true,
    depthWrite: false
});

const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particleSystem);

camera.position.z = 1; // Z position is 1 since we are working in 2D space

// Mouse and interaction variables
let attractMode = false;
let repelMode = false;
let mouseX = 0, mouseY = 0;

window.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('mousedown', (event) => {
    // Check if the click is outside the navigation menu
    if (!navMenu.contains(event.target)) {
        if (event.button === 0) { // Left click for attraction
            attractMode = true;
        }
    }
});

window.addEventListener('mouseup', (event) => {
    if (!navMenu.contains(event.target)) {
        if (event.button === 0) { // Left click release
            attractMode = false;
        }
    }
});

window.addEventListener('contextmenu', (event) => {
    if (!navMenu.contains(event.target)) {
        event.preventDefault(); // Prevent context menu on right click
        repelMode = true;
        setTimeout(() => { repelMode = false; }, 200); // Apply repulsion briefly
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update particle positions
    const positions = particleGeometry.attributes.position.array;
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        if (attractMode) {
            const dx = (mouseX * window.innerWidth / 2) - particle.position.x;
            const dy = (mouseY * window.innerHeight / 2) - particle.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = Math.min(10 / (distance*distance + 0.1), 10);
            //const force = Math.max(Math.min(-0.000005*(distance-200), 0.2), 0.0)
            particle.velocity.x += dx * force;
            particle.velocity.y += dy * force;
        }

        if (repelMode) {
            const dx = particle.position.x - (mouseX * window.innerWidth / 2);
            const dy = particle.position.y - (mouseY * window.innerHeight / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            //const force = Math.max(Math.min(-0.00001*(distance-500), 0.7), 0.0); // Stronger force for repulsion
            const force = Math.min(100 / (distance*distance + 0.1), 400);
            particle.velocity.x += dx * force;
            particle.velocity.y += dy * force;
        }

        // Update positions and apply velocities
        particle.position.add(particle.velocity);

        // Bound particles within screen edges
        if (particle.position.x > window.innerWidth / 2 || particle.position.x < -window.innerWidth / 2) {
            particle.velocity.x *= -1; // Reverse direction when hitting a vertical boundary
        }
        if (particle.position.y > window.innerHeight / 2 || particle.position.y < -window.innerHeight / 2) {
            particle.velocity.y *= -1; // Reverse direction when hitting a horizontal boundary
        }

        // Slow down velocity for a floating effect
        particle.velocity.multiplyScalar(0.995);

        // Update the position array
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = 0; // Z axis remains 0 to keep it 2D
    }

    particleGeometry.attributes.position.needsUpdate = true;

    // Clear the canvas with a transparent background to create motion blur
    renderer.clear();
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.left = window.innerWidth / -2;
    camera.right = window.innerWidth / 2;
    camera.top = window.innerHeight / 2;
    camera.bottom = window.innerHeight / -2;
    camera.updateProjectionMatrix();
});