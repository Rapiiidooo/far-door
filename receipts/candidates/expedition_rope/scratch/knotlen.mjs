import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/game/vendor/three.module.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KN = [[-0.02, 0.085, 0], [-0.03, 0.04, 0.006], [-0.016, 0.0, 0.042], [0.036, -0.034, 0.04], [0.068, 0.004, -0.004], [0.042, 0.05, -0.044],
    [-0.024, 0.058, -0.04], [-0.066, 0.02, 0.0], [-0.05, -0.022, 0.048], [0.002, -0.03, 0.062], [0.042, -0.008, 0.024], [0.026, -0.05, -0.026],
    [0.004, -0.095, -0.004], [0.0, -0.13, 0.008]].map(([x, y, z]) => V(x, y, z));
const cr = new THREE.CatmullRomCurve3(KN, false, 'centripetal');
console.log('knot length', cr.getLength().toFixed(3), 'points at 1.6cm', Math.round(cr.getLength() / 0.016));
