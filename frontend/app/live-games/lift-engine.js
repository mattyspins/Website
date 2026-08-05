import * as THREE from 'three';

// Pure presentation layer for the LIFT stream game. All game logic (phases,
// eliminations, round math) is server-authoritative — this file only ever
// reacts to `applySnapshot(snapshot)` calls fed by the real-time socket feed
// in page.tsx. It owns: avatar/elevator meshes, door open/close tweens, the
// "run to lift" position-lerp animation, explosion-on-elimination effects,
// and camera framing per phase.

function rand(a, b) { return Math.random() * (b - a) + a; }
function lerp(a, b, t) { return a + (b - a) * t; }

const CLAY = 0xEDE8DE;

function makeAvatar(seed) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: CLAY, roughness: 0.95, metalness: 0.02 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), mat);
  head.position.y = 1.42;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.42, 4, 10), mat);
  torso.position.y = 0.95;
  const hipL = new THREE.Object3D(); hipL.position.set(-0.09, 0.62, 0);
  const hipR = new THREE.Object3D(); hipR.position.set(0.09, 0.62, 0);
  const legGeo = new THREE.CapsuleGeometry(0.08, 0.55, 4, 8);
  const legL = new THREE.Mesh(legGeo, mat); legL.position.y = -0.28; hipL.add(legL);
  const legR = new THREE.Mesh(legGeo, mat); legR.position.y = -0.28; hipR.add(legR);
  const shL = new THREE.Object3D(); shL.position.set(-0.22, 1.22, 0);
  const shR = new THREE.Object3D(); shR.position.set(0.22, 1.22, 0);
  const armGeo = new THREE.CapsuleGeometry(0.06, 0.42, 4, 8);
  const armL = new THREE.Mesh(armGeo, mat); armL.position.y = -0.21; shL.add(armL);
  const armR = new THREE.Mesh(armGeo, mat); armR.position.y = -0.21; shR.add(armR);
  const variant = ((seed * 9301 + 49297) % 233280) / 233280; // deterministic per-player variant
  if (variant < 0.6) { shL.rotation.z = 0.12; shR.rotation.z = -0.12; }
  else if (variant < 0.85) { shL.rotation.z = 2.6; shR.rotation.z = -2.6; }
  else { shL.rotation.z = 0.6; shR.rotation.z = -0.9; }
  g.add(head, torso, hipL, hipR, shL, shR);
  g.userData.bobSeed = seed;
  g.userData.hipL = hipL; g.userData.hipR = hipR;
  g.userData.raiseArms = (t) => { shL.rotation.z = lerp(shL.rotation.z, 2.7, t); shR.rotation.z = lerp(shR.rotation.z, -2.7, t); };
  g.scale.setScalar(1.05);
  return g;
}

function makeElevator(letter, x) {
  const g = new THREE.Group();
  g.position.set(x, 0, -6.4);
  g.userData.baseX = x;
  const steel = new THREE.MeshStandardMaterial({ color: 0x565f68, roughness: 0.55, metalness: 0.35, emissive: 0x141a20, emissiveIntensity: 0.6 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.15, 3.2, 0.34), steel);
  frame.position.y = 1.55;
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x9fb4c8, roughness: 0.4, metalness: 0.5, emissive: 0x2a3a48, emissiveIntensity: 0.8 });
  const trim = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.1, 0.4), trimMat);
  trim.position.y = 3.02;
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x525c66, roughness: 0.45, metalness: 0.4 });
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.86, 2.7, 0.18), doorMat);
  const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.86, 2.7, 0.18), doorMat);
  doorL.position.set(-0.44, 1.45, 0.1);
  doorR.position.set(0.44, 1.45, 0.1);
  const stripMat = new THREE.MeshStandardMaterial({ color: 0x223040, emissive: 0x88b8ff, emissiveIntensity: 0.9, roughness: 0.4 });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.05), stripMat);
  strip.position.set(0, 2.95, 0.16);
  const burstLight = new THREE.PointLight(0xff3344, 0, 6);
  burstLight.position.set(0, 1.6, 0.8);
  g.add(frame, trim, doorL, doorR, strip, burstLight);
  Object.assign(g.userData, { letter, doorL, doorR, strip, stripMat, burstLight, open: false, status: 'idle', explodeAt: 0, celebrateUntil: 0 });
  return g;
}

