// Throwaway scene module for look.html: three queue posts lined up with post/nextPost.
import build from '../queue_post_c.js';
export default function (THREE) {
  const g = new THREE.Group();
  let at = new THREE.Vector3();
  for (let i = 0; i < 3; i++) {
    const p = build(THREE);
    const [px, , pz] = p.userData.post, [nx, , nz] = p.userData.nextPost;
    p.position.set(at.x - px, 0, at.z - pz);
    g.add(p);
    at = new THREE.Vector3(at.x - px + nx, 0, at.z - pz + nz);
  }
  return g;
}
