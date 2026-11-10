import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeRandom, mod, pick, smoothstep } from '../lib/math';

// The sea floor and the story happen inside this box (x runs along Coralo's path).
export const X_MIN = -22;
export const X_MAX = 92;

const SAND = new THREE.Color('#E9CD8E');

// =====================================================================
// Sky / water backdrop
// =====================================================================
export const SeaBackdrop: React.FC<{ camPos: THREE.Vector3 }> = ({ camPos }) => {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(180, 32, 20);
    const pos = g.attributes.position;
    const colors: number[] = [];
    const top = new THREE.Color('#58D6E8');
    const mid = new THREE.Color('#1B9CCB');
    const low = new THREE.Color('#0A4E80');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i += 1) {
      const t = (pos.getY(i) / 180 + 1) / 2; // 0 bottom .. 1 top
      if (t > 0.5) c.copy(mid).lerp(top, (t - 0.5) * 2);
      else c.copy(low).lerp(mid, t * 2);
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, []);
  useLayoutEffect(() => {
    ref.current?.position.copy(camPos);
  });
  return (
    <mesh ref={ref} geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
};

// =====================================================================
// Ground
// =====================================================================
export const Ground: React.FC = () => {
  const geo = useMemo(() => {
    const w = 150;
    const d = 130;
    const g = new THREE.PlaneGeometry(w, d, 100, 86);
    g.rotateX(-Math.PI / 2);
    g.translate(35, 0, -38);
    const pos = g.attributes.position;
    const colors: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const corridor = smoothstep(1.5, 9, Math.abs(z)); // keep Coralo's path flat
      const dunes = 0.55 * Math.sin(x * 0.11 + z * 0.07) + 0.25 * Math.sin(x * 0.37 - z * 0.23);
      const ripple = 0.045 * Math.sin(x * 2.2 + Math.sin(z * 0.7) * 2);
      pos.setY(i, (dunes * corridor + ripple) * (0.25 + 0.75 * corridor));
      const shade = 0.9 + 0.1 * Math.sin(x * 0.5 + z * 0.4) + 0.05 * Math.sin(x * 2.2);
      c.copy(SAND).multiplyScalar(shade);
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
};

// =====================================================================
// Swaying seaweed (GPU sway, deterministic per frame)
// =====================================================================
export const Seaweed: React.FC<{ frame: number }> = ({ frame }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const { geo, material, count } = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.34, 1, 1, 9);
    g.translate(0, 0.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 1) {
      const y = p.getY(i);
      p.setX(i, p.getX(i) * (1 - y * 0.75));
    }
    g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float h = max(position.y, 0.0);
           float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.5;
           float hh = h * instanceMatrix[1][1];
           transformed.x += sin(uTime * 1.6 + ph + hh * 0.7) * 0.07 * hh * h;
           transformed.z += cos(uTime * 1.3 + ph * 1.3 + hh * 0.6) * 0.05 * hh * h;`,
        );
    };
    return { geo: g, material: m, count: 900 };
  }, [uniforms]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const r = makeRandom(1234);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const greens = ['#1FA36B', '#2BB673', '#17905F', '#3CC47C', '#0E8A6B'];
    for (let i = 0; i < count; i += 1) {
      // clumps, kept away from Coralo's walking line
      const x = X_MIN + r() * (X_MAX - X_MIN);
      const z = -3.5 - Math.pow(r(), 0.8) * 46;
      dummy.position.set(x, -0.05, z);
      dummy.rotation.set(0, r() * Math.PI, 0);
      const h = 1.3 + r() * 3.4 + (z < -14 ? r() * 4 : 0);
      dummy.scale.set(0.8 + r() * 0.8, h, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      col.set(pick(r, greens));
      m.setColorAt(i, col);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count]);

  useLayoutEffect(() => {
    uniforms.uTime.value = frame / 30;
  });

  return <instancedMesh ref={mesh} args={[geo, material, count]} frustumCulled={false} />;
};

// =====================================================================
// Corals and rocks
// =====================================================================
const branch = (
  rand: () => number,
  parts: THREE.BufferGeometry[],
  base: THREE.Vector3,
  dir: THREE.Vector3,
  len: number,
  rad: number,
  depth: number,
): void => {
  const g = new THREE.CylinderGeometry(rad * 0.72, rad, len, 5);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.applyQuaternion(q);
  g.translate(base.x, base.y, base.z);
  parts.push(g);
  const tip = base.clone().add(dir.clone().multiplyScalar(len));
  const ball = new THREE.SphereGeometry(rad * 0.72, 5, 4);
  ball.translate(tip.x, tip.y, tip.z);
  parts.push(ball);
  if (depth <= 0) return;
  const kids = depth > 1 ? 2 : 3;
  for (let i = 0; i < kids; i += 1) {
    const d = dir
      .clone()
      .add(new THREE.Vector3((rand() - 0.5) * 1.3, 0.25 + rand() * 0.3, (rand() - 0.5) * 1.3))
      .normalize();
    branch(rand, parts, tip, d, len * 0.74, rad * 0.7, depth - 1);
  }
};

const makeBranching = (seed: number): THREE.BufferGeometry => {
  const rand = makeRandom(seed);
  const parts: THREE.BufferGeometry[] = [];
  branch(rand, parts, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 0.9, 0.16, 2);
  const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  return merged ?? new THREE.BufferGeometry();
};

const makeTubes = (): THREE.BufferGeometry => {
  const rand = makeRandom(77);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i += 1) {
    const h = 0.7 + rand() * 1.1;
    const g = new THREE.CylinderGeometry(0.2, 0.26, h, 10, 1, true);
    g.translate((rand() - 0.5) * 0.9, h / 2, (rand() - 0.5) * 0.9);
    parts.push(g);
    const cap = new THREE.TorusGeometry(0.2, 0.045, 6, 12);
    cap.rotateX(Math.PI / 2);
    cap.translate(g.attributes.position.getX(0) * 0, 0, 0);
    parts.push(cap);
  }
  const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  return merged ?? new THREE.BufferGeometry();
};

export const Reef: React.FC = () => {
  const branching = useRef<THREE.InstancedMesh>(null);
  const branching2 = useRef<THREE.InstancedMesh>(null);
  const tubes = useRef<THREE.InstancedMesh>(null);
  const rocks = useRef<THREE.InstancedMesh>(null);
  const pebbles = useRef<THREE.InstancedMesh>(null);

  const geos = useMemo(() => {
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    const rand = makeRandom(9);
    const p = rockGeo.attributes.position;
    for (let i = 0; i < p.count; i += 1) {
      const k = 0.85 + rand() * 0.3;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k);
    }
    rockGeo.computeVertexNormals();
    return {
      b1: makeBranching(5),
      b2: makeBranching(41),
      tubes: makeTubes(),
      rock: rockGeo,
      pebble: new THREE.IcosahedronGeometry(1, 0),
    };
  }, []);

  useLayoutEffect(() => {
    const place = (
      mesh: THREE.InstancedMesh | null,
      count: number,
      seed: number,
      colors: string[],
      opts: { scale: [number, number]; zMin: number; zMax: number; sink?: number; flat?: number },
    ) => {
      if (!mesh) return;
      const r = makeRandom(seed);
      const d = new THREE.Object3D();
      const c = new THREE.Color();
      for (let i = 0; i < count; i += 1) {
        const x = X_MIN + r() * (X_MAX - X_MIN);
        const z = opts.zMin + r() * (opts.zMax - opts.zMin);
        const s = opts.scale[0] + r() * (opts.scale[1] - opts.scale[0]);
        d.position.set(x, -(opts.sink ?? 0.05), z);
        d.rotation.set(0, r() * 6.28, 0);
        d.scale.set(s, s * (opts.flat ?? 1), s);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
        c.set(pick(r, colors));
        mesh.setColorAt(i, c);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    place(branching.current, 46, 11, ['#FF7FA3', '#F7607C', '#FF9A5A', '#FF6F91'], {
      scale: [0.9, 2.2], zMin: -34, zMax: -3.5,
    });
    place(branching2.current, 38, 12, ['#C46BE0', '#A855D8', '#E07BE8', '#8E5BE0'], {
      scale: [0.8, 2.0], zMin: -34, zMax: -3.5,
    });
    place(tubes.current, 26, 13, ['#FFB84D', '#FFD04D', '#FF9F4D'], {
      scale: [0.8, 1.6], zMin: -30, zMax: -3.5,
    });
    place(rocks.current, 36, 14, ['#3F8FA8', '#4A9AB0', '#35788F', '#5AA0A8'], {
      scale: [0.9, 3.6], zMin: -44, zMax: -4.5, sink: 0.35, flat: 0.8,
    });
    place(pebbles.current, 120, 15, ['#CDB88E', '#B7A27B', '#D8C79F', '#9E8B66'], {
      scale: [0.08, 0.24], zMin: -14, zMax: 8, sink: 0.04, flat: 0.7,
    });
  }, []);

  const std = (roughness: number) => (
    <meshStandardMaterial roughness={roughness} flatShading />
  );
  return (
    <group>
      <instancedMesh ref={branching} args={[geos.b1, undefined, 46]} frustumCulled={false}>
        {std(0.7)}
      </instancedMesh>
      <instancedMesh ref={branching2} args={[geos.b2, undefined, 38]} frustumCulled={false}>
        {std(0.7)}
      </instancedMesh>
      <instancedMesh ref={tubes} args={[geos.tubes, undefined, 26]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.6} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={rocks} args={[geos.rock, undefined, 36]} frustumCulled={false} castShadow receiveShadow>
        {std(0.95)}
      </instancedMesh>
      <instancedMesh ref={pebbles} args={[geos.pebble, undefined, 120]} frustumCulled={false}>
        {std(1)}
      </instancedMesh>
    </group>
  );
};

// =====================================================================
// Bubbles, marine snow, light shafts
// =====================================================================
export const Bubbles: React.FC<{ frame: number }> = ({ frame }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const r = makeRandom(2024);
    return Array.from({ length: 260 }, () => ({
      x: X_MIN + r() * (X_MAX - X_MIN),
      z: -30 + r() * 42,
      y0: r() * 24,
      v: 0.02 + r() * 0.05,
      s: 0.05 + r() * 0.17,
      w: 0.2 + r() * 0.5,
      ph: r() * 6.28,
    }));
  }, []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    data.forEach((b, i) => {
      const y = mod(b.y0 + b.v * frame, 24);
      d.position.set(
        b.x + Math.sin(frame * 0.05 + b.ph) * b.w,
        y,
        b.z + Math.cos(frame * 0.04 + b.ph) * b.w,
      );
      d.scale.setScalar(b.s * (0.7 + 0.3 * smoothstep(0, 2, y)));
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 260]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial
        color="#DFF8FF"
        transparent
        opacity={0.38}
        roughness={0.05}
        emissive="#9BE3FF"
        emissiveIntensity={0.25}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

export const MarineSnow: React.FC<{ frame: number }> = ({ frame }) => {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const r = makeRandom(31);
    const arr: number[] = [];
    for (let i = 0; i < 3500; i += 1) {
      arr.push(X_MIN + r() * (X_MAX - X_MIN), r() * 18, -34 + r() * 44);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return g;
  }, []);
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.position.set(Math.sin(frame * 0.01) * 0.6, Math.sin(frame * 0.017) * 0.3, 0);
    }
  });
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial color="#FFFFFF" size={0.07} sizeAttenuation transparent opacity={0.5} depthWrite={false} />
    </points>
  );
};

export const LightShafts: React.FC<{ frame: number; camPos: THREE.Vector3 }> = ({
  frame,
  camPos,
}) => {
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 256;
    const ctx = cv.getContext('2d');
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.18)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 256);
      const h = ctx.createLinearGradient(0, 0, 64, 0);
      h.addColorStop(0, 'rgba(0,0,0,1)');
      h.addColorStop(0.5, 'rgba(0,0,0,0)');
      h.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = h;
      ctx.fillRect(0, 0, 64, 256);
    }
    return new THREE.CanvasTexture(cv);
  }, []);
  useLayoutEffect(() => {
    if (!group.current) return;
    group.current.position.set(camPos.x, 0, 0);
    group.current.children.forEach((c, i) => {
      const mesh = c as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.16 + 0.1 * Math.sin(frame * 0.02 + i * 1.7);
      mesh.rotation.z = -0.32 + 0.05 * Math.sin(frame * 0.013 + i);
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-26 + i * 6.5, 15, -16 - (i % 3) * 7]} rotation={[0, 0, -0.32]}>
          <planeGeometry args={[4 + (i % 3) * 2, 38]} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={0.18}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            fog={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

// =====================================================================
// Fish and jellyfish
// =====================================================================
const makeFishGeometry = (): THREE.BufferGeometry => {
  const body = new THREE.SphereGeometry(0.5, 10, 7);
  body.scale(1, 0.55, 0.42);
  const tail = new THREE.ConeGeometry(0.28, 0.55, 3);
  tail.rotateZ(Math.PI / 2);
  tail.scale(1, 1, 0.3);
  tail.translate(-0.62, 0, 0);
  const fin = new THREE.ConeGeometry(0.14, 0.34, 3);
  fin.translate(0.05, 0.36, 0);
  const parts = [body, tail, fin].map((g) => (g.index ? g.toNonIndexed() : g));
  return mergeGeometries(parts) ?? body;
};

type School = {
  x: number; y: number; z: number; v: number; dir: 1 | -1; scale: number;
  color: string; count: number; seed: number;
};
const SCHOOLS: School[] = [
  { x: 4, y: 5.5, z: -6, v: 0.11, dir: 1, scale: 0.55, color: '#FFD23F', count: 14, seed: 1 },
  { x: 24, y: 7.2, z: -9, v: -0.08, dir: -1, scale: 0.75, color: '#7FB5FF', count: 10, seed: 2 },
  { x: 40, y: 4.4, z: -4, v: 0.13, dir: 1, scale: 0.5, color: '#FF9AC8', count: 16, seed: 3 },
  { x: 58, y: 6.4, z: -8, v: 0.09, dir: 1, scale: 0.8, color: '#5EE0B2', count: 9, seed: 4 },
  { x: 74, y: 5.0, z: -5, v: -0.1, dir: -1, scale: 0.62, color: '#FFB05C', count: 12, seed: 5 },
];

export const Fish: React.FC<{ frame: number }> = ({ frame }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(makeFishGeometry, []);
  const total = SCHOOLS.reduce((a, s) => a + s.count, 0);
  const offsets = useMemo(
    () =>
      SCHOOLS.map((s) => {
        const r = makeRandom(s.seed * 17);
        return Array.from({ length: s.count }, () => ({
          ox: (r() - 0.5) * 5,
          oy: (r() - 0.5) * 2.6,
          oz: (r() - 0.5) * 3.4,
          ph: r() * 6.28,
          k: 0.8 + r() * 0.5,
        }));
      }),
    [],
  );
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    let idx = 0;
    SCHOOLS.forEach((s, si) => {
      const loop = 130;
      const cx = X_MIN + mod(s.x - X_MIN + s.v * frame, loop);
      offsets[si].forEach((o) => {
        d.position.set(
          cx + o.ox + Math.sin(frame * 0.05 + o.ph) * 0.4,
          s.y + o.oy + Math.sin(frame * 0.07 + o.ph) * 0.25,
          s.z + o.oz,
        );
        d.rotation.set(0, (s.dir === 1 ? 0 : Math.PI) + Math.sin(frame * 0.35 + o.ph) * 0.12, 0);
        d.scale.setScalar(s.scale * o.k);
        d.updateMatrix();
        m.setMatrixAt(idx, d.matrix);
        col.set(s.color);
        m.setColorAt(idx, col);
        idx += 1;
      });
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geo, undefined, total]} frustumCulled={false}>
      <meshStandardMaterial roughness={0.4} metalness={0.1} />
    </instancedMesh>
  );
};

export const Jellyfish: React.FC<{ frame: number }> = ({ frame }) => {
  const items = useMemo(
    () => [
      { x: 8, y: 7.5, z: -12, s: 1.2, c: '#E58BFF', ph: 0 },
      { x: 30, y: 8.8, z: -10, s: 0.9, c: '#8FD3FF', ph: 2 },
      { x: 46, y: 7.0, z: -14, s: 1.5, c: '#FFA6D5', ph: 4 },
      { x: 66, y: 8.2, z: -9, s: 1.0, c: '#B9A6FF', ph: 1 },
    ],
    [],
  );
  return (
    <group>
      {items.map((j, i) => {
        const pulse = 1 + 0.14 * Math.sin(frame * 0.12 + j.ph);
        const drift = Math.sin(frame * 0.012 + j.ph) * 2.0;
        const bob = Math.sin(frame * 0.05 + j.ph) * 0.5;
        return (
          <group key={i} position={[j.x + drift, j.y + bob, j.z]} scale={j.s}>
            <mesh scale={[1, 0.75 * pulse, 1]}>
              <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial
                color={j.c}
                transparent
                opacity={0.55}
                emissive={j.c}
                emissiveIntensity={0.35}
                roughness={0.2}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            {Array.from({ length: 7 }, (_, k) => {
              const a = (k / 7) * Math.PI * 2;
              const sway = Math.sin(frame * 0.1 + j.ph + k) * 0.22;
              return (
                <mesh
                  key={k}
                  position={[Math.cos(a) * 0.6, -1.0, Math.sin(a) * 0.6]}
                  rotation={[sway, 0, sway * 0.8]}
                >
                  <cylinderGeometry args={[0.03, 0.015, 2.0, 5]} />
                  <meshStandardMaterial color={j.c} transparent opacity={0.6} emissive={j.c} emissiveIntensity={0.3} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};