// Phases during which players are shown milling in the open lobby rather than
// clustered at their chosen (or not-yet-chosen) elevator.
const LOBBY_PHASES = new Set(['JOIN', 'READY', 'ROUND_LOBBY']);

const CAM_TARGETS = {
  JOIN: [[0, 7, 10], [0, 1.2, -4]],
  READY: [[0, 7, 10], [0, 1.2, -2]],
  ROUND_LOBBY: [[0, 6.5, 9], [0, 1.4, -4]],
  ROUND_DECISION: [[0, 5.5, 8], [0, 1.3, -4]],
  ROUND_LOCK: [[0, 5, 7], [0, 1.3, -5]],
  ROUND_PAUSE: [[0, 4, 5], [0, 1.5, -6]],
  ROUND_RESOLVE: [[0, 4, 5], [0, 1.5, -6]],
  FINALE: [[1.5, 3.2, 3], [0, 1.4, 0.6]],
  ENDED: [[0, 7.5, 11], [0, 1.4, -3]],
  CANCELLED: [[0, 7.5, 11], [0, 1.4, -3]],
};

export class LiftGame {
  constructor(container, opts = {}) {
    this.container = container;
    this.onUpdate = opts.onUpdate || (() => {});
    this.disposed = false;
    this.avatars = new Map(); // kickUsername -> { mesh, alive, dying, dyingT, targetX, targetZ }
    this.elevators = new Map(); // letter -> { mesh, status }
    this.snapshot = null;
    this._init();
  }

  _init() {
    const c = this.container;
    const w = c.clientWidth, h = c.clientHeight;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c0e);
    this.scene.fog = new THREE.FogExp2(0x0a0c0e, 0.045);
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camPos = new THREE.Vector3(0, 7, 10);
    this.camLook = new THREE.Vector3(0, 1.2, -4);
    this.camera.position.copy(this.camPos);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    c.appendChild(this.renderer.domElement);

