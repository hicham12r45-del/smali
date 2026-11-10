import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { staticFile } from 'remotion';
import { clamp, deg } from '../lib/math';
import { Pose3D, charPos, charYaw, poseAt } from './path3d';

const MODEL_URL = staticFile('models/coralo.glb');

// Parts of the exported model that are hidden so the video look matches the final design.
const HIDDEN = [/^Tooth_/, /^Eyelash_/, /^Buckle/, /^Button/];

// Final colours (sRGB) applied on top of the exported materials.
const RECOLOR: Record<string, string> = {
  M_body: '#FF7430',
  M_limb: '#F2602B',
  M_pore: '#B4421A',
  M_spot: '#9A45C4',
  M_glove: '#FF8A4C',
  M_sock: '#6B3FD1',
  M_sock_stripe: '#A583F0',
  M_shoe: '#8C5CE8',
  M_sole: '#2A1550',
  M_shorts: '#1E8C8F',
  M_belt: '#D9B26A',
};

const AX = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};
export const rot = (axis: 'x' | 'y' | 'z', a: number): THREE.Quaternion =>
  new THREE.Quaternion().setFromAxisAngle(AX[axis], a);
const mul = (...qs: THREE.Quaternion[]): THREE.Quaternion =>
  qs.reduce((acc, q) => acc.multiply(q), new THREE.Quaternion());

export type Rig = {
  root: THREE.Group;
  bones: Record<string, THREE.Bone>;
  order: THREE.Bone[];
  lids: THREE.Mesh[];
  brows: THREE.Mesh[];
  mouthIn: THREE.Mesh;
};

export const buildRig = (scene: THREE.Group): Rig => {
  const root = new THREE.Group();
  root.add(scene);
  let skeleton: THREE.Skeleton | null = null;

  scene.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      if (HIDDEN.some((re) => re.test(mesh.name))) mesh.visible = false;
      if (mesh.isSkinnedMesh && !skeleton) skeleton = mesh.skeleton;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        const hex = RECOLOR[std.name];
        if (hex) std.color.set(hex);
        if (std.name === 'M_body') {
          std.roughness = 0.82;
        }
      });
    }
  });
  if (!skeleton) throw new Error('Coralo GLB has no skeleton');

  const bones: Record<string, THREE.Bone> = {};
  const order = (skeleton as THREE.Skeleton).bones;
  order.forEach((b) => {
    bones[b.name] = b;
    b.userData.restQ = b.quaternion.clone();
    b.userData.restS = b.scale.clone();
  });

  // ---- extra face parts (eyelids, eyebrows, open mouth) hang on the Body bone
  const body = bones.Body;
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#FF7A33', roughness: 0.8 });
  const browMat = new THREE.MeshStandardMaterial({ color: '#3B1A0E', roughness: 0.5 });
  const lids: THREE.Mesh[] = [];
  const brows: THREE.Mesh[] = [];
  [-1, 1].forEach((side) => {
    const cx = side * 0.42;
    const lid = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), bodyMat);
    lid.position.set(cx, 1.55, 0.48);
    lid.castShadow = false;
    lid.visible = false;
    body.add(lid);
    lids.push(lid);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cx - 0.27, 2.0, 0.47),
      new THREE.Vector3(cx, 2.1, 0.5),
      new THREE.Vector3(cx + 0.27, 2.0, 0.47),
    ]);
    const brow = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.042, 8, false), browMat);
    brow.position.set(0, 0, 0);
    brow.userData.baseY = 0;
    body.add(brow);
    brows.push(brow);
  });

  const shape = new THREE.Shape();
  shape.moveTo(-0.62, 0);
  shape.quadraticCurveTo(0, -0.6, 0.62, 0);
  shape.quadraticCurveTo(0, 0.08, -0.62, 0);
  const mouthIn = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 16),
    new THREE.MeshBasicMaterial({ color: '#5E0F1C' }),
  );
  mouthIn.position.set(0, 0.92, 0.462);
  mouthIn.visible = false;
  body.add(mouthIn);

  return { root, bones, order, lids, brows, mouthIn };
};

export const setBone = (
  bone: THREE.Bone,
  delta: THREE.Quaternion,
  scale?: THREE.Vector3,
): void => {
  const parent = bone.parent as THREE.Bone | null;
  const parentQ: THREE.Quaternion =
    parent && parent.userData.modelQ ? parent.userData.modelQ : new THREE.Quaternion();
  const restQ: THREE.Quaternion = bone.userData.restQ;
  const desired = delta.clone().multiply(parentQ).multiply(restQ);
  bone.userData.modelQ = desired;
  bone.quaternion.copy(parentQ.clone().invert().multiply(desired));
  if (scale) bone.scale.copy(bone.userData.restS).multiply(scale);
};

