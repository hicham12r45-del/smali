import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { continueRender, delayRender } from 'remotion';
import { loadCairo } from '../lib/fonts';
import { mod } from '../lib/math';
import { DOOR_FRONT_Z, HOUSE_X, HOUSE_Z } from './path3d';

// Profile of the shell (radius, height). The whorls get smaller toward the tip.
const PROFILE: Array<[number, number]> = [
  [0.01, 0], [6.9, 0], [7.3, 1.2], [7.35, 2.6], [6.9, 4.0], [6.0, 4.9], [6.15, 5.5],
  [6.0, 6.8], [5.3, 8.0], [4.4, 8.7], [4.5, 9.2], [4.3, 10.2], [3.5, 11.1], [2.6, 11.5],
  [2.7, 11.9], [2.4, 12.7], [1.6, 13.4], [0.7, 13.8], [0.01, 14.0],
];

const profilePoints = (): THREE.Vector2[] =>
  new THREE.SplineCurve(PROFILE.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(90);

const radiusAt = (pts: THREE.Vector2[], y: number): number => {
  for (let i = 1; i < pts.length; i += 1) {
    if (pts[i].y >= y) {
      const a = pts[i - 1];
      const b = pts[i];
      const t = (y - a.y) / Math.max(1e-6, b.y - a.y);
      return a.x + (b.x - a.x) * t;
    }
  }
  return 0.2;
};

const archShape = (w: number, rectH: number): THREE.Shape => {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(-r, rectH);
  s.absarc(0, rectH, r, Math.PI, 0, true);
  s.lineTo(r, 0);
  s.lineTo(-r, 0);
  return s;
};

// Labels are created once, outside React, so a suspended render can never leak a delayRender().
const labelTextures = new Map<string, THREE.Texture>();
const labelJobs = new Map<string, Promise<void>>();

const startLabel = (
  text: string, w: number, h: number, size: number, fg: string, bg: string,
): Promise<void> => {
  const key = `${text}|${w}|${h}|${size}|${fg}|${bg}`;
  const existing = labelJobs.get(key);
  if (existing) return existing;
  const handle = delayRender('Preparing label: ' + text);
  const job = loadCairo()
    .then(() => document.fonts.load(`900 ${size}px Cairo`, text))
    .then(() => {
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = fg;
        ctx.font = `900 ${size}px Cairo, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.direction = 'rtl';
        ctx.fillText(text, w / 2, h / 2 + size * 0.06);
      }
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      labelTextures.set(key, t);
    })
    .catch((e) => console.error(e))
    .finally(() => continueRender(handle));
  labelJobs.set(key, job);
  return job;
};

/** Prepares every label used by the house before the first frame is drawn. */
export const preloadLabels = (): Promise<unknown> =>
  Promise.all([
    startLabel('بيت كورالو', 512, 128, 84, '#FFF4D8', '#C98543'),
    startLabel('أهلاً بك', 384, 112, 64, '#FFF4D8', '#7A4519'),
  ]);

const useLabel = (
  text: string, w: number, h: number, size: number, fg: string, bg: string,
): THREE.Texture | null => {
  const key = `${text}|${w}|${h}|${size}|${fg}|${bg}`;
  const job = startLabel(text, w, h, size, fg, bg);
  const [, bump] = useState(0);
  useEffect(() => {
    let alive = true;
    job.then(() => {
      if (alive) bump((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [job]);
  return labelTextures.get(key) ?? null;
};

export const Home: React.FC<{ frame: number; door: number; lights: number }> = ({
  frame,
  door,
  lights,
}) => {
  const pts = useMemo(profilePoints, []);
  const shellGeo = useMemo(() => new THREE.LatheGeometry(pts, 64), [pts]);
  const rib = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      Array.from({ length: 220 }, (_, i) => {
        const t = i / 219;
        const y = 0.5 + t * 12.8;
        const a = 0.4 + t * 3.5 * Math.PI * 2;
        const r = radiusAt(pts, y) + 0.05;
        return new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
      }),
    );
    return new THREE.TubeGeometry(curve, 260, 0.14, 6, false);
  }, [pts]);

  const porchGeo = useMemo(
    () => new THREE.ExtrudeGeometry(archShape(3.7, 3.0), { depth: 1.8, bevelEnabled: false, curveSegments: 24 }),
    [],
  );
  const openingGeo = useMemo(() => new THREE.ShapeGeometry(archShape(2.9, 2.6), 24), []);
  const panelGeo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(archShape(2.9, 2.6), { depth: 0.16, bevelEnabled: false, curveSegments: 24 });
    g.translate(1.45, 0, 0);
    return g;
  }, []);

  const nameTex = useLabel('بيت كورالو', 512, 128, 84, '#FFF4D8', '#C98543');
  const signTex = useLabel('أهلاً بك', 384, 112, 64, '#FFF4D8', '#7A4519');

  const glow = 0.35 + 0.65 * lights;
  const hinge = -(Math.PI * 0.56) * door;
  const bubbles = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = bubbles.current;
    if (!m) return;
    const d = new THREE.Object3D();
    for (let i = 0; i < 8; i += 1) {
      const age = mod(frame * 0.9 + i * 20, 160);
      d.position.set(-0.4 + Math.sin(age * 0.07 + i) * 0.35, age * 0.045, 0.1 * Math.cos(age * 0.05 + i));
      d.scale.setScalar(0.12 + age * 0.0035);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  const winY = 7.2;
  const winR = radiusAt(pts, winY);
  const win2Y = 10.0;
  const win2R = radiusAt(pts, win2Y);

  return (
    <group position={[HOUSE_X, 0, HOUSE_Z]}>
      {/* shell */}
      <mesh geometry={shellGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#FFA9C4" roughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={rib} castShadow>
        <meshStandardMaterial color="#FFE3EC" roughness={0.5} />
      </mesh>

      {/* round windows */}
      {[
        { y: winY, r: winR, a: 0.62, s: 1.0 },
        { y: win2Y, r: win2R, a: -0.5, s: 0.7 },
      ].map((w, i) => (
        <group key={i} rotation={[0, w.a, 0]}>
          <mesh position={[0, w.y, w.r + 0.03]}>
            <circleGeometry args={[0.95 * w.s, 32]} />
            <meshBasicMaterial color="#FFD98A" transparent opacity={0.3 + 0.7 * glow} />
          </mesh>
          <mesh position={[0, w.y, w.r + 0.06]}>
            <torusGeometry args={[0.95 * w.s, 0.17 * w.s, 10, 32]} />
            <meshStandardMaterial color="#E0A63A" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, w.y, w.r + 0.08]}>
            <boxGeometry args={[1.9 * w.s, 0.1, 0.08]} />
            <meshStandardMaterial color="#E0A63A" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, w.y, w.r + 0.08]}>
            <boxGeometry args={[0.1, 1.9 * w.s, 0.08]} />
            <meshStandardMaterial color="#E0A63A" metalness={0.6} roughness={0.35} />
          </mesh>
          <pointLight position={[0, w.y, w.r + 1.2]} color="#FFC866" intensity={6 * glow * w.s} distance={9} decay={2} />
        </group>
      ))}

      {/* chimney with bubbles */}
      <group position={[-1.6, 11.2, 2.5]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.5, 0.58, 2.4, 20]} />
          <meshStandardMaterial color="#2C9AA0" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.25, 0]}>
          <torusGeometry args={[0.52, 0.12, 8, 20]} />
          <meshStandardMaterial color="#3CB6BC" roughness={0.5} />
        </mesh>
        <group position={[0, 1.5, 0]}>
          <instancedMesh ref={bubbles} args={[undefined, undefined, 8]} frustumCulled={false}>
            <sphereGeometry args={[1, 12, 9]} />
            <meshStandardMaterial color="#DFF8FF" transparent opacity={0.45} roughness={0.05} />
          </instancedMesh>
        </group>
      </group>

      {/* porch, opening and swinging door */}
      <group position={[0, 0, 6.1]}>
        <mesh geometry={porchGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#F4E7C8" roughness={0.8} />
        </mesh>
      </group>
      <mesh geometry={openingGeo} position={[0, 0, DOOR_FRONT_Z - HOUSE_Z + 0.01]}>
        <meshBasicMaterial color="#FFE9A8" />
      </mesh>
      <group position={[-1.45, 0, DOOR_FRONT_Z - HOUSE_Z + 0.02]} rotation={[0, hinge, 0]}>
        <mesh geometry={panelGeo} castShadow>
          <meshStandardMaterial color="#B5651D" roughness={0.7} />
        </mesh>
        {[0.55, 1.45, 2.35].map((x) => (
          <mesh key={x} position={[x, 1.9, 0.17]}>
            <boxGeometry args={[0.07, 3.6, 0.03]} />
            <meshStandardMaterial color="#8A4A14" roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[2.5, 1.6, 0.22]}>
          <sphereGeometry args={[0.13, 14, 10]} />
          <meshStandardMaterial color="#FFC733" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>
      <pointLight position={[0, 2.4, DOOR_FRONT_Z - HOUSE_Z + 1.4]} color="#FFD27A" intensity={90 * door} distance={16} decay={2} />

      {/* name plate */}
      <group position={[0, 5.6, DOOR_FRONT_Z - HOUSE_Z + 0.35]}>
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[3.4, 0.9]} />
          <meshBasicMaterial map={nameTex ?? undefined} color={nameTex ? '#FFFFFF' : '#C98543'} />
        </mesh>
        <mesh position={[0, 0, -0.04]}>
          <boxGeometry args={[3.55, 1.05, 0.08]} />
          <meshStandardMaterial color="#7A4519" roughness={0.8} />
        </mesh>
      </group>

      {/* steps and stones */}
      <mesh position={[0, 0.12, DOOR_FRONT_Z - HOUSE_Z + 1.1]} receiveShadow>
        <boxGeometry args={[5, 0.24, 2.0]} />
        <meshStandardMaterial color="#E6D5AA" roughness={0.9} />
      </mesh>
      {[-3.2, -5.6, -8.2, -11.0].map((x, i) => (
        <mesh key={x} position={[x, 0.03, DOOR_FRONT_Z - HOUSE_Z + 1.2 + (i % 2) * 0.5]} scale={[1.1, 0.12, 0.7]}>
          <cylinderGeometry args={[1, 1, 1, 20]} />
          <meshStandardMaterial color="#D9C89E" roughness={0.95} />
        </mesh>
      ))}

      {/* mailbox, lantern and flowers on the right side of the porch */}
      <group position={[4.4, 0, DOOR_FRONT_Z - HOUSE_Z + 1.0]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 1.8, 8]} />
          <meshStandardMaterial color="#8A5A2B" />
        </mesh>
        <mesh position={[0, 1.95, 0]} castShadow>
          <capsuleGeometry args={[0.38, 0.55, 6, 14]} />
          <meshStandardMaterial color="#6B3FD1" roughness={0.5} />
        </mesh>
        <mesh position={[0.34, 2.25, 0]}>
          <boxGeometry args={[0.06, 0.4, 0.06]} />
          <meshStandardMaterial color="#FF5A3C" />
        </mesh>
      </group>
      <group position={[7.2, 0, DOOR_FRONT_Z - HOUSE_Z + 0.2]}>
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 3.2, 8]} />
          <meshStandardMaterial color="#5A3A1E" />
        </mesh>
        <mesh position={[0, 3.35, 0]}>
          <sphereGeometry args={[0.32, 16, 12]} />
          <meshBasicMaterial color="#FFE08A" transparent opacity={0.55 + 0.45 * lights} />
        </mesh>
        <pointLight position={[0, 3.3, 0]} color="#FFD27A" intensity={14 * glow} distance={12} decay={2} />
      </group>
      {[2.9, 6.0].map((x, i) => (
        <group key={x} position={[x, 0, DOOR_FRONT_Z - HOUSE_Z + 1.9 + i * 0.2]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.38, 0.28, 0.6, 14]} />
            <meshStandardMaterial color="#E8744F" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.9, 6]} />
            <meshStandardMaterial color="#2FA36B" />
          </mesh>
          <mesh position={[Math.sin(frame * 0.05 + x) * 0.05, 1.4, 0]}>
            <sphereGeometry args={[0.24, 12, 10]} />
            <meshStandardMaterial color={i === 0 ? '#FFE86B' : '#FF8FB5'} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* welcome sign near the path */}
      <group position={[-6.2, 0, DOOR_FRONT_Z - HOUSE_Z + 2.6]} rotation={[0, 0.25, 0]}>
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 1.8, 8]} />
          <meshStandardMaterial color="#8A5A2B" />
        </mesh>
        <mesh position={[0, 1.9, 0.05]}>
          <planeGeometry args={[2.0, 0.6]} />
          <meshBasicMaterial map={signTex ?? undefined} color={signTex ? '#FFFFFF' : '#7A4519'} />
        </mesh>
        <mesh position={[0, 1.9, -0.04]}>
          <boxGeometry args={[2.1, 0.7, 0.07]} />
          <meshStandardMaterial color="#5A3A1E" />
        </mesh>
      </group>
    </group>
  );
};
