# Coralo's Journey Home (رحلة كورالو إلى البيت)

A 24-second Remotion film (1920x1080, 30 fps, 720 frames) in which the original character
**Coralo** walks across the sea floor to his spiral-shell home.

* `MyComposition` - the **3D film** (uses the rigged model `public/models/coralo.glb`)
* `Journey2D` - the earlier 2D version (pure SVG)

## Story (frames @ 30 fps)
| Time | Beat |
|------|------|
| 0:00-0:02 | Coralo waves hello, Arabic title appears |
| 0:02-0:19 | Walks through the reef (side-tracking camera, fish, jellyfish, bubbles, light shafts) |
| 0:19-0:21 | Arrives, door opens, warm light spills out |
| 0:21-0:23 | Greets the viewer, two joyful hops, turns and walks inside |
| 0:23-0:24 | Door closes, "وأخيراً.. في البيت!", fade out |

## Render
```bash
npm install
npm run build          # -> out/video.mp4  (3D film)
```
Or run the **Render Remotion Video** workflow in GitHub Actions (inputs: composition, scale)
and download the `video` artifact. 3D frames are rendered on the CPU, expect roughly
25-40 minutes for the full film. Use `scale = 0.5` for a quick preview.

## How the 3D works
- `src/three/CoraloModel.tsx` loads the GLB, recolours it to the final design, hides the old
  teeth/lashes/buckle parts, adds eyelids, eyebrows and an open mouth, then poses the 18 bones
  every frame from `src/three/path3d.ts` (walk cycle, wave, hops, eyes follow the camera).
- `src/three/Environment3D.tsx` sea floor, seaweed, reef, fish, jellyfish, bubbles, light shafts.
- `src/three/House3D.tsx` the shell house (door, windows, chimney, lamp, Arabic signs).
- `src/three/Scene3D.tsx` lights, camera, and the per-frame render.
- `src/lib/timeline.ts` all timing constants (change a beat in one place).
- `public/audio/sea-journey.wav` synced soundtrack (`tools/make-audio.py` regenerates it).
- Cairo font (Arabic + Latin) is bundled in `public/fonts`, no network needed.

## Notes
- Antialiasing is off on purpose: software WebGL is unreliable with MSAA at 1080p.
- Each frame is copied from the WebGL canvas to a 2D canvas (`#coralo-mirror`) and Remotion waits
  for that copy (`src/three/frameSync.ts`), which makes the screenshots deterministic.
- `blender/coralo.py` rebuilds the rigged 3D model (`blender -b -P blender/coralo.py`).
