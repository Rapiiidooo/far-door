// Throwaway: load the shipped booth, bin and post through the game's own loader and
// confirm joints and parts resolve per instance, rotate, and plain data survives.
globalThis.location = { href: 'file:///Users/rapido/perso/bittensor/404/far-door/game/' };
const THREE = await import('three');
const { ASSET } = await import('/Users/rapido/perso/bittensor/404/far-door/game/assetlib.js');
const f = (v) => (v.toArray ? v.toArray() : [v.x, v.y, v.z]).map((x) => +x.toFixed(3));
for (const [url, joints, parts] of [['assets/customs_booth.js', ['barrier'], ['lamp']], ['assets/confiscation_bin.js', ['lid'], []], ['assets/queue_post.js', [], []]]) {
  const a = await ASSET(url, { keepHierarchy: true });
  const b = await ASSET(url, { keepHierarchy: true });
  const merged = await ASSET(url);
  const J = a.userData.joints || {}, P = a.userData.parts || {};
  const own = (node) => { let hit = false; a.traverse((o) => { if (o === node) hit = true; }); return hit; };
  const out = { url, native: f(a.userData.nativeSize) };
  for (const k of joints) {
    const j = J[k];
    out[k] = j && { own: own(j), distinct: b.userData.joints[k] !== j, pivot: f(j.getWorldPosition(new THREE.Vector3())), rot: f(new THREE.Vector3().setFromEuler(j.rotation)) };
  }
  for (const k of parts) out[k] = P[k] && { own: own(P[k]), distinct: b.userData.parts[k] !== P[k], sharedMaterial: b.userData.parts[k].material === P[k].material };
  for (const k of ['window', 'counter', 'inside', 'post', 'nextPost']) if (a.userData[k]) out[k] = a.userData[k];
  let mm = 0; merged.traverse((o) => o.isMesh && mm++);
  let tm = 0; a.traverse((o) => o.isMesh && tm++);
  out.meshes = { keepHierarchy: tm, merged: mm };
  console.log(JSON.stringify(out));
}