export const applyPose = (rig: Rig, f: number, camPos: THREE.Vector3): void => {
  const p: Pose3D = poseAt(f);
  const pos = charPos(f);
  const yaw = charYaw(f);

  rig.root.position.set(pos.x, p.hop, pos.z);
  rig.root.rotation.set(0, yaw, 0);

  const s = Math.sin(p.phase);
  const c = Math.cos(p.phase);
  const w = p.walk;
  const wv = p.wave;
  const legAmp = deg(30) * w;
  const idle = Math.sin(f * 0.12);

  const I = new THREE.Quaternion();
  const sq = 1 + 0.03 * Math.cos(p.phase * 2) * w - 0.012 * idle * (1 - w);
  const squash = new THREE.Vector3(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));

  // body: forward lean, side-to-side roll, squash and stretch
  const lean = deg(7) * w;
  const bodyDelta = mul(rot('x', lean), rot('z', 0.05 * s * w));
  const bones = rig.bones;
  const set = (name: string, q: THREE.Quaternion, sc?: THREE.Vector3) => {
    const b = bones[name];
    if (b) setBone(b, q, sc);
  };

  set('Root', I);
  set('Hips', rot('y', 0.06 * s * w));
  set('Body', bodyDelta, squash);

  // legs: forward swing is a NEGATIVE rotation about X
  const fL = legAmp * s;
  const fR = -legAmp * s;
  set('Leg_L', rot('x', -fL));
  set('Leg_R', rot('x', -fR));
  set('Foot_L', rot('x', fL * 0.9 - Math.max(0, s) * 0.35 * w));
  set('Foot_R', rot('x', fR * 0.9 - Math.max(0, -s) * 0.35 * w));

  // arms: opposite to the legs; the left arm leaves the swing to wave
  const armAmp = deg(30) * w * (1 - wv);
  const aL = armAmp * s; // left arm forward angle follows the left leg's opposite
  const aR = -armAmp * s;
  const bendL = -(0.25 + 0.55 * Math.max(0, -aL / deg(30)) * w);
  const bendR = -(0.25 + 0.55 * Math.max(0, -aR / deg(30)) * w);
  // The exported file stores the left arm already raised (the wave pose), so "hanging"
  // is an offset from it: +80 deg on the upper arm, +67 deg on the forearm (rotation about Z).
  const hangUp = deg(80) * (1 - wv);
  const hangFore = deg(67) * (1 - wv);
  const flap = Math.sin(p.wavePhase) * deg(26) * wv;
  set('Arm_L_Upper', mul(rot('x', aL), rot('z', hangUp)));
  set('Arm_L_Fore', mul(rot('x', bendL * (1 - wv)), rot('z', hangFore + flap)));
  set('Hand_L', rot('z', flap * 0.5));
  set('Arm_R_Upper', rot('x', aR));
  set('Arm_R_Fore', rot('x', bendR));
  set('Hand_R', I);

  // eyes look at the camera
  const eyeWorld = new THREE.Vector3(pos.x, 2.45, pos.z);
  const toCam = camPos.clone().sub(eyeWorld);
  const local = toCam.clone().applyAxisAngle(AX.y, -yaw);
  const lookYaw = clamp(Math.atan2(local.x, Math.max(0.2, local.z)), -0.55, 0.55);
  const lookPitch = clamp(Math.atan2(local.y - 0.2, Math.hypot(local.x, local.z)), -0.3, 0.3);
  const look = mul(rot('y', lookYaw), rot('x', -lookPitch));
  set('Eye_L', look);
  set('Eye_R', look);

  set('Mouth', I);
  set('Sprout_1', mul(rot('z', 0.12 * p.sway - 0.14 * w), rot('x', 0.07 * Math.sin(f * 0.07))));
  set('Sprout_2', mul(rot('z', 0.1 * Math.sin(f * 0.09 - 0.8)), rot('x', 0.05 * Math.sin(f * 0.07 - 0.8))));

  // eyelids: scale down from the top edge
  rig.lids.forEach((lid) => {
    const k = clamp(p.blink);
    const ry = 0.41;
    lid.visible = k > 0.03;
    lid.scale.set(0.37, ry * k, 0.2);
    lid.position.y = 1.55 + ry * (1 - k);
  });
  rig.brows.forEach((b) => {
    b.position.y = 0.07 * p.mouth + 0.05 * wv - 0.02 * p.blink;
  });
  rig.mouthIn.visible = p.mouth > 0.03;
  rig.mouthIn.scale.set(1, Math.max(0.01, p.mouth), 1);

  rig.root.updateMatrixWorld(true);
};

export const CoraloModel: React.FC<{ frame: number; camPos: THREE.Vector3 }> = ({
  frame,
  camPos,
}) => {
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const rig = useMemo(() => buildRig(cloneSkinned(gltf.scene) as THREE.Group), [gltf]);
  const ref = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    applyPose(rig, frame, camPos);
  });

  return <primitive ref={ref} object={rig.root} />;
};

