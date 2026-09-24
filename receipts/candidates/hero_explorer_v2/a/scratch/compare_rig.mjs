// Throwaway: joint positions of the in-game hero next to this candidate, plus the loader's box.
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';
for (const f of process.argv.slice(2)) {
  const g = (await import(pathToFileURL(path.resolve(f)).href)).default(THREE);
  g.updateMatrixWorld(true);
  const J = g.userData.joints, w = (k) => J[k].getWorldPosition(new THREE.Vector3()).toArray().map((x) => x.toFixed(3)).join(',');
  const lb = new THREE.Box3().setFromObject(g);
  console.log(path.basename(f), '| hips', w('hips'), '| lUpperArm', w('leftUpperArm'), '| lLowerArm', w('leftLowerArm'),
    '| grip', JSON.stringify(g.userData.grip), '| loader box y', lb.min.y.toFixed(3), lb.max.y.toFixed(3), '| joints', Object.keys(J).length);
}
