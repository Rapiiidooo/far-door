import * as THREE from "three";
import { isleAt } from "./world.js";

// Development view (?colliders=1): every collider drawn as a wireframe over the scene, so a
// collider that disagrees with its mesh shows up in a screenshot. Green can be hung from,
// blue is ground only, orange is a prop, grey does not stop the camera.
export function drawColliders(scene, world) {
  const group = new THREE.Group();
  group.name = "colliders";
  const colour = (b) =>
    !b.cam ? 0x9a9a9a : b.grab ? 0x3ddc84 : b.stand ? 0x4aa3ff : 0xff9a3c;
  const mats = new Map();
  const mat = (c) => {
    if (!mats.has(c))
      mats.set(
        c,
        new THREE.LineBasicMaterial({
          color: c,
          depthTest: false,
          transparent: true,
          opacity: 0.85,
          fog: false,
        }),
      );
    return mats.get(c);
  };
  for (const b of world.boxes) {
    // An isle: its rim, at the height of the cap's edge.
    if (b.shape === "isle") {
      const pts = [];
      const n = b.rim.length;
      for (let i = 0; i <= n; i++) {
        const a = ((i % n) / n) * Math.PI * 2;
        const x = b.x + Math.cos(a) * b.rim[i % n],
          z = b.z + Math.sin(a) * b.rim[i % n];
        pts.push(new THREE.Vector3(x, isleAt(b, x, z).top + 0.02, z));
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        mat(colour(b)),
      );
      line.renderOrder = 50;
      line.frustumCulled = false;
      group.add(line);
      continue;
    }
    // Floors reach 10 m below the ground; draw only the part near where anything happens.
    const y0 = Math.max(b.minY, b.maxY - 4);
    let geo;
    if (b.shape === "round") {
      geo = new THREE.EdgesGeometry(
        new THREE.CylinderGeometry(b.r, b.r, b.maxY - y0, 20, 1, true),
      );
      geo.translate(b.x, (b.maxY + y0) / 2, b.z);
    } else {
      geo = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(b.maxX - b.minX, b.maxY - y0, b.maxZ - b.minZ),
      );
      geo.translate(
        (b.minX + b.maxX) / 2,
        (b.maxY + y0) / 2,
        (b.minZ + b.maxZ) / 2,
      );
    }
    const lines = new THREE.LineSegments(geo, mat(colour(b)));
    lines.renderOrder = 50;
    lines.frustumCulled = false;
    group.add(lines);
  }
  scene.add(group);
  return group;
}
