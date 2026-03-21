import type * as THREE from "three";

export function resetBoneScales(object: THREE.Object3D) {
  object.traverse((node) => {
    if ((node as THREE.Bone).isBone) {
      node.scale.set(1, 1, 1);
    }
  });
}
