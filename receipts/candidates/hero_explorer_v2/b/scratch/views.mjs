// Throwaway: node views.mjs <name> <src-relative-to-far-door> <set> [poseName] -> writes jobs json on stdout
// sets: body (4 full views), upper (upper body 6 views), hand (left hand close-ups), rhand, elbow, skirt
const [, , tag, src, set, poseName = 'rest'] = process.argv;
const POSES = {
  rest: {},
  hang: { leftUpperArm: [-2.9], rightUpperArm: [-2.9] },
  run: { leftUpperLeg: [-1.0], leftLowerLeg: [1.2], rightUpperLeg: [0.6], rightLowerLeg: [0.3],
         leftUpperArm: [0.6], leftLowerArm: [-1.4], rightUpperArm: [-0.7], rightLowerArm: [-0.4] },
  push: { leftUpperArm: [-1.4], rightUpperArm: [-1.4], leftLowerArm: [-0.5], rightLowerArm: [-0.5] },
  tpose: { leftUpperArm: [0, 0, 1.5], rightUpperArm: [0, 0, -1.5] },
  elbow: { leftLowerArm: [-2.27], rightLowerArm: [-2.27] },
  flex: { leftHand: [0.6, 0, 0.4], rightHand: [0.6, 0, 0.4] },
  flexm: { leftHand: [0.6, 0, 0.4], rightHand: [0.6, 0, -0.4] },
  back45: { leftUpperArm: [0.785], rightUpperArm: [0.785] },
  fwd80: { leftUpperArm: [-1.4], rightUpperArm: [-1.4] },
  legs: { leftUpperLeg: [-1.05], rightUpperLeg: [0.61] },
  legs2: { leftUpperLeg: [0.61], rightUpperLeg: [-1.05] },
};
const pose = POSES[poseName];
const ring = (t, d, h, n = 4, a0 = 0) => Array.from({ length: n }, (_, i) => {
  const a = a0 + (i * Math.PI * 2) / n;
  return { pos: [t[0] + Math.sin(a) * d, t[1] + h, t[2] + Math.cos(a) * d], target: t, fov: 30 };
});
let views, tile = 420, cols;
if (set === 'body') views = ring([0, 0.9, 0], 4.2, 1.2, 4).concat(ring([0, 0.9, 0], 4.2, 1.6, 1, Math.PI / 4)), cols = 5;
if (set === 'upper') views = ring([0, 1.25, 0.02], 2.1, 0.5, 6), cols = 3;
if (set === 'hand') views = ring([0.3, 0.87, 0.14], 0.55, 0.12, 6, Math.PI / 2 - Math.PI / 3), cols = 3;
if (set === 'rhand') views = ring([-0.3, 0.87, 0.14], 0.55, 0.12, 6, -Math.PI / 2 - Math.PI / 3), cols = 3;
if (set === 'shoulder') views = ring([0.2, 1.4, 0.0], 1.0, 0.3, 6, 0), cols = 3;
if (set === 'skirt') views = ring([0, 0.85, 0.0], 1.8, 0.15, 6, 0), cols = 3;
if (set === 'raised') views = ring([0, 1.62, 0.02], 2.5, 0.35, 6), cols = 3;
if (set === 'tp') views = ring([0, 1.35, 0.0], 2.7, 0.45, 6), cols = 3;
if (set === 'lsh') views = [0, 45, 90, 135, 180].map((d) => ({ pos: [0.21 + Math.sin(d * Math.PI / 180) * 1.1, 1.62, Math.cos(d * Math.PI / 180) * 1.1], target: [0.21, 1.38, 0], fov: 30 })).concat([{ pos: [0.9, 2.4, 0.5], target: [0.21, 1.38, 0], fov: 30 }]), cols = 3;
if (set === 'lelbow') views = [0, 60, 90, 120, 180, 270].map((d) => ({ pos: [0.25 + Math.sin(d * Math.PI / 180) * 0.9, 1.2, 0.05 + Math.cos(d * Math.PI / 180) * 0.9], target: [0.25, 1.15, 0.05], fov: 30 })), cols = 3;
if (set === 'lhand') views = [0, 60, 90, 120, 180, 30].map((d, i) => ({ pos: [0.29 + Math.sin(d * Math.PI / 180) * 0.75, i === 5 ? 0.55 : 0.95, 0.12 + Math.cos(d * Math.PI / 180) * 0.75], target: [0.29, 0.86, 0.12], fov: 30 })), cols = 3;
if (set === 'low') views = ring([0, 0.8, 0.0], 1.9, -0.35, 6, 0), cols = 3;
console.log(JSON.stringify([{ out: `shots/${tag}_${set}_${poseName}.png`, src, pose, views, tile, cols }]));
