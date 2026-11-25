import * as THREE from 'three';
import type { CharacterConfig, GameObject, TerrainData } from '../../types/world';

let cachedSurfaceBump: THREE.CanvasTexture | null = null;
let cachedContactShadowTex: THREE.CanvasTexture | null = null;
let cachedRoadTex: THREE.CanvasTexture | null = null;

export function getSurfaceBumpTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedSurfaceBump) return cachedSurfaceBump;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 2) {
      for (let x = 0; x < 128; x += 2) {
        const n = Math.floor(110 + ((Math.sin(x * 0.45) * Math.cos(y * 0.45) + 1) * 18) + (Math.random() * 14 - 7));
        ctx.fillStyle = `rgb(${n},${n},${n})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = Math.min(maxAnisotropy, 8);
  cachedSurfaceBump = tex;
  return tex;
}

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedContactShadowTex) return cachedContactShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(0,0,0,0.48)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  cachedContactShadowTex = tex;
  return tex;
}

function getRoadStripeTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedRoadTex) return cachedRoadTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 10, 256);
    ctx.fillRect(118, 0, 10, 256);
    ctx.fillStyle = '#f59e0b';
    for (let y = 16; y < 256; y += 64) {
      ctx.fillRect(60, y, 8, 34);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(maxAnisotropy, 8);
  cachedRoadTex = tex;
  return tex;
}

function addContactShadow(group: THREE.Group, radius: number): void {
  const mat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 18), mat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.025;
  disc.userData.isHelper = true;
  group.add(disc);
}

function makeMat(
  color: string | number,
  roughness = 0.72,
  metalness = 0.08,
  opts?: { emissive?: string | number; emissiveIntensity?: number; opacity?: number; bump?: boolean; maxAniso?: number }
): THREE.MeshStandardMaterial {
  const transparent = opts?.opacity !== undefined && opts.opacity < 0.99;
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive: opts?.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: opts?.emissiveIntensity ?? 0,
    transparent,
    opacity: opts?.opacity ?? 1,
    bumpMap: opts?.bump ? getSurfaceBumpTexture(opts.maxAniso) : null,
    bumpScale: opts?.bump ? 0.03 : 0,
  });
}

function enableShadows(mesh: THREE.Mesh, cast = true, receive = true): THREE.Mesh {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

/**
 * Builds a composite 3-12 part procedural low-poly THREE.Group pivoted at bottom-center (y=0).
 * Every prop uses varied roughness/metalness across adjacent parts and clean silhouettes.
 */
export function buildProceduralObjectGroup(obj: GameObject, maxAniso = 4): THREE.Group {
  const group = new THREE.Group();
  group.name = obj.id;
  group.userData.gameObjectId = obj.id;
  group.userData.assetType = obj.assetType;

  const mainColor = obj.material.color;
  const mainMat = makeMat(mainColor, obj.material.roughness, obj.material.metalness, {
    emissive: obj.material.emissive,
    emissiveIntensity: obj.material.emissiveIntensity,
    opacity: obj.material.opacity,
    bump: obj.material.preset === 'stone' || obj.material.preset === 'wood',
    maxAniso,
  });
  const trimMat = makeMat('#1e293b', 0.35, 0.72);
  const accentMat = makeMat('#f59e0b', 0.25, 0.4, { emissive: '#f59e0b', emissiveIntensity: 0.45 });
  const woodDarkMat = makeMat('#5c4028', 0.88, 0.04, { bump: true, maxAniso });
  const glassMat = makeMat('#bae6fd', 0.14, 0.15, { emissive: '#38bdf8', emissiveIntensity: 0.2, opacity: 0.78 });

  switch (obj.assetType) {
    case 'tree_pine': {
      addContactShadow(group, 1.8);
      const trunk = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 1.7, 7), woodDarkMat));
      trunk.position.y = 0.85;
      group.add(trunk);
      const foliageMat = makeMat(mainColor, 0.86, 0.02);
      const tier1 = enableShadows(new THREE.Mesh(new THREE.ConeGeometry(1.55, 2.2, 7), foliageMat));
      tier1.position.y = 2.3;
      const tier2 = enableShadows(new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.9, 7), foliageMat));
      tier2.position.y = 3.45;
      const tier3 = enableShadows(new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.45, 7), foliageMat));
      tier3.position.y = 4.55;
      group.add(tier1, tier2, tier3);
      break;
    }

    case 'tree_oak': {
      addContactShadow(group, 2.1);
      const trunk = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.45, 2.2, 7), woodDarkMat));
      trunk.position.y = 1.1;
      const crownMat = makeMat(mainColor, 0.84, 0.02);
      const c1 = enableShadows(new THREE.Mesh(new THREE.DodecahedronGeometry(1.45, 0), crownMat));
      c1.position.set(0, 3.2, 0);
      const c2 = enableShadows(new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), crownMat));
      c2.position.set(0.85, 2.75, 0.4);
      const c3 = enableShadows(new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), crownMat));
      c3.position.set(-0.8, 2.85, -0.35);
      group.add(trunk, c1, c2, c3);
      break;
    }

    case 'rock': {
      addContactShadow(group, 1.8);
      const r1 = enableShadows(new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 0), mainMat));
      r1.scale.set(1.2, 0.82, 1.0);
      r1.position.set(0, 0.72, 0);
      const r2 = enableShadows(new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), makeMat('#4b5563', 0.9, 0.05)));
      r2.position.set(0.95, 0.45, 0.45);
      const r3 = enableShadows(new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), mainMat));
      r3.position.set(-0.85, 0.35, -0.4);
      group.add(r1, r2, r3);
      break;
    }

    case 'house': {
      addContactShadow(group, 3.6);
      const base = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.45, 5.6), makeMat('#475569', 0.88, 0.08)));
      base.position.y = 0.225;
      const body = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.8, 5.2), mainMat));
      body.position.y = 1.85;
      const roof = enableShadows(new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.0, 4), makeMat('#334155', 0.65, 0.2)));
      roof.position.y = 4.22;
      roof.rotation.y = Math.PI / 4;
      const chimney = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.7), makeMat('#64748b', 0.9, 0.05)));
      chimney.position.set(1.3, 4.35, -1.1);
      const doorFrame = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.0, 0.2), woodDarkMat));
      doorFrame.position.set(0, 1.45, 2.58);
      const winMat = makeMat('#fef08a', 0.2, 0.1, { emissive: '#f59e0b', emissiveIntensity: 0.75 });
      const winL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.16), winMat);
      winL.position.set(-1.55, 2.0, 2.58);
      const winR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.16), winMat);
      winR.position.set(1.55, 2.0, 2.58);
      group.add(base, body, roof, chimney, doorFrame, winL, winR);
      break;
    }

    case 'watchtower': {
      addContactShadow(group, 2.7);
      const plinth = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.6, 3.8), trimMat));
      plinth.position.y = 0.3;
      const shaft = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.75, 5.4, 6), mainMat));
      shaft.position.y = 3.2;
      const deck = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.45, 3.8), trimMat));
      deck.position.y = 6.0;
      const roof = enableShadows(new THREE.Mesh(new THREE.ConeGeometry(2.75, 1.55, 4), makeMat('#1e293b', 0.55, 0.3)));
      roof.position.y = 8.15;
      roof.rotation.y = Math.PI / 4;
      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), accentMat);
      beacon.position.y = 6.85;
      beacon.userData.spin = true;
      for (const [px, pz] of [
        [-1.55, -1.55],
        [1.55, -1.55],
        [-1.55, 1.55],
        [1.55, 1.55],
      ]) {
        const post = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.4, 0.22), trimMat));
        post.position.set(px, 6.8, pz);
        group.add(post);
      }
      group.add(plinth, shaft, deck, roof, beacon);
      break;
    }

    case 'door_gate': {
      const jambL = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(0.65, 4.1, 0.9), trimMat));
      jambL.position.set(-1.9, 2.05, 0);
      const jambR = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(0.65, 4.1, 0.9), trimMat));
      jambR.position.set(1.9, 2.05, 0);
      const lintel = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.65, 1.0), trimMat));
      lintel.position.set(0, 4.15, 0);
      const panel = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(3.15, 3.65, 0.35), mainMat));
      panel.position.set(0, 1.825, 0);
      panel.userData.isDoorPanel = true;
      const lockCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), accentMat);
      lockCore.position.set(0, 1.9, 0.22);
      panel.add(lockCore);
      group.add(jambL, jambR, lintel, panel);
      break;
    }

    case 'platform': {
      const top = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.55, 5.0), mainMat));
      top.position.y = 0.525;
      const under = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 1.1, 1.2, 6), makeMat('#334155', 0.85, 0.1)));
      under.position.y = -0.35;
      const rim = new THREE.Mesh(new THREE.BoxGeometry(5.16, 0.14, 5.16), accentMat);
      rim.position.y = 0.72;
      group.add(top, under, rim);
      break;
    }

    case 'ramp': {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(6, 0);
      shape.lineTo(6, 2.0);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 3.8, bevelEnabled: false });
      geo.translate(-3, 0, -1.9);
      geo.rotateY(Math.PI / 2);
      const wedge = enableShadows(new THREE.Mesh(geo, mainMat));
      const slopeAngle = Math.atan2(2, 6);
      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 6.2), trimMat);
      railL.position.set(-1.95, 1.15, 0);
      railL.rotation.x = slopeAngle;
      const railR = railL.clone();
      railR.position.x = 1.95;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 5.8), accentMat);
      strip.position.set(0, 1.06, 0);
      strip.rotation.x = slopeAngle;
      group.add(wedge, railL, railR, strip);
      break;
    }

    case 'bridge': {
      const deck = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 10.0), mainMat));
      deck.position.y = 0.175;
      group.add(deck);
      for (const side of [-2.05, 2.05]) {
        const rail = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 10.0), trimMat));
        rail.position.set(side, 1.1, 0);
        group.add(rail);
        for (const pz of [-4.4, -1.5, 1.5, 4.4]) {
          const post = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 0.2), trimMat));
          post.position.set(side, 0.65, pz);
          group.add(post);
        }
      }
      break;
    }

    case 'road': {
      const roadMat = new THREE.MeshStandardMaterial({
        map: getRoadStripeTexture(maxAniso),
        roughness: 0.85,
        metalness: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
      const deck = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.12, 10.0), roadMat), false, true);
      deck.position.y = 0.06;
      const curbL = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 10.0), makeMat('#94a3b8', 0.85, 0.05)));
      curbL.position.set(-2.55, 0.1, 0);
      const curbR = curbL.clone();
      curbR.position.x = 2.55;
      group.add(deck, curbL, curbR);
      break;
    }

    case 'floor': {
      const slab = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.32, 6.0), mainMat));
      slab.position.y = 0.16;
      const border = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(6.14, 0.14, 6.14), trimMat));
      border.position.y = 0.08;
      group.add(slab, border);
      break;
    }

    case 'wall': {
      const main = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(6.0, 3.4, 0.65), mainMat));
      main.position.y = 1.7;
      const cap = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.28, 0.82), trimMat));
      cap.position.y = 3.48;
      const plinth = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(6.16, 0.34, 0.8), trimMat));
      plinth.position.y = 0.17;
      group.add(main, cap, plinth);
      break;
    }

    case 'barrier': {
      addContactShadow(group, 1.8);
      const base = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.42, 0.95), mainMat));
      base.position.y = 0.21;
      const upper = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.85, 0.52), mainMat));
      upper.position.y = 0.84;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.22, 0.56), accentMat);
      stripe.position.y = 0.92;
      group.add(base, upper, stripe);
      break;
    }

    case 'vehicle_rover': {
      addContactShadow(group, 2.5);
      const chassis = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 4.4), mainMat));
      chassis.position.y = 0.85;
      const cabin = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 2.1), trimMat));
      cabin.position.set(0, 1.55, -0.2);
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 0.15), glassMat);
      windshield.position.set(0, 1.55, 0.88);
      windshield.rotation.x = -0.22;
      const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.42, 12);
      wheelGeo.rotateZ(Math.PI / 2);
      const tireMat = makeMat('#111827', 0.9, 0.05);
      for (const [wx, wz] of [
        [-1.3, 1.4],
        [1.3, 1.4],
        [-1.3, -1.4],
        [1.3, -1.4],
      ]) {
        const wheel = enableShadows(new THREE.Mesh(wheelGeo, tireMat));
        wheel.position.set(wx, 0.52, wz);
        group.add(wheel);
      }
      const lightMat = makeMat('#fef08a', 0.15, 0.2, { emissive: '#fde047', emissiveIntensity: 0.9 });
      const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.12), lightMat);
      hlL.position.set(-0.75, 0.95, 2.22);
      const hlR = hlL.clone();
      hlR.position.x = 0.75;
      group.add(chassis, cabin, windshield, hlL, hlR);
      break;
    }

    case 'vehicle_speeder': {
      addContactShadow(group, 2.4);
      const hull = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 4.2), mainMat));
      hull.position.y = 0.9;
      const nose = enableShadows(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.5, 4), mainMat));
      nose.rotation.x = Math.PI / 2;
      nose.rotation.y = Math.PI / 4;
      nose.position.set(0, 0.88, 2.55);
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8), glassMat);
      canopy.scale.set(0.9, 0.55, 1.45);
      canopy.position.set(0, 1.25, 0.2);
      const thrusterMat = makeMat('#38bdf8', 0.2, 0.4, { emissive: '#0ea5e9', emissiveIntensity: 0.9 });
      for (const side of [-1.1, 1.1]) {
        const pod = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 2.4, 10), trimMat));
        pod.rotation.x = Math.PI / 2;
        pod.position.set(side, 0.82, -0.5);
        const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.15, 10), thrusterMat);
        glow.rotation.x = Math.PI / 2;
        glow.position.set(side, 0.82, -1.72);
        group.add(pod, glow);
      }
      group.add(hull, nose, canopy);
      break;
    }

    case 'spawn_point': {
      const pad = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.2, 8), trimMat), false, true);
      pad.position.y = 0.1;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.05, 0.08, 8, 24),
        makeMat(mainColor, 0.2, 0.4, { emissive: mainColor, emissiveIntensity: 0.85 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.24;
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.75, 4),
        makeMat('#f59e0b', 0.25, 0.3, { emissive: '#f59e0b', emissiveIntensity: 0.7 })
      );
      arrow.rotation.x = -Math.PI / 2;
      arrow.position.set(0, 0.35, -0.35);
      group.add(pad, ring, arrow);
      break;
    }

    case 'checkpoint': {
      const colL = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.6, 0.55), trimMat));
      colL.position.set(-1.75, 1.8, 0);
      const colR = colL.clone();
      colR.position.x = 1.75;
      const topBar = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.45, 0.65), trimMat));
      topBar.position.set(0, 3.7, 0);
      const field = new THREE.Mesh(
        new THREE.PlaneGeometry(3.0, 3.3),
        makeMat(mainColor, 0.15, 0.1, { emissive: mainColor, emissiveIntensity: 0.65, opacity: 0.28 })
      );
      field.material.side = THREE.DoubleSide;
      field.position.set(0, 1.75, 0);
      const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), accentMat);
      crown.position.set(0, 4.25, 0);
      crown.userData.spin = true;
      group.add(colL, colR, topBar, field, crown);
      break;
    }

    case 'trigger_zone': {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(4.0, 2.8, 4.0),
        makeMat(mainColor, 0.2, 0.1, { emissive: mainColor, emissiveIntensity: 0.35, opacity: 0.22 })
      );
      box.position.y = 1.4;
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(4.0, 2.8, 4.0)),
        new THREE.LineBasicMaterial({ color: mainColor })
      );
      edges.position.y = 1.4;
      const baseRing = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.75, 24), makeMat(mainColor, 0.2, 0.1, { emissive: mainColor, emissiveIntensity: 0.7 }));
      baseRing.rotation.x = -Math.PI / 2;
      baseRing.position.y = 0.04;
      group.add(box, edges, baseRing);
      break;
    }

    case 'damage_zone':
    case 'safe_zone': {
      const frame = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 4.2), trimMat), false, true);
      frame.position.y = 0.09;
      const core = new THREE.Mesh(
        new THREE.BoxGeometry(3.7, 0.12, 3.7),
        makeMat(mainColor, 0.2, 0.2, { emissive: mainColor, emissiveIntensity: 0.75 })
      );
      core.position.y = 0.16;
      group.add(frame, core);
      break;
    }

    case 'button_pad': {
      addContactShadow(group, 0.9);
      const base = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.25, 8), trimMat));
      base.position.y = 0.125;
      const post = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.0, 8), trimMat));
      post.position.y = 0.72;
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.38, 0.22, 12),
        makeMat(mainColor, 0.22, 0.3, { emissive: mainColor, emissiveIntensity: 0.8 })
      );
      cap.position.y = 1.3;
      group.add(base, post, cap);
      break;
    }

    case 'key_item': {
      addContactShadow(group, 0.75);
      const pivot = new THREE.Group();
      pivot.position.y = 1.1;
      pivot.userData.spin = true;
      const goldMat = makeMat(mainColor, 0.22, 0.85, { emissive: mainColor, emissiveIntensity: 0.55 });
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.09, 8, 16), goldMat);
      bow.position.x = -0.35;
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.13, 0.13), goldMat);
      shaft.position.x = 0.2;
      const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.13), goldMat);
      tooth1.position.set(0.35, -0.18, 0);
      const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.13), goldMat);
      tooth2.position.set(0.55, -0.15, 0);
      pivot.add(bow, shaft, tooth1, tooth2);
      group.add(pivot);
      break;
    }

    case 'medkit': {
      addContactShadow(group, 0.8);
      const box = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.85), makeMat('#f8fafc', 0.35, 0.1)));
      box.position.y = 0.45;
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.9), makeMat('#ef4444', 0.3, 0.1, { emissive: '#ef4444', emissiveIntensity: 0.4 }));
      crossH.position.y = 0.48;
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.9), crossH.material);
      crossV.position.y = 0.48;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 12, Math.PI), trimMat);
      handle.position.y = 0.78;
      group.add(box, crossH, crossV, handle);
      break;
    }

    case 'weapon_crate': {
      addContactShadow(group, 1.2);
      const body = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.85, 1.05), mainMat));
      body.position.y = 0.425;
      const lid = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.22, 1.12), trimMat));
      lid.position.y = 0.92;
      const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 1.18), accentMat);
      clasp.position.y = 0.86;
      group.add(body, lid, clasp);
      break;
    }

    case 'crystal_spire': {
      addContactShadow(group, 1.4);
      const cMat = makeMat(mainColor, 0.16, 0.25, { emissive: mainColor, emissiveIntensity: 0.65 });
      const s1 = enableShadows(new THREE.Mesh(new THREE.ConeGeometry(0.68, 3.9, 5), cMat));
      s1.position.y = 1.95;
      const s2 = enableShadows(new THREE.Mesh(new THREE.ConeGeometry(0.48, 2.5, 5), cMat));
      s2.position.set(0.65, 1.15, 0.3);
      s2.rotation.z = -0.28;
      const s3 = enableShadows(new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.1, 5), cMat));
      s3.position.set(-0.6, 1.0, -0.25);
      s3.rotation.z = 0.3;
      group.add(s1, s2, s3);
      break;
    }

    case 'lamp_post': {
      addContactShadow(group, 0.65);
      const base = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.45, 8), trimMat));
      base.position.y = 0.225;
      const pole = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 3.6, 8), trimMat));
      pole.position.y = 2.15;
      const arm = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.12), trimMat));
      arm.position.set(0.35, 3.85, 0);
      const lantern = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32, 0),
        makeMat('#fef08a', 0.15, 0.1, { emissive: '#f59e0b', emissiveIntensity: 0.95 })
      );
      lantern.position.set(0.68, 3.55, 0);
      group.add(base, pole, arm, lantern);
      break;
    }

    case 'crate_stack': {
      addContactShadow(group, 1.5);
      const crateMat = makeMat(mainColor, 0.85, 0.05, { bump: true, maxAniso });
      const b1 = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), crateMat));
      b1.position.set(-0.52, 0.575, 0.15);
      const b2 = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 1.05), makeMat('#78350f', 0.88, 0.05)));
      b2.position.set(0.62, 0.525, -0.1);
      b2.rotation.y = 0.25;
      const b3 = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), crateMat));
      b3.position.set(0.0, 1.55, 0.0);
      b3.rotation.y = -0.3;
      group.add(b1, b2, b3);
      break;
    }

    case 'campfire': {
      const stoneMat = makeMat('#64748b', 0.9, 0.05);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const st = enableShadows(new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), stoneMat));
        st.position.set(Math.cos(a) * 0.72, 0.16, Math.sin(a) * 0.72);
        group.add(st);
      }
      const log1 = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.1, 6), woodDarkMat));
      log1.rotation.z = Math.PI / 2;
      log1.position.y = 0.16;
      const log2 = log1.clone();
      log2.rotation.y = Math.PI / 2;
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 0.95, 6),
        makeMat('#f97316', 0.2, 0, { emissive: '#f59e0b', emissiveIntensity: 0.95 })
      );
      flame.position.y = 0.55;
      flame.userData.spin = true;
      group.add(log1, log2, flame);
      break;
    }

    case 'npc_guard': {
      const rig = buildCharacterMesh({
        archetype: 'scifi',
        bodyScale: 1,
        primaryColor: mainColor,
        secondaryColor: '#1e293b',
        visorColor: '#f59e0b',
        equipment: 'shield',
        idleAnimation: 'combat_ready',
      });
      group.add(rig);
      break;
    }

    case 'custom_character': {
      const m = obj.metadata || {};
      const rig = buildCharacterMesh({
        archetype:
          (m.archetype as CharacterConfig['archetype']) || 'scifi',
        bodyScale: Number(m.bodyScale) || 1,
        shoulderScale: Number(m.shoulderScale) || 1,
        primaryColor: (m.primaryColor as string) || mainColor,
        secondaryColor: (m.secondaryColor as string) || '#1e293b',
        visorColor: (m.visorColor as string) || '#38bdf8',
        equipment: (m.equipment as CharacterConfig['equipment']) || 'none',
        idleAnimation: 'breathing',
      });
      group.add(rig);
      break;
    }

    case 'imported_model': {
      addContactShadow(group, 1.2);
      const base = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.25, 0.2, 16), trimMat));
      base.position.y = 0.1;
      const core = enableShadows(new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), mainMat));
      core.position.y = 1.2;
      core.name = 'IMPORTED_PLACEHOLDER';
      group.add(base, core);
      break;
    }

    case 'cube':
    default: {
      addContactShadow(group, 1.35);
      const core = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.0), mainMat));
      core.position.y = 1.0;
      const collarTop = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.18, 2.12), trimMat));
      collarTop.position.y = 1.92;
      const collarBot = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.18, 2.12), trimMat));
      collarBot.position.y = 0.09;
      group.add(core, collarTop, collarBot);
      break;
    }
  }

  group.position.set(obj.transform.position.x, obj.transform.position.y, obj.transform.position.z);
  group.rotation.set(obj.transform.rotation.x, obj.transform.rotation.y, obj.transform.rotation.z);
  group.scale.set(obj.transform.scale.x, obj.transform.scale.y, obj.transform.scale.z);
  group.visible = obj.visible;

  return group;
}

/**
 * Builds the 3rd-person player avatar / Character Studio procedural rig (7-12 distinct parts).
 */
export function buildCharacterMesh(config: CharacterConfig): THREE.Group {
  const root = new THREE.Group();
  const isCreature = config.archetype === 'creature';
  const shoulder = Math.max(0.75, Math.min(1.45, config.shoulderScale ?? (isCreature ? 1.25 : 1.0)));

  addContactShadow(root, 0.72 * shoulder);

  const primaryMat = makeMat(
    config.primaryColor,
    isCreature ? 0.85 : 0.5,
    config.archetype === 'robot' ? 0.78 : config.archetype === 'fantasy' ? 0.45 : 0.18
  );
  const secondaryMat = makeMat(config.secondaryColor, 0.65, 0.25);
  const visorMat = makeMat(config.visorColor, 0.15, 0.3, {
    emissive: config.visorColor,
    emissiveIntensity: 0.75,
  });

  const legGeo = new THREE.BoxGeometry(isCreature ? 0.36 : 0.28, 0.74, isCreature ? 0.36 : 0.28);
  const legL = enableShadows(new THREE.Mesh(legGeo, secondaryMat));
  legL.position.set(-0.22 * shoulder, 0.37, 0);
  legL.name = 'legL';
  const legR = enableShadows(new THREE.Mesh(legGeo, secondaryMat));
  legR.position.set(0.22 * shoulder, 0.37, 0);
  legR.name = 'legR';

  const torsoW = (isCreature ? 0.96 : 0.76) * shoulder;
  const torsoH = isCreature ? 0.92 : 0.82;
  const torso = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(torsoW, torsoH, isCreature ? 0.62 : 0.44), primaryMat));
  torso.position.y = 1.16;

  // Shoulder pauldrons for fantasy / scifi / creature silhouettes
  if (config.archetype === 'fantasy' || config.archetype === 'scifi' || isCreature) {
    const padGeo = isCreature
      ? new THREE.DodecahedronGeometry(0.26, 0)
      : new THREE.BoxGeometry(0.28, 0.24, 0.38);
    const padL = enableShadows(new THREE.Mesh(padGeo, secondaryMat));
    padL.position.set(-(torsoW / 2 + 0.1), 1.48, 0);
    const padR = padL.clone();
    padR.position.x = torsoW / 2 + 0.1;
    root.add(padL, padR);
  }

  const armGeo = new THREE.BoxGeometry(isCreature ? 0.3 : 0.22, isCreature ? 0.84 : 0.72, isCreature ? 0.3 : 0.24);
  const armL = enableShadows(new THREE.Mesh(armGeo, primaryMat));
  armL.position.set(-(torsoW / 2 + 0.16), 1.1, 0);
  armL.name = 'armL';
  const armR = enableShadows(new THREE.Mesh(armGeo, primaryMat));
  armR.position.set(torsoW / 2 + 0.16, 1.1, 0);
  armR.name = 'armR';

  const headGeo =
    config.archetype === 'robot'
      ? new THREE.BoxGeometry(0.52, 0.46, 0.48)
      : isCreature
      ? new THREE.DodecahedronGeometry(0.36, 0)
      : new THREE.SphereGeometry(0.28, 12, 10);
  const head = enableShadows(new THREE.Mesh(headGeo, primaryMat));
  head.position.y = isCreature ? 1.88 : 1.82;

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(isCreature ? 0.46 : 0.42, 0.15, 0.14),
    visorMat
  );
  visor.position.set(0, isCreature ? 1.9 : 1.83, isCreature ? -0.28 : -0.22);

  root.add(legL, legR, torso, armL, armR, head, visor);

  if (config.equipment === 'jetpack') {
    const pack = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.62, 0.28), secondaryMat));
    pack.position.set(0, 1.2, 0.34);
    const nozzleL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.22, 8), visorMat);
    nozzleL.position.set(-0.15, 0.84, 0.34);
    const nozzleR = nozzleL.clone();
    nozzleR.position.x = 0.15;
    root.add(pack, nozzleL, nozzleR);
  } else if (config.equipment === 'cape') {
    const cape = enableShadows(new THREE.Mesh(new THREE.BoxGeometry(0.74 * shoulder, 1.15, 0.08), secondaryMat));
    cape.position.set(0, 1.0, 0.32);
    cape.rotation.x = 0.14;
    root.add(cape);
  } else if (config.equipment === 'shield') {
    const shield = enableShadows(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 6), visorMat));
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-(torsoW / 2 + 0.3), 1.1, -0.15);
    root.add(shield);
  } else if (config.equipment === 'crown') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.18, 6), visorMat);
    crown.position.set(0, isCreature ? 2.24 : 2.14, 0);
    root.add(crown);
  }

  root.scale.setScalar(Math.max(0.7, Math.min(1.4, config.bodyScale)));
  return root;
}

/**
 * Builds or updates a vertex-colored PlaneGeometry terrain mesh from TerrainData.
 */
export function buildTerrainGeometry(terrain: TerrainData): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(
    terrain.width,
    terrain.depth,
    terrain.segmentsX,
    terrain.segmentsZ
  );
  geo.rotateX(-Math.PI / 2);

  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const count = posAttr.count;
  const colors = new Float32Array(count * 3);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const h = terrain.heights[i] ?? 0;
    posAttr.setY(i, h);
    tmpColor.set(terrain.colors[i] || '#4d7c4f');
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m?.dispose());
    }
  });
}
