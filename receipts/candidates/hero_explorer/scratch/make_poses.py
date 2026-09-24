# Throwaway: copy a candidate into scratch/posed_*.js with a pose applied at the very end.
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
  'posed_hang': """  const PJ = g.userData.joints;
  PJ.leftUpperArm.rotation.x = -2.9;
  PJ.rightUpperArm.rotation.x = -2.9;
""",
  'posed_run': """  const PJ = g.userData.joints;
  PJ.leftUpperLeg.rotation.x = -0.6;
  PJ.rightUpperLeg.rotation.x = 0.5;
  PJ.leftLowerLeg.rotation.x = 0.7;
  PJ.rightLowerLeg.rotation.x = 0.7;
  PJ.leftUpperArm.rotation.x = 0.5;
  PJ.rightUpperArm.rotation.x = -0.6;
  PJ.leftLowerArm.rotation.x = -0.9;
  PJ.rightLowerArm.rotation.x = -0.9;
""",
  'posed_look': """  const PJ = g.userData.joints;
  PJ.spine.rotation.x = 0.3;
  PJ.head.rotation.set(0.25, 0.6, 0);
  PJ.scarfTail.rotation.set(0.6, 0, 0.35);
  PJ.leftUpperArm.rotation.z = 0.9;
  PJ.rightUpperArm.rotation.z = -0.9;
""",
}
for name, pose in POSES.items():
    out = src[: -len(tail)] + "\n  // ---- scratch pose: " + name + " ----\n" + pose + REGROUND + tail
    open(f'scratch/{name}.js', 'w').write(out)
    print('wrote scratch/' + name + '.js')