    const amb = new THREE.AmbientLight(0x3d4a60, 0.9);
    const key = new THREE.DirectionalLight(0xcfe0ff, 0.8);
    key.position.set(4, 10, 6);
    const rim = new THREE.PointLight(0x6688aa, 0.8, 22);
    rim.position.set(0, 6, -4);
    const wallWash = new THREE.SpotLight(0xaac8ee, 2.2, 22, Math.PI / 3.4, 0.5, 1.2);
    wallWash.position.set(0, 7.5, -1.5);
    wallWash.target.position.set(0, 1.6, -6.4);
    this.alarmLight = new THREE.PointLight(0xff2233, 0, 14);
    this.alarmLight.position.set(0, 4, -5);
    this.scene.add(amb, key, rim, wallWash, wallWash.target, this.alarmLight);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 8, 0.4), new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.9 }));
    wall.position.set(0, 4, -7);
    this.scene.add(floor, wall);

    this.avatarGroup = new THREE.Group();
    this.elevatorGroup = new THREE.Group();
    this.scene.add(this.avatarGroup, this.elevatorGroup);

    this._lastT = performance.now();
    this._raf = requestAnimationFrame(this._tick.bind(this));
    this._hudInterval = setInterval(() => this._pushOverlay(), 100);

    this._onResize = () => {
      const w2 = c.clientWidth, h2 = c.clientHeight;
      this.camera.aspect = w2 / h2; this.camera.updateProjectionMatrix();
      this.renderer.setSize(w2, h2);
    };
    window.addEventListener('resize', this._onResize);
  }

  // ─── External state feed ──────────────────────────────────────────────────

  applySnapshot(snapshot) {
    if (!snapshot) return;
    const prev = this.snapshot;
    this.snapshot = snapshot;

    this._syncElevators(snapshot);
    this._syncAvatars(snapshot);
    this._layout(snapshot);

    // Doors open only while a decision is live.
    const doorsOpen = snapshot.status === 'ROUND_DECISION';
    this.elevators.forEach((e) => { e.mesh.userData.open = doorsOpen; });

    // Elevator status flips (idle -> dead) trigger the explosion/power-down effect.
    (snapshot.elevators || []).forEach((e) => {
      const entry = this.elevators.get(e.letter);
      if (!entry) return;
      if (e.status === 'dead' && entry.mesh.userData.status !== 'dead') {
        entry.mesh.userData.status = 'dead';
        entry.mesh.userData.explodeAt = performance.now();
      } else if (e.status !== 'dead') {
        entry.mesh.userData.status = e.status;
        if (prev && prev.status !== snapshot.status) entry.mesh.userData.celebrateUntil = performance.now() + 1600;
      }
    });

    this.alarmActive = snapshot.status === 'ROUND_PAUSE';
  }

  _syncElevators(snapshot) {
    const wanted = snapshot.elevators || [];
    const wantedLetters = new Set(wanted.map((e) => e.letter));

    // Round changed shape (new round started) — rebuild the row.
    const currentLetters = [...this.elevators.keys()];
    const sameSet = currentLetters.length === wanted.length && currentLetters.every((l) => wantedLetters.has(l));
    if (!sameSet) {
      this.elevators.forEach((e) => this.elevatorGroup.remove(e.mesh));
      this.elevators.clear();
      const count = wanted.length;
      const total = count * 2.3;
      const startX = -total / 2 + 1.15;
      wanted.forEach((e, i) => {
        const mesh = makeElevator(e.letter, startX + i * 2.3);
        this.elevatorGroup.add(mesh);
        this.elevators.set(e.letter, { mesh, status: 'idle' });
      });
    }
  }

  _syncAvatars(snapshot) {
    const seen = new Set();
    (snapshot.players || []).forEach((p, i) => {
      seen.add(p.kickUsername);
      let entry = this.avatars.get(p.kickUsername);
      if (!entry) {
        const mesh = makeAvatar(p.avatarSeed || i);
        mesh.position.set(rand(-6, 6), 0, rand(1.5, 4));
        this.avatarGroup.add(mesh);
        entry = { mesh, alive: true, dying: false, dyingT: 0, targetX: mesh.position.x, targetZ: mesh.position.z, name: p.kickUsername };
        this.avatars.set(p.kickUsername, entry);
      }
      if (!p.alive && entry.alive) {
        entry.alive = false;
        entry.dying = true;
        entry.dyingT = 0;
      }
      entry.currentElevator = p.currentElevator;
    });
    // Players never disappear from the roster mid-session, but guard anyway.
    this.avatars.forEach((entry, name) => {
      if (!seen.has(name) && entry.mesh.visible) {
        entry.dying = true;
      }
    });
  }

  _layout(snapshot) {
    const status = snapshot.status;
    const alive = (snapshot.players || []).filter((p) => p.alive);

    if (LOBBY_PHASES.has(status)) {
      const cols = Math.ceil(Math.sqrt(Math.max(1, alive.length)));
      alive.forEach((p, i) => {
        const entry = this.avatars.get(p.kickUsername);
        if (!entry) return;
        const row = Math.floor(i / cols), col = i % cols;
        entry.targetX = (col - cols / 2) * 0.6 + rand(-0.08, 0.08);
        entry.targetZ = 3 + row * 0.55;
      });
      return;
    }

    if (status === 'FINALE') {
      alive.forEach((p) => {
        const entry = this.avatars.get(p.kickUsername);
        if (!entry) return;
        entry.targetX = 0;
        entry.targetZ = 0.6;
        entry.isWinner = true;
      });
      return;
    }

    if (status === 'ENDED' || status === 'CANCELLED') return;

    // Decision / lock / pause / resolve: cluster by chosen elevator, or a holding
    // area for anyone who hasn't picked yet (they're the ones about to be eliminated
    // for not choosing).
    const byElevator = new Map();
    const undecided = [];
    alive.forEach((p) => {
      if (p.currentElevator) {
        if (!byElevator.has(p.currentElevator)) byElevator.set(p.currentElevator, []);
        byElevator.get(p.currentElevator).push(p);
      } else {
        undecided.push(p);
      }
    });

    this.elevators.forEach((e, letter) => {
      const members = byElevator.get(letter) || [];
      const cols = Math.max(1, Math.ceil(Math.sqrt(members.length)));
      members.forEach((p, i) => {
        const entry = this.avatars.get(p.kickUsername);
        if (!entry) return;
        const row = Math.floor(i / cols), col = i % cols;
        entry.targetX = e.mesh.position.x + (col - cols / 2) * 0.42 + rand(-0.05, 0.05);
        entry.targetZ = 0.6 + row * 0.5;
      });
    });

    const uCols = Math.max(1, Math.ceil(Math.sqrt(undecided.length)));
    undecided.forEach((p, i) => {
      const entry = this.avatars.get(p.kickUsername);
      if (!entry) return;
      const row = Math.floor(i / uCols), col = i % uCols;
      entry.targetX = (col - uCols / 2) * 0.5 + rand(-0.05, 0.05);
      entry.targetZ = 4.2 + row * 0.5;
    });
  }

  // ─── Render loop ───────────────────────────────────────────────────────────

  _tick(now) {
    if (this.disposed) return;
    const dt = Math.min((now - this._lastT) / 1000, 0.05);
    this._lastT = now;

    this.avatars.forEach((a) => {
      if (a.dying) {
        a.dyingT += dt;
        const s = Math.max(0, 1 - a.dyingT / 1.1);
        a.mesh.scale.setScalar(1.05 * s);
        a.mesh.position.y = -a.dyingT * 0.4;
        if (a.dyingT > 1.15) a.mesh.visible = false;
        return;
      }
      const dx = a.targetX - a.mesh.position.x, dz = a.targetZ - a.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const moving = dist > 0.05;
      a.mesh.position.x = lerp(a.mesh.position.x, a.targetX, 1 - Math.pow(0.02, dt));
      a.mesh.position.z = lerp(a.mesh.position.z, a.targetZ, 1 - Math.pow(0.02, dt));
      const { hipL, hipR } = a.mesh.userData;
      if (moving) {
        a.mesh.rotation.y = lerp(a.mesh.rotation.y, Math.atan2(dx, dz), 0.12);
        const swing = Math.sin(now * 0.014) * 0.55;
        if (hipL) hipL.rotation.x = swing;
        if (hipR) hipR.rotation.x = -swing;
        a.mesh.position.y = Math.abs(Math.sin(now * 0.014)) * 0.05;
      } else {
        if (hipL) hipL.rotation.x = lerp(hipL.rotation.x, 0, 0.08);
        if (hipR) hipR.rotation.x = lerp(hipR.rotation.x, 0, 0.08);
        a.mesh.position.y = Math.sin(now * 0.002 + a.mesh.userData.bobSeed) * 0.02;
      }
      if (a.isWinner && this.snapshot?.status === 'FINALE') {
        a.mesh.userData.raiseArms(0.06);
      }
    });

    this.elevators.forEach((e) => {
      const ud = e.mesh.userData;
      const exploding = ud.status === 'dead' && (now - ud.explodeAt < 650);
      if (exploding) {
        const k = 1 - (now - ud.explodeAt) / 650;
        e.mesh.position.x = ud.baseX + (Math.random() - 0.5) * 0.08 * k;
        e.mesh.position.y = (Math.random() - 0.5) * 0.05 * k;
        ud.doorL.position.x = lerp(ud.doorL.position.x, -1.1, 0.35);
        ud.doorR.position.x = lerp(ud.doorR.position.x, 1.1, 0.35);
        const flashK = Math.max(0, 1 - (now - ud.explodeAt) / 220);
        ud.stripMat.emissive.setHex(0xffffff);
        ud.stripMat.emissiveIntensity = 3.2 * flashK + 0.2;
        ud.burstLight.intensity = 5 * flashK;
      } else {
        e.mesh.position.x = ud.baseX;
        e.mesh.position.y = 0;
        const targetOffset = (ud.open && ud.status !== 'dead') ? 0.42 : 0;
        ud.doorL.position.x = lerp(ud.doorL.position.x, -0.44 - targetOffset, 1 - Math.pow(0.0005, dt));
        ud.doorR.position.x = lerp(ud.doorR.position.x, 0.44 + targetOffset, 1 - Math.pow(0.0005, dt));
        ud.burstLight.intensity = lerp(ud.burstLight.intensity, 0, 0.08);
        if (ud.status === 'dead') {
          ud.stripMat.emissive.setHex(0x220000);
          ud.stripMat.emissiveIntensity = 0;
        } else if (now < ud.celebrateUntil) {
          ud.stripMat.emissive.setHex(0x4fd18b);
          ud.stripMat.emissiveIntensity = 1.3 + Math.sin(now * 0.006) * 0.3;
        } else {
          ud.stripMat.emissive.setHex(0x88b8ff);
          ud.stripMat.emissiveIntensity = 0.85 + Math.sin(now * 0.003) * 0.08;
        }
      }
    });

    this.alarmLight.intensity = this.alarmActive
      ? (Math.random() > 0.5 ? rand(0.3, 1.2) : 0)
      : lerp(this.alarmLight.intensity, 0, 0.05);

    // Camera
    const status = this.snapshot?.status || 'JOIN';
    let camT = CAM_TARGETS[status] || CAM_TARGETS.JOIN;
    if (status === 'ROUND_RESOLVE') {
      const dead = (this.snapshot?.elevators || []).find((e) => e.status === 'dead');
      const deadMesh = dead && this.elevators.get(dead.letter)?.mesh;
      if (deadMesh) camT = [[2.5, 3.4, 2.6], [deadMesh.position.x, 1.6, -6.4]];
    } else if (status === 'FINALE') {
      const winner = [...this.avatars.values()].find((a) => a.isWinner && a.alive);
      if (winner) camT = [[1.5, 3.2, 3], [winner.mesh.position.x, 1.4, 0.6]];
    }
    this.camPos.set(camT[0][0] + Math.sin(now * 0.0004) * 0.3, camT[0][1], camT[0][2]);
    this.camLook.set(camT[1][0], camT[1][1], camT[1][2]);
    this.camera.position.lerp(this.camPos, 1 - Math.pow(0.0002, dt));
    this._lookTarget = this._lookTarget || this.camLook.clone();
    this._lookTarget.lerp(this.camLook, 1 - Math.pow(0.0005, dt));
    this.camera.lookAt(this._lookTarget);

    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._tick.bind(this));
  }

  _screenPos(obj3d, extraY) {
    const v = new THREE.Vector3();
    obj3d.getWorldPosition(v);
    v.y += extraY !== undefined ? extraY + 1.55 : 1.7;
    v.project(this.camera);
    const w = this.container.clientWidth, h = this.container.clientHeight;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
  }

  _pushOverlay() {
    if (this.disposed) return;
    const elevatorsOut = [...this.elevators.entries()].map(([letter, e]) => {
      const p = this._screenPos(e.mesh);
      return { letter, x: p.x, y: p.y };
    });
    const avatarsOut = [];
    const placed = [];
    const hh = this.container.clientHeight;
    this.avatars.forEach((a, name) => {
      if (!a.alive || !a.mesh.visible) return;
      const p = this._screenPos(a.mesh, 0.35);
      if (p.y < 100 || p.y > hh - 150) return;
      const collides = placed.some((q) => Math.abs(q.x - p.x) < 58 && Math.abs(q.y - p.y) < 15);
      if (!collides) { placed.push(p); avatarsOut.push({ name, x: p.x, y: p.y }); }
    });
    this.onUpdate({ elevators: elevatorsOut, avatars: avatarsOut });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this._raf);
    clearInterval(this._hudInterval);
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  }
}
