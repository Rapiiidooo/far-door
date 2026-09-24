# Throwaway: copy a candidate into scratch/posed_*.js with a pose applied at the very end.
#   python3 make_poses.py ../warden_c.js
import sys
src = open(sys.argv[1]).read()
tail = "  return g;\n}\n"
assert src.endswith(tail)
REGROUND = """
  // re-ground after posing so the verifier measures the pose, not the rest frame
  {
    const b = new THREE.Box3(), w = new THREE.Vector3();
    g.updateMatrixWorld(true);
    g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
      for (let i = 0; i < p.count; i++) b.expandByPoint(w.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld)); });
    const c = b.getCenter(new THREE.Vector3());
    g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= b.min.y; o.position.z -= c.z; });
  }
"""
POSES = {
  'posed_walk': """  const PJ = g.userData.joints;
  PJ.leftLeg.rotation.x = -0.5;
  PJ.rightLeg.rotation.x = 0.5;
  PJ.leftArm.rotation.x = 0.5;
  PJ.rightArm.rotation.x = -0.5;
""",
  'posed_slam': """  const PJ = g.userData.joints;
  PJ.rightArm.rotation.x = -2.6;
  PJ.body.rotation.x = -0.2;
""",
}
for name, pose in POSES.items():
    out = src[: -len(tail)] + "\n  // ---- scratch pose: " + name + " ----\n" + pose + REGROUND + tail
    open(f'{name}.js', 'w').write(out)
    print('wrote scratch/' + name + '.js')
