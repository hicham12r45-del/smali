"""Generates public/audio/sea-journey.wav (24 s) synced to src/lib/timeline.ts.
Run:  python3 tools/make-audio.py   (needs numpy)"""
import math, os, wave
import numpy as np

SR, FPS, TOTAL = 44100, 30, 720
START_X, DOOR_X = 520, 6400
STOP_X = DOOR_X - 270
WALK_START, WALK_END = 52, 560
RAMP_UP, RAMP_DOWN = 50, 110
FR = WALK_END - WALK_START
D = STOP_X - START_X
VMAX = D / (FR - (RAMP_UP + RAMP_DOWN) / 2)
ENTER_START, ENTER_END = 656, 700
STEP_CYCLE = 250

def smooth(a, b, v):
    t = min(1, max(0, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)

def walk_distance(f):
    t = min(max(f - WALK_START, 0), FR)
    if t < RAMP_UP: return VMAX * t * t / (2 * RAMP_UP)
    if t <= FR - RAMP_DOWN: return VMAX * (RAMP_UP / 2 + (t - RAMP_UP))
    rest = FR - t
    return D - VMAX * rest * rest / (2 * RAMP_DOWN)

def char_x(f):
    return START_X + walk_distance(f) + smooth(ENTER_START, ENTER_END, f) * 300

N = int(SR * TOTAL / FPS)
t_axis = np.arange(N) / SR
mix = np.zeros(N)
rng = np.random.default_rng(7)

def add(sig, t0):
    i = int(t0 * SR)
    if i >= N: return
    j = min(N, i + len(sig))
    mix[i:j] += sig[: j - i]

def pluck(freq, dur=0.5, amp=0.18):
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t * 7.0) * np.minimum(1, t * 400)
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2 * t) + 0.12 * np.sin(2 * np.pi * freq * 3 * t)
    return amp * env * s

def sweep(f0, f1, dur, amp=0.2, decay=9.0):
    t = np.arange(int(SR * dur)) / SR
    freq = f0 + (f1 - f0) * (t / dur)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return amp * np.sin(phase) * np.exp(-t * decay) * np.minimum(1, t * 500)

def lowpass(x, k):
    out = np.cumsum(x)
    out = (out[k:] - out[:-k]) / k
    return np.concatenate([out, np.zeros(k)])

# 1) underwater rumble + slow pad
noise = lowpass(rng.standard_normal(N), 60)
mix += 0.9 * noise * (0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * t_axis))
for fq, a in ((130.81, 0.045), (196.0, 0.035), (293.66, 0.03), (329.63, 0.025)):
    lfo = 0.7 + 0.3 * np.sin(2 * np.pi * (0.13 + fq / 4000) * t_axis)
    mix += a * lfo * (np.sin(2 * np.pi * fq * t_axis) + np.sin(2 * np.pi * fq * 1.004 * t_axis))

# 2) cheerful marimba-style tune while walking
notes = [523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33]
bass = [130.81, 130.81, 174.61, 196.0]
beat = 0.25
t = WALK_START / FPS
k = 0
while t < WALK_END / FPS + 0.5:
    add(pluck(notes[k % len(notes)], 0.45, 0.13), t)
    if k % 2 == 0:
        add(pluck(bass[(k // 2) % len(bass)], 0.5, 0.16), t)
    t += beat
    k += 1

# 3) footsteps: a soft bloop every half step cycle
prev_phase = 0
for f in range(1, TOTAL):
    speed = char_x(f) - char_x(f - 1)
    ph = (char_x(f) - START_X) / (STEP_CYCLE / 2)
    if int(ph) != int(prev_phase) and speed > 2.5:
        amp = min(1, speed / 9) * 0.16
        add(sweep(260, 120, 0.1, amp, 26), f / FPS)
    prev_phase = ph

# 4) random bubbles
for _ in range(34):
    tt = rng.uniform(0.5, 22)
    add(sweep(rng.uniform(500, 900), rng.uniform(1100, 1700), 0.09, 0.05, 30), tt)

# 5) door, joy and arrival
t_open = 572 / FPS
creak = lowpass(rng.standard_normal(int(SR * 1.2)), 25) * np.linspace(0, 1, int(SR * 1.2)) ** 2 * 0.5
add(creak, t_open)
for fq, a in ((880, 0.2), (1320, 0.12), (1760, 0.06)):
    tt = np.arange(int(SR * 1.6)) / SR
    add(a * np.sin(2 * np.pi * fq * tt) * np.exp(-tt * 3.2), 608 / FPS)
for fr in (612, 632):
    add(sweep(220, 700, 0.18, 0.22, 7), fr / FPS)
for i, fq in enumerate((523.25, 659.25, 783.99, 1046.5)):
    add(pluck(fq, 0.7, 0.2), (640 + i * 5) / FPS)
for fq in (261.63, 329.63, 392.0, 523.25):
    add(pluck(fq, 1.6, 0.14), 690 / FPS)
add(sweep(110, 45, 0.25, 0.4, 14), 712 / FPS)

# fade in/out, normalise, write
fade = np.minimum(1, t_axis / 0.4) * np.minimum(1, (TOTAL / FPS - t_axis) / 0.6)
mix *= fade
mix = mix / max(1e-9, np.max(np.abs(mix))) * 0.8
pcm = (mix * 32767).astype(np.int16)
os.makedirs('public/audio', exist_ok=True)
with wave.open('public/audio/sea-journey.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote public/audio/sea-journey.wav', len(pcm) / SR, 's')
