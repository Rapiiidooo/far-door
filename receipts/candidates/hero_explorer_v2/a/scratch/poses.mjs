// Throwaway: the pose table shared by collide.mjs and make_poses.mjs.
// Values are joint rotations [x, y, z] applied on top of the rest pose.
export const POSES = {
  hang: { leftUpperArm: [-2.9, 0, 0], rightUpperArm: [-2.9, 0, 0] },
  run: {
    leftUpperArm: [0.6, 0, 0], leftLowerArm: [-1.4, 0, 0], rightUpperArm: [-0.7, 0, 0], rightLowerArm: [-0.4, 0, 0],
    leftUpperLeg: [-1.0, 0, 0], leftLowerLeg: [1.2, 0, 0], rightUpperLeg: [0.6, 0, 0], rightLowerLeg: [0.3, 0, 0],
  },
  runmirror: {
    rightUpperArm: [0.6, 0, 0], rightLowerArm: [-1.4, 0, 0], leftUpperArm: [-0.7, 0, 0], leftLowerArm: [-0.4, 0, 0],
    rightUpperLeg: [-1.0, 0, 0], rightLowerLeg: [1.2, 0, 0], leftUpperLeg: [0.6, 0, 0], leftLowerLeg: [0.3, 0, 0],
  },
  push: { leftUpperArm: [-1.4, 0, 0], rightUpperArm: [-1.4, 0, 0], leftLowerArm: [-0.5, 0, 0], rightLowerArm: [-0.5, 0, 0] },
  tpose: { leftUpperArm: [0, 0, 1.5], rightUpperArm: [0, 0, -1.5] },
  elbow130: { leftLowerArm: [-2.27, 0, 0], rightLowerArm: [-2.27, 0, 0] },
  handflex: { leftHand: [0.6, 0, 0.4], rightHand: [0.6, 0, 0.4] },
  back45: { leftUpperArm: [0.785, 0, 0], rightUpperArm: [0.785, 0, 0] },
  thighs: { leftUpperLeg: [-1.047, 0, 0], rightUpperLeg: [0.611, 0, 0] },
  thighsmirror: { rightUpperLeg: [-1.047, 0, 0], leftUpperLeg: [0.611, 0, 0] },
};
// the first pass's own pose set (hero_explorer/scratch/make_poses.py), for a like-for-like comparison
export const FIRST_PASS = {
  fp_hang: { leftUpperArm: [-2.9, 0, 0], rightUpperArm: [-2.9, 0, 0] },
  fp_run: {
    leftUpperLeg: [-0.6, 0, 0], rightUpperLeg: [0.5, 0, 0], leftLowerLeg: [0.7, 0, 0], rightLowerLeg: [0.7, 0, 0],
    leftUpperArm: [0.5, 0, 0], rightUpperArm: [-0.6, 0, 0], leftLowerArm: [-0.9, 0, 0], rightLowerArm: [-0.9, 0, 0],
  },
  fp_look: {
    spine: [0.3, 0, 0], head: [0.25, 0.6, 0], scarfTail: [0.6, 0, 0.35], leftUpperArm: [0, 0, 0.9], rightUpperArm: [0, 0, -0.9],
  },
};
export const apply = (g, pose) => {
  for (const [k, r] of Object.entries(pose)) g.userData.joints[k].rotation.set(r[0], r[1], r[2]);
  g.updateMatrixWorld(true);
};
