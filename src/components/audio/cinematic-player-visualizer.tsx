import { useEffect, useRef } from "react";

import type { WaveformDataV1 } from "@/types/domain";

const DESKTOP_VISUALIZER_QUERY = "(min-width: 1280px)";
const TARGET_FRAME_INTERVAL_MS = 1000 / 30;
const PARTICLE_COUNT = 36;
const BAR_COUNT = 44;
const FLUID_RESOLUTION_SCALE = 0.68;
const MAX_OVERLAY_PIXEL_RATIO = 1.1;

const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_energy;
  uniform float u_body;
  uniform float u_detail;
  uniform float u_beat;
  uniform float u_seed;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    float a = hash21(cell);
    float b = hash21(cell + vec2(1.0, 0.0));
    float c = hash21(cell + vec2(0.0, 1.0));
    float d = hash21(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);
    for (int octave = 0; octave < 3; octave++) {
      value += amplitude * noise(point);
      point = rotation * point * 2.03 + 0.17;
      amplitude *= 0.5;
    }
    return value;
  }

  vec3 palette(float value) {
    vec3 base = vec3(0.52, 0.48, 0.54);
    vec3 amplitude = vec3(0.48, 0.48, 0.46);
    vec3 frequency = vec3(1.0);
    vec3 phase = vec3(0.03, 0.36, 0.68) + u_seed * 0.17;
    return base + amplitude * cos(6.28318 * (frequency * value + phase));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 point = uv - 0.5;
    point.x *= u_resolution.x / max(u_resolution.y, 1.0);
    point *= 1.38;
    float time = u_time * 0.105;
    vec2 firstWarp = vec2(
      fbm(point * 1.18 + vec2(time, -time * 0.72)),
      fbm(point * 1.18 + vec2(4.6 - time * 0.63, 1.9 + time * 0.42))
    );
    vec2 secondWarp = vec2(
      fbm(point * 1.55 + 2.6 * firstWarp + vec2(1.7, 7.2) + time * 0.37),
      fbm(point * 1.55 + 2.2 * firstWarp + vec2(8.3, 2.8) - time * 0.31)
    );
    float field = fbm(point * (1.52 + u_detail * 0.42) + 2.8 * secondWarp);
    float liquidContour = sin((field + firstWarp.x * 0.72 - secondWarp.y * 0.44) * 12.0 + time * 4.2);
    float fineContour = sin((field + length(secondWarp)) * 23.0 - time * 3.1);
    float colorPhase = field * 1.12 + firstWarp.x * 0.34 + secondWarp.y * 0.28 + u_time * 0.026;
    vec3 color = palette(colorPhase);
    color = mix(color, palette(colorPhase + 0.24 + u_detail * 0.16), 0.42 + 0.18 * liquidContour);
    color += palette(colorPhase + 0.53) * max(0.0, fineContour) * (0.08 + u_detail * 0.12);
    vec2 bloomPoint = point - vec2(sin(time * 0.72) * 1.2, cos(time * 0.58) * 0.22);
    float bloom = exp(-dot(bloomPoint, bloomPoint) * (0.72 - u_body * 0.18));
    float contours = smoothstep(0.72, 1.0, abs(liquidContour)) * (0.16 + u_detail * 0.15);
    float vignette = smoothstep(1.12, 0.12, length(point * vec2(0.54, 1.0)));
    float brightness = 0.46 + u_energy * 0.42 + u_beat * 0.34 + bloom * 0.28 + contours;
    color *= brightness;
    color += vec3(0.28, 0.16, 0.42) * bloom * (0.32 + u_body * 0.28);
    float grain = hash21(gl_FragCoord.xy + fract(u_time) * 91.7) - 0.5;
    color += grain * 0.025;
    float alpha = (0.54 + u_energy * 0.2 + bloom * 0.14) * (0.58 + vignette * 0.42);
    gl_FragColor = vec4(max(color, 0.0), alpha);
  }
