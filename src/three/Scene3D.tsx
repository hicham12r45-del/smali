import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { smoothstep } from '../lib/math';
import { CoraloModel } from './CoraloModel';
import {
  Bubbles, Fish, Ground, Jellyfish, LightShafts, MarineSnow, Reef, SeaBackdrop, Seaweed,
} from './Environment3D';
import { Home } from './House3D';
import { endFrame } from './frameSync';
import { cameraAt, charPos, doorAmount } from './path3d';

const FOG = '#0E78AB';

/** Moves the camera and the sun for the current frame, then forces a render. */
const Rig: React.FC<{ frame: number }> = ({ frame }) => {
  const { camera, scene, gl } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);

  useLayoutEffect(() => {
    const shot = cameraAt(frame);
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.copy(shot.position);
    cam.fov = shot.fov;
    cam.near = 0.1;
    cam.far = 400;
    cam.lookAt(shot.target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);

    const c = charPos(frame);
    if (sun.current) {
      sun.current.position.set(c.x - 10, 30, c.z + 14);
      sun.current.target.position.set(c.x, 0, c.z);
      sun.current.target.updateMatrixWorld(true);
    }
  });

  // runs last (siblings' layout effects fire first), so the canvas is up to date
  // before Remotion takes its screenshot.
  useLayoutEffect(() => {
    gl.render(scene, camera);
    // wait for the (software) GPU to finish so the screenshot sees the final image
    const ctx = gl.getContext();
    ctx.finish();
    // Copy the WebGL image into a plain 2D canvas: screenshots of software WebGL canvases
    // are unreliable, but a 2D canvas is always captured correctly.
    const mirror = document.getElementById('coralo-mirror') as HTMLCanvasElement | null;
    const ctx2d = mirror ? mirror.getContext('2d') : null;
    if (mirror && ctx2d) ctx2d.drawImage(gl.domElement, 0, 0, mirror.width, mirror.height);
    endFrame(frame);
  });

  return (
    <>
      <directionalLight
        ref={sun}
        color="#FFF6E0"
        intensity={2.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
      />
      {sun.current ? <primitive object={sun.current.target} /> : null}
    </>
  );
};

export const Scene3D: React.FC<{ frame: number }> = ({ frame }) => {
  const shot = useMemo(() => cameraAt(frame), [frame]);
  const door = doorAmount(frame);
  const lights = smoothstep(560, 640, frame);
  const targetRef = useRef<THREE.Object3D>(null);

  return (
    <>
      <color attach="background" args={[FOG]} />
      <fogExp2 attach="fog" args={[FOG, 0.026]} />
      <hemisphereLight args={['#BFEFFF', '#C9A860', 1.15]} />
      <directionalLight color="#7FC8FF" intensity={0.6} position={[10, 8, -30]} />
      <object3D ref={targetRef} />

      <SeaBackdrop camPos={shot.position} />
      <Ground />
      <Seaweed frame={frame} />
      <Reef />
      <Fish frame={frame} />
      <Jellyfish frame={frame} />
      <Bubbles frame={frame} />
      <MarineSnow frame={frame} />
      <LightShafts frame={frame} camPos={shot.position} />
      <Home frame={frame} door={door} lights={lights} />
      <CoraloModel frame={frame} camPos={shot.position} />

      <Rig frame={frame} />
    </>
  );
};
