import * as THREE from "three";

// Meadow grass by the hundred. Every mesh of one tuft becomes an InstancedMesh, and the vertex
// shader leans each blade with the wind in proportion to the square of its height, the same
// way across a whole field and a little later further along it, so the grass rolls in waves
// at no cost to the CPU. One clock drives every field in every world.
export const grassTime = { value: 0 };

const SWAY = /* glsl */ `#include <begin_vertex>
#ifdef USE_INSTANCING
  mat3 grassFrame = mat3(modelMatrix) * mat3(instanceMatrix);
  vec3 grassRoot = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
#else
  mat3 grassFrame = mat3(modelMatrix);
  vec3 grassRoot = modelMatrix[3].xyz;
#endif
  // A cleared tuft is scaled to nothing: keep the division below finite.
  float grassScale = max(length(grassFrame[0]), 1e-4);
  float grassH = max(transformed.y, 0.0) * grassScale;
  float grassWave = uGrassTime * 1.3 - dot(grassRoot.xz, vec2(0.21, 0.13));
  float grassGust = 0.35 + sin(grassWave) * 0.55 + sin(grassWave * 2.1 + 1.3) * 0.2;
  vec3 grassPush = vec3(0.8, 0.0, 0.5) * grassGust * grassH * grassH * 0.35;
  // Pushed in the world, then carried back into the tuft's own frame.
  transformed += transpose(grassFrame) * grassPush / (grassScale * grassScale);`;

function sway(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrassTime = grassTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uGrassTime;",
      )
      .replace("#include <begin_vertex>", SWAY);
  };
  material.customProgramCacheKey = () => "fd-grass";
  return material;
}

// The tuft's meshes, lowest colour first, each with its placement baked into its geometry so
// that a vertex's height is its height above the roots.
async function tuft(assets) {
  const o = await assets.make("meadow_grass", { surfaces: false });
  if (!o) return null;
  o.updateMatrixWorld(true);
  const parts = [];
  o.traverse((m) => {
    if (!m.isMesh) return;
    const hsl = {};
    m.material.color.getHSL(hsl);
    parts.push({
      geometry: m.geometry.clone().applyMatrix4(m.matrixWorld),
      material: m.material,
      light: hsl.l,
    });
  });
  return parts.sort((a, b) => a.light - b.light);
}

// Plants tufts at `spots` ([x, y, z, yaw, scale], in the frame of `parent`), in square patches
// `cell` metres wide so a patch out of view is not drawn. `colors`, lowest first, recolour the
// tuft for its world. Grass casts no shadow; it takes the shadows of everything else.
export async function plantGrass(
  assets,
  parent,
  spots,
  { colors, cell = 24 } = {},
) {
  const parts = await tuft(assets);
  if (!parts || !spots.length) return [];
  const materials = parts.map((p, i) => {
    const m = sway(p.material.clone());
    if (colors?.[i] !== undefined) m.color.set(colors[i]);
    return m;
  });
  const patches = new Map();
  for (const s of spots) {
    const key = `${Math.floor(s[0] / cell)},${Math.floor(s[2] / cell)}`;
    if (!patches.has(key)) patches.set(key, []);
    patches.get(key).push(s);
  }
  const place = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0),
    at = new THREE.Vector3(),
    k = new THREE.Vector3();
  const made = [];
  for (const patch of patches.values())
    parts.forEach((p, i) => {
      const inst = new THREE.InstancedMesh(
        p.geometry,
        materials[i],
        patch.length,
      );
      patch.forEach(([x, y, z, yaw, s], j) => {
        place.compose(
          at.set(x, y, z),
          q.setFromAxisAngle(up, yaw),
          k.setScalar(s),
        );
        inst.setMatrixAt(j, place);
      });
      inst.computeBoundingSphere();
      inst.userData.grass = true;
      inst.castShadow = false;
      inst.receiveShadow = true;
      parent.add(inst);
      made.push(inst);
    });
  return made;
}

// Tufts scattered in clumps: `centres` of [x, z, radius, count], each tuft at a random spot
// in its clump, kept only where `ground(x, z)` gives a height (null to skip the spot).
export function clumps(centres, ground, rand, [small, large] = [0.7, 1.25]) {
  const spots = [];
  for (const [cx, cz, r, n] of centres)
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2,
        d = r * Math.sqrt(rand());
      const x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      const y = ground(x, z);
      if (y === null) continue;
      spots.push([
        x,
        y,
        z,
        rand() * Math.PI * 2,
        small + rand() * (large - small),
      ]);
    }
  return spots;
}

// Clears the grass round a spot under `root`, for something set down there that must stay
// in sight: each tuft within `radius` is scaled to nothing.
export function clearGrass(root, x, z, radius) {
  const m = new THREE.Matrix4(),
    p = new THREE.Vector3(),
    none = new THREE.Matrix4().makeScale(0, 0, 0);
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isInstancedMesh || !o.userData.grass) return;
    let cleared = false;
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      p.setFromMatrixPosition(m).applyMatrix4(o.matrixWorld);
      if ((p.x - x) ** 2 + (p.z - z) ** 2 > radius * radius) continue;
      o.setMatrixAt(i, none);
      cleared = true;
    }
    if (cleared) o.instanceMatrix.needsUpdate = true;
  });
}