`;

export interface WaveformDynamics {
  energy: number;
  body: number;
  detail: number;
  beat: number;
}

export function smoothWaveformDynamics(
  previous: WaveformDynamics,
  target: WaveformDynamics,
  deltaSeconds: number,
): WaveformDynamics {
  const blend = (from: number, to: number, speed: number) =>
    from + (to - from) * (1 - Math.exp(-Math.max(0, deltaSeconds) * speed));
  const beatSpeed = target.beat > previous.beat ? 12 : 3.6;

  return {
    energy: blend(previous.energy, target.energy, 4.4),
    body: blend(previous.body, target.body, 3.8),
    detail: blend(previous.detail, target.detail, 5.2),
    beat: blend(previous.beat, target.beat, beatSpeed),
  };
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  hueOffset: number;
  history: Array<[number, number]>;
}

interface FluidRenderer {
  resize: (width: number, height: number) => void;
  render: (time: number, dynamics: WaveformDynamics) => void;
  destroy: () => void;
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function peakMagnitude(peak: [number, number] | undefined) {
  return peak ? Math.max(Math.abs(peak[0]), Math.abs(peak[1])) : 0;
}

function averageMagnitude(peaks: Array<[number, number]>, start: number, end: number) {
  let total = 0;
  let count = 0;
  for (let index = start; index <= end; index += 1) {
    total += peakMagnitude(peaks[Math.min(peaks.length - 1, Math.max(0, index))]);
    count += 1;
  }
  return count ? total / count : 0;
}

export function sampleWaveformDynamics(
  waveform: WaveformDataV1 | null | undefined,
  currentTime: number,
  durationSeconds: number | null,
): WaveformDynamics {
  const peaks = waveform?.peaks ?? [];
  const duration = waveform?.durationSeconds || durationSeconds || 0;
  if (!peaks.length || duration <= 0) {
    const pulse = Math.pow(Math.max(0, Math.sin(currentTime * Math.PI * 1.16)), 5);
    const drift = 0.5 + Math.sin(currentTime * 0.47) * 0.5;
    return {
      energy: 0.3 + drift * 0.13 + pulse * 0.22,
      body: 0.26 + drift * 0.12,
      detail: 0.22 + Math.abs(Math.sin(currentTime * 0.83)) * 0.16,
      beat: pulse * 0.72,
    };
  }
  const progress = clamp(currentTime / duration);
  const index = Math.min(peaks.length - 1, Math.floor(progress * peaks.length));
  const energy = averageMagnitude(peaks, index - 1, index + 1);
  const body = averageMagnitude(peaks, index - 10, index + 10);
  const previousBody = averageMagnitude(peaks, index - 18, index - 6);
  let detail = 0;
  for (let offset = -5; offset <= 5; offset += 1) {
    const current = peakMagnitude(peaks[Math.min(peaks.length - 1, Math.max(0, index + offset))]);
    const previous = peakMagnitude(peaks[Math.min(peaks.length - 1, Math.max(0, index + offset - 1))]);
    detail += Math.abs(current - previous);
  }
  return {
    energy: clamp(0.12 + Math.pow(energy, 0.7) * 0.92),
    body: clamp(0.1 + Math.pow(body, 0.78) * 0.9),
    detail: clamp(0.08 + detail * 2.2),
    beat: clamp((energy - previousBody) * 4.8),
  };
}

function hashTrackId(trackId: string) {
  let hash = 2166136261;
  for (let index = 0; index < trackId.length; index += 1) {
    hash ^= trackId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let value = seed || 1;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createParticles(trackId: string) {
  const random = seededRandom(hashTrackId(trackId));
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: random(),
    y: random(),
    size: 0.65 + random() * 2.5,
    speed: 0.25 + random() * 0.7,
    phase: random() * Math.PI * 2,
    hueOffset: random() * 180,
    history: [],
  } satisfies Particle));
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createFluidRenderer(canvas: HTMLCanvasElement, seed: number): FluidRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
  if (!vertexShader || !fragmentShader) return null;
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  if (!program || !buffer) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, "u_resolution");
  const time = gl.getUniformLocation(program, "u_time");
  const energy = gl.getUniformLocation(program, "u_energy");
  const body = gl.getUniformLocation(program, "u_body");
  const detail = gl.getUniformLocation(program, "u_detail");
  const beat = gl.getUniformLocation(program, "u_beat");
  gl.uniform1f(gl.getUniformLocation(program, "u_seed"), seed);
  gl.clearColor(0, 0, 0, 0);
  return {
    resize(width, height) {
      gl.viewport(0, 0, width, height);
      gl.uniform2f(resolution, width, height);
    },
    render(nextTime, dynamics) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(time, nextTime);
      gl.uniform1f(energy, dynamics.energy);
      gl.uniform1f(body, dynamics.body);
      gl.uniform1f(detail, dynamics.detail);
      gl.uniform1f(beat, dynamics.beat);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    destroy() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    },
  };
}

function getWaveformLevel(
  waveform: WaveformDataV1 | null,
  currentTime: number,
  durationSeconds: number | null,
  barIndex: number,
) {
  const duration = waveform?.durationSeconds || durationSeconds || 0;
  const peaks = waveform?.peaks ?? [];
  if (!peaks.length || duration <= 0) {
    return 0.28 + Math.abs(Math.sin(currentTime * 1.7 + barIndex * 0.49)) * 0.5;
  }
  const center = Math.floor(clamp(currentTime / duration) * (peaks.length - 1));
  const spread = Math.max(1, Math.floor(peaks.length * 0.035));
  const offset = Math.round(((barIndex / Math.max(BAR_COUNT - 1, 1)) - 0.5) * spread * 2);
  return peakMagnitude(peaks[Math.min(peaks.length - 1, Math.max(0, center + offset))]);
}

function drawColorBlooms(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  dynamics: WaveformDynamics,
) {
  for (let index = 0; index < 3; index += 1) {
    const phase = time * (0.12 + index * 0.025) + index * 1.73;
    const x = width * (0.18 + index * 0.32 + Math.sin(phase) * 0.08);
    const y = height * (0.5 + Math.cos(phase * 1.31) * 0.31);
    const radius = width * (0.16 + dynamics.body * 0.08 + index * 0.012);
    const hue = (time * 21 + index * 88) % 360;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `hsla(${hue}, 100%, 68%, ${0.08 + dynamics.energy * 0.08})`);
    gradient.addColorStop(0.46, `hsla(${(hue + 45) % 360}, 100%, 58%, ${0.035 + dynamics.body * 0.05})`);
    gradient.addColorStop(1, `hsla(${hue}, 100%, 48%, 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }
}

