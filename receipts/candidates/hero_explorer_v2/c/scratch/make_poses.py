# Throwaway: copy the candidate into scratch/poses/posed_*.js with a pose applied at the very end.
import os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, '..', 'hero_explorer_c.js')).read()
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
  'hang': {'leftUpperArm': (-2.9, 0, 0), 'rightUpperArm': (-2.9, 0, 0)},
  'run': {'leftUpperLeg': (-1.0, 0, 0), 'leftLowerLeg': (1.2, 0, 0), 'rightUpperLeg': (0.6, 0, 0), 'rightLowerLeg': (0.3, 0, 0),
          'leftUpperArm': (0.6, 0, 0), 'leftLowerArm': (-1.4, 0, 0), 'rightUpperArm': (-0.7, 0, 0), 'rightLowerArm': (-0.4, 0, 0)},
  'run_mirror': {'rightUpperLeg': (-1.0, 0, 0), 'rightLowerLeg': (1.2, 0, 0), 'leftUpperLeg': (0.6, 0, 0), 'leftLowerLeg': (0.3, 0, 0),
                 'rightUpperArm': (0.6, 0, 0), 'rightLowerArm': (-1.4, 0, 0), 'leftUpperArm': (-0.7, 0, 0), 'leftLowerArm': (-0.4, 0, 0)},
  'push': {'leftUpperArm': (-1.4, 0, 0), 'rightUpperArm': (-1.4, 0, 0), 'leftLowerArm': (-0.5, 0, 0), 'rightLowerArm': (-0.5, 0, 0)},
  't': {'leftUpperArm': (0, 0, 1.5), 'rightUpperArm': (0, 0, -1.5)},
  'elbow130': {'leftLowerArm': (-2.27, 0, 0), 'rightLowerArm': (-2.27, 0, 0)},
  'hand_flex': {'leftHand': (0.6, 0, 0.4), 'rightHand': (0.6, 0, 0.4)},
  'arms_back45': {'leftUpperArm': (0.785, 0, 0), 'rightUpperArm': (0.785, 0, 0)},
  'thighs_60_35': {'leftUpperLeg': (-1.047, 0, 0), 'rightUpperLeg': (0.611, 0, 0)},
}
out_dir = os.path.join(here, 'poses')
os.makedirs(out_dir, exist_ok=True)
for name, pose in POSES.items():
    lines = "  const PJ = g.userData.joints;\n" + "".join(
        f"  PJ.{j}.rotation.set({x}, {y}, {z});\n" for j, (x, y, z) in pose.items())
    out = src[: -len(tail)] + "\n  // ---- scratch pose: " + name + " ----\n" + lines + REGROUND + tail
    open(os.path.join(out_dir, f'posed_{name}.js'), 'w').write(out)
    print('wrote poses/posed_' + name + '.js')
