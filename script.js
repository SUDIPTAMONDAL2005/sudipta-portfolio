import * as THREE from 'three';

/* Split the name into letters for the one-time intro animation */
const name = document.getElementById('name');
[...name.textContent].forEach((c, i) => {
  const s = document.createElement('span');
  s.className = 'ch';
  s.setAttribute('aria-hidden', 'true');
  s.textContent = c === ' ' ? '\u00A0' : c;
  s.style.animationDelay = 0.05 * i + 's';
  name.appendChild(s);
});
name.firstChild.remove?.call(name.firstChild); // remove original text node

/* Reveal timeline items on scroll */
const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && (e.target.classList.add('show'), io.unobserve(e.target))), { threshold: 0.2 });
document.querySelectorAll('.tl').forEach(el => io.observe(el));

/* 3D tilt on project cards */
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateZ(8px)`;
  });
  card.addEventListener('pointerleave', () => (card.style.transform = ''));
});

/* 3D network scene: a wireframe core (the "vault") inside a drifting node cloud */
const canvas = document.getElementById('scene');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 9;

  const group = new THREE.Group();
  scene.add(group);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.55 }));
  const inner = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), new THREE.MeshBasicMaterial({ color: 0xffb454, wireframe: true, transparent: true, opacity: 0.8 }));
  group.add(core, inner);

  const N = 140, pos = new Float32Array(N * 3), pts = [];
  for (let i = 0; i < N; i++) {
    const r = 3.5 + Math.random() * 5, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
    const v = new THREE.Vector3(r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p));
    pts.push(v); pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  group.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe8f0ff, size: 0.07, transparent: true, opacity: 0.9 })));

  const seg = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (pts[i].distanceTo(pts[j]) < 1.9) seg.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  group.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22 })));

  let mx = 0, my = 0, scroll = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  addEventListener('scroll', () => { scroll = scrollY / Math.max(1, document.body.scrollHeight - innerHeight); }, { passive: true });

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    group.position.x = innerWidth > 800 ? 3 : 0; // sit right of the headline on wide screens
  };
  addEventListener('resize', resize); resize();

  const clock = new THREE.Clock();
  const frame = () => {
    const t = reduce ? 0 : clock.getElapsedTime();
    core.rotation.set(t * 0.15, t * 0.2, 0);
    inner.rotation.set(-t * 0.4, t * 0.3, 0);
    inner.scale.setScalar(1 + Math.sin(t * 1.5) * 0.06);
    group.rotation.y += ((mx * 1.2 + scroll * Math.PI * 2 + t * 0.05) - group.rotation.y) * 0.05;
    group.rotation.x += ((my * 0.8) - group.rotation.x) * 0.05;
    camera.position.z = 9 + scroll * 3;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  frame();
} catch (e) {
  console.warn('WebGL unavailable, showing static background.', e);
}