function drawFlowingBands(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  dynamics: WaveformDynamics,
) {
  for (let band = 0; band < 3; band += 1) {
    const points: Array<[number, number]> = [];
    const thickness = height * (0.028 + band * 0.009 + dynamics.body * 0.045);
    for (let x = -30; x <= width + 30; x += 30) {
      const normalized = x / width;
      const y = height * (0.3 + band * 0.19)
        + Math.sin(normalized * Math.PI * (2.2 + band * 0.36) + time * (0.34 + band * 0.08))
          * height * (0.055 + dynamics.energy * 0.065)
        + Math.cos(normalized * Math.PI * 5.2 - time * 0.23 + band)
          * height * dynamics.detail * 0.026;
      points.push([x, y]);
    }
    context.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x, y - thickness);
      else context.lineTo(x, y - thickness);
    });
    for (let index = points.length - 1; index >= 0; index -= 1) {
      context.lineTo(points[index][0], points[index][1] + thickness);
    }
    context.closePath();
    const hue = (time * 24 + band * 76) % 360;
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `hsla(${hue}, 100%, 62%, 0)`);
    gradient.addColorStop(0.23, `hsla(${(hue + 54) % 360}, 100%, 66%, ${0.05 + dynamics.body * 0.05})`);
    gradient.addColorStop(0.62, `hsla(${(hue + 146) % 360}, 100%, 64%, ${0.075 + dynamics.energy * 0.07})`);
    gradient.addColorStop(1, `hsla(${(hue + 230) % 360}, 100%, 58%, 0)`);
    context.fillStyle = gradient;
    context.shadowColor = `hsla(${(hue + 80) % 360}, 100%, 64%, 0.32)`;
    context.shadowBlur = 7 + dynamics.beat * 8;
    context.fill();
  }
  context.shadowBlur = 0;
}

