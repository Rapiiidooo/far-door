// Throwaway: load the shipped assets through the game's own loader with
// keepHierarchy and confirm parts resolve per instance and plain data survives.
globalThis.location = { href: 'file:///Users/rapido/perso/bittensor/404/far-door/game/' };
const { ASSET } = await import('/Users/rapido/perso/bittensor/404/far-door/game/assetlib.js');
for (const [url, keys] of [['assets/far_gate.js', ['grooves', 'medallionTop', 'medallionLeft', 'medallionRight']], ['assets/glyph_stela.js', ['lens']]]) {
  const a = await ASSET(url, { keepHierarchy: true });
  const b = await ASSET(url, { keepHierarchy: true });
  const p = a.userData.parts || {};
  const ok = keys.every((k) => p[k] && p[k].isObject3D);
  const own = keys.every((k) => { let found = false; a.traverse((o) => { if (o === p[k]) found = true; }); return found; });
  const distinct = keys.every((k) => b.userData.parts[k] !== p[k]);
  const mats = keys.map((k) => { const ms = []; p[k].traverse((o) => o.isMesh && ms.push(o.material)); return ms; }).flat();
  const shared = mats.length !== new Set(mats).size;
  console.log(url, { partsResolve: ok, inOwnTree: own, perInstance: distinct, litMeshes: mats.length, sharedLitMaterial: shared,
    portal: a.userData.portal, lens: a.userData.lens, panel: a.userData.panel, native: a.children[0] && a.userData.nativeSize });
}