function drawFilledBars(
  context: CanvasRenderingContext2D,
  levels: Float32Array,
  waveform: WaveformDataV1 | null,
  currentTime: number,
  durationSeconds: number | null,
  width: number,
  height: number,
  dynamics: WaveformDynamics,
) {
  const gap = width / BAR_COUNT;
  const centerY = height * 0.54;
  const hue = (currentTime * 28) % 360;
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, `hsla(${hue}, 100%, 68%, 0.1)`);
  gradient.addColorStop(0.25, `hsla(${(hue + 64) % 360}, 100%, 68%, 0.48)`);
  gradient.addColorStop(0.52, `hsla(${(hue + 142) % 360}, 100%, 72%, 0.56)`);
  gradient.addColorStop(0.78, `hsla(${(hue + 224) % 360}, 100%, 65%, 0.46)`);
  gradient.addColorStop(1, `hsla(${(hue + 300) % 360}, 100%, 64%, 0.1)`);
  context.fillStyle = gradient;
  context.shadowColor = `hsla(${(hue + 110) % 360}, 100%, 68%, 0.52)`;
  context.shadowBlur = 6 + dynamics.beat * 9;
  for (let index = 0; index < BAR_COUNT; index += 1) {
    const waveformLevel = getWaveformLevel(waveform, currentTime, durationSeconds, index);
    const motion = 0.58 + Math.abs(Math.sin(currentTime * (1.1 + dynamics.detail * 0.42) + index * 0.41)) * 0.42;
    const target = clamp(0.09 + waveformLevel * 0.76 + dynamics.energy * 0.2) * motion;
    levels[index] += (target - levels[index]) * (0.12 + dynamics.beat * 0.14);
    const envelope = Math.pow(Math.sin((index / (BAR_COUNT - 1)) * Math.PI), 0.38);
    const barHeight = Math.max(4, levels[index] * height * 0.49 * envelope);
    const barWidth = Math.max(2.4, gap * 0.52);
    context.fillRect(index * gap + (gap - barWidth) / 2, centerY - barHeight / 2, barWidth, barHeight);
  }
  context.shadowBlur = 0;
}

function drawOrbitingStructures(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  dynamics: WaveformDynamics,
) {
  const centers: Array<[number, number]> = [[width * 0.18, height * 0.45], [width * 0.82, height * 0.52]];
  centers.forEach(([centerX, centerY], group) => {
    context.save();
    context.translate(centerX, centerY);
    context.rotate(time * (group ? -0.08 : 0.11));
    for (let ring = 0; ring < 2; ring += 1) {
      const hue = (time * 19 + group * 140 + ring * 48) % 360;
      context.beginPath();
      context.ellipse(
        0,
        0,
        width * (0.04 + ring * 0.027 + dynamics.body * 0.018),
        height * (0.1 + ring * 0.045 + dynamics.energy * 0.035),
        ring * 0.72,
        0,
        Math.PI * (1.36 + dynamics.detail * 0.28),
      );
      context.strokeStyle = `hsla(${hue}, 100%, 74%, ${0.08 + dynamics.energy * 0.09})`;
      context.lineWidth = 0.8 + ring * 0.35;
      context.shadowColor = `hsla(${hue}, 100%, 65%, 0.38)`;
      context.shadowBlur = 5;
      context.stroke();
    }
    context.restore();
  });
  context.shadowBlur = 0;
}

function drawParticles(
  context: CanvasRenderingContext2D,
  particles: Particle[],
  width: number,
  height: number,
  time: number,
  deltaSeconds: number,
  dynamics: WaveformDynamics,
) {
  for (const particle of particles) {
    const angle = Math.sin(particle.x * 8.4 + time * 0.34 + particle.phase)
      + Math.cos(particle.y * 7.1 - time * 0.29 + particle.phase * 0.7);
    const speed = particle.speed * deltaSeconds * (0.018 + dynamics.energy * 0.028);
    particle.x += Math.cos(angle) * speed;
    particle.y += Math.sin(angle) * speed - deltaSeconds * (0.005 + dynamics.body * 0.01);
    let wrapped = false;
    if (particle.x < -0.02) { particle.x = 1.02; wrapped = true; }
    if (particle.x > 1.02) { particle.x = -0.02; wrapped = true; }
    if (particle.y < -0.04) { particle.y = 1.04; wrapped = true; }
    if (particle.y > 1.04) { particle.y = -0.04; wrapped = true; }
    if (wrapped) particle.history.length = 0;
    particle.history.push([particle.x, particle.y]);
    if (particle.history.length > 4) particle.history.shift();
    const hue = (time * 30 + particle.hueOffset) % 360;
    if (particle.history.length > 1) {
      context.beginPath();
      particle.history.forEach(([x, y], index) => {
        if (index === 0) context.moveTo(x * width, y * height);
        else context.lineTo(x * width, y * height);
      });
      context.strokeStyle = `hsla(${hue}, 100%, 73%, ${0.05 + dynamics.detail * 0.1})`;
      context.lineWidth = particle.size * 0.58;
      context.stroke();
    }
    const shimmer = 0.55 + Math.sin(time * 1.8 + particle.phase) * 0.45;
    const radius = particle.size * (0.75 + dynamics.energy * 0.95 + shimmer * 0.35);
    context.beginPath();
    context.arc(particle.x * width, particle.y * height, radius, 0, Math.PI * 2);
    context.fillStyle = `hsla(${hue}, 100%, ${72 + shimmer * 14}%, ${0.14 + shimmer * 0.22})`;
    context.fill();
  }
  context.shadowBlur = 0;
}

export function CinematicPlayerVisualizer({
  active,
  isPlaying,
  currentTime,
  durationSeconds,
  waveform,
  trackId,
}: {
  active: boolean;
  isPlaying: boolean;
  currentTime: number;
  durationSeconds: number | null;
  waveform: WaveformDataV1 | null;
  trackId: string;
}) {
  const fluidCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackPositionRef = useRef({ seconds: currentTime, updatedAt: performance.now() });

  useEffect(() => {
    playbackPositionRef.current = { seconds: currentTime, updatedAt: performance.now() };
  }, [currentTime]);

  useEffect(() => {
    const fluidCanvas = fluidCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!fluidCanvas || !overlayCanvas || !active) return;
    const context = overlayCanvas.getContext("2d", { alpha: true });
    if (!context) return;
    const desktopQuery = window.matchMedia(DESKTOP_VISUALIZER_QUERY);
    const trackSeed = hashTrackId(trackId);
    const fluidRenderer = createFluidRenderer(fluidCanvas, (trackSeed % 10_000) / 10_000);
    const particles = createParticles(trackId);
    const barLevels = new Float32Array(BAR_COUNT);
    const shell = overlayCanvas.closest<HTMLElement>(".player-cinematic-shell");
    let frameId: number | null = null;
    let width = 0;
    let height = 0;
    let lastFrameAt = 0;
    let smoothedDynamics = sampleWaveformDynamics(waveform, currentTime, durationSeconds);
    let previousRawDynamics = smoothedDynamics;
    let beatEnvelope = 0;

    const resizeCanvases = () => {
      const bounds = overlayCanvas.getBoundingClientRect();
      const overlayPixelRatio = Math.min(window.devicePixelRatio || 1, MAX_OVERLAY_PIXEL_RATIO);
      const fluidPixelRatio = Math.min(1, overlayPixelRatio) * FLUID_RESOLUTION_SCALE;
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      fluidCanvas.width = Math.round(width * fluidPixelRatio);
      fluidCanvas.height = Math.round(height * fluidPixelRatio);
      overlayCanvas.width = Math.round(width * overlayPixelRatio);
      overlayCanvas.height = Math.round(height * overlayPixelRatio);
      context.setTransform(overlayPixelRatio, 0, 0, overlayPixelRatio, 0, 0);
      fluidRenderer?.resize(fluidCanvas.width, fluidCanvas.height);
    };

    const renderFrame = (now: number) => {
      frameId = null;
      if (!desktopQuery.matches || document.hidden || !width || !height) return;
      if (now - lastFrameAt < TARGET_FRAME_INTERVAL_MS) {
        frameId = window.requestAnimationFrame(renderFrame);
        return;
      }
      const deltaSeconds = Math.min(0.05, Math.max(0.001, (now - lastFrameAt) / 1000));
      lastFrameAt = now;
      const playbackPosition = playbackPositionRef.current;
      const elapsed = isPlaying ? Math.max(0, (now - playbackPosition.updatedAt) / 1000) : 0;
      const visualTime = playbackPosition.seconds + elapsed;
      const rawDynamics = sampleWaveformDynamics(waveform, visualTime, durationSeconds);
      smoothedDynamics = smoothWaveformDynamics(smoothedDynamics, rawDynamics, deltaSeconds);
      const transient = clamp(
        Math.max(0, rawDynamics.energy - previousRawDynamics.energy) * 9
        + Math.max(0, rawDynamics.beat - previousRawDynamics.beat) * 1.4,
      );
      beatEnvelope = transient > beatEnvelope
        ? beatEnvelope + (transient - beatEnvelope) * (1 - Math.exp(-deltaSeconds * 18))
        : beatEnvelope * Math.exp(-deltaSeconds * 4.8);
      previousRawDynamics = rawDynamics;
      const dynamics = { ...smoothedDynamics, beat: beatEnvelope };
      if (shell) {
        // Keep the exterior light in the same color phase as the visualizer itself.
        const ambientHue = (trackSeed % 360 + visualTime * 28 + dynamics.energy * 34) % 360;
        shell.style.setProperty("--cinematic-ambient-primary", `hsl(${ambientHue.toFixed(1)} 94% 60%)`);
        shell.style.setProperty("--cinematic-ambient-secondary", `hsl(${((ambientHue + 112) % 360).toFixed(1)} 90% 58%)`);
        shell.style.setProperty("--cinematic-ambient-tertiary", `hsl(${((ambientHue + 224) % 360).toFixed(1)} 88% 62%)`);
        shell.style.setProperty(
          "--cinematic-ambient-opacity",
          (0.3 + dynamics.energy * 0.12 + dynamics.beat * 0.04).toFixed(3),
        );
        shell.style.setProperty("--cinematic-ambient-scale", (1 + dynamics.beat * 0.045).toFixed(3));
        shell.style.setProperty("--cinematic-ripple-opacity", (dynamics.beat * 0.36).toFixed(3));
        shell.style.setProperty("--cinematic-ripple-scale", (1.004 + dynamics.beat * 0.028).toFixed(3));
        shell.style.setProperty("--cinematic-kick", `${(dynamics.beat * -1.8).toFixed(2)}px`);
      }
      fluidRenderer?.render(visualTime, dynamics);
      context.clearRect(0, 0, width, height);
      context.save();
      context.globalCompositeOperation = "lighter";
      drawColorBlooms(context, width, height, visualTime, dynamics);
      drawFlowingBands(context, width, height, visualTime, dynamics);
      drawFilledBars(context, barLevels, waveform, visualTime, durationSeconds, width, height, dynamics);
      drawOrbitingStructures(context, width, height, visualTime, dynamics);
      drawParticles(context, particles, width, height, visualTime, deltaSeconds, dynamics);
      context.restore();
      if (isPlaying) frameId = window.requestAnimationFrame(renderFrame);
    };

    const requestRender = () => {
      if (frameId === null && desktopQuery.matches && !document.hidden) {
        frameId = window.requestAnimationFrame(renderFrame);
      }
    };
    const observer = new ResizeObserver(() => {
      resizeCanvases();
      requestRender();
    });
    observer.observe(overlayCanvas);
    resizeCanvases();
    requestRender();
    document.addEventListener("visibilitychange", requestRender);
    desktopQuery.addEventListener("change", requestRender);
    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      observer.disconnect();
      document.removeEventListener("visibilitychange", requestRender);
      desktopQuery.removeEventListener("change", requestRender);
      fluidRenderer?.destroy();
      context.clearRect(0, 0, width, height);
      shell?.style.removeProperty("--cinematic-ambient-primary");
      shell?.style.removeProperty("--cinematic-ambient-secondary");
      shell?.style.removeProperty("--cinematic-ambient-tertiary");
      shell?.style.removeProperty("--cinematic-ambient-opacity");
      shell?.style.removeProperty("--cinematic-ambient-scale");
      shell?.style.removeProperty("--cinematic-ripple-opacity");
      shell?.style.removeProperty("--cinematic-ripple-scale");
      shell?.style.removeProperty("--cinematic-kick");
    };
  }, [active, durationSeconds, isPlaying, trackId, waveform]);

  if (!active) return null;
  return (
    <div className="player-cinematic-visualizer hidden xl:block" aria-hidden="true">
      <canvas ref={fluidCanvasRef} className="player-cinematic-fluid-canvas size-full" />
      <canvas ref={overlayCanvasRef} className="player-cinematic-overlay-canvas size-full" />
      <div className="player-cinematic-visualizer__veil" />
    </div>
  );
}
