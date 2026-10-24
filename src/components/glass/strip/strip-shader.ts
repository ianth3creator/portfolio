/**
 * Strip card shader (docs/projects-strip.md §6). Everything is in mesh-local CSS px;
 * the mesh group sits at the stage centre and the camera is orthographic (1 unit = 1px),
 * so perspective is faked here. One shader, per-card uniforms.
 */

export const stripVertex = /* glsl */ `
uniform float uIndex;      // this card's index
uniform float uProgress;   // strip position in card units
uniform float uPitch;      // card width + gap, px
uniform vec2 uSize;        // card width, height in px
uniform float uVel;        // smoothed velocity, -1..1
uniform float uTime;
uniform float uRadiusRest; // cylinder radius at rest (gentle curve)
uniform float uRadiusFast; // cylinder radius at full speed (tighter)
uniform float uFocal;      // fake perspective focal length
uniform float uWaveY;      // wave height, px
uniform float uWaveZ;      // wave depth, px
uniform float uWaveK;      // wave spatial frequency, rad/px
uniform float uOpen;       // 0 → 1: unbend and zoom (only on the opened card)
uniform float uOpenScale;  // zoom factor reached at uOpen = 1

varying vec2 vUv;
varying vec2 vLocal;
varying float vTheta;

void main() {
  vUv = uv;
  vec2 local = position.xy * uSize;            // the shared plane is 1×1
  float bend = 1.0 - uOpen;                     // opening flattens everything

  float X = (uIndex - uProgress) * uPitch * bend + local.x * mix(1.0, uOpenScale, uOpen);
  float Y = local.y * mix(1.0, uOpenScale, uOpen);

  // 1. bend onto the inside of a cylinder: the edges recede
  float R = mix(uRadiusRest, uRadiusFast, abs(uVel));
  float th = (X / R) * bend;
  float Xb = mix(X, R * sin(X / R), bend);
  float Z = -R * (1.0 - cos(th));

  // 2. velocity wave: the ribbon S-curve, only while moving
  Y += uVel * uWaveY * sin(X * uWaveK + uTime * 0.6) * bend;
  Z += abs(uVel) * uWaveZ * cos(X * uWaveK) * bend;

  // 3. fake perspective
  float s = uFocal / (uFocal - Z);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(Xb * s, Y * s, Z * 0.01, 1.0);

  vTheta = th;
  vLocal = local;
}`;

export const stripFragment = /* glsl */ `
uniform sampler2D uTex;
uniform float uReveal;     // 0 → paper, 1 → texture (fades in when the image arrives)
uniform vec3 uPaper;
uniform vec2 uSize;
uniform float uRadius;     // corner radius, px
uniform float uVel;
uniform float uOpen;
uniform float uDim;        // 0 → 1: fade to paper (the other cards while one opens)

varying vec2 vUv;
varying vec2 vLocal;
varying float vTheta;

// signed distance to a rounded rectangle centred on 0, in px
float roundedBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float d = roundedBox(vLocal, uSize * 0.5, uRadius);
  // ~1px anti-aliased edge; alphaToCoverage turns this into smooth MSAA edges while the
  // mesh stays opaque (opaque meshes are drawn into the transmission pass, so glass refracts them)
  float coverage = 1.0 - smoothstep(-0.75, 0.75, d);
  if (coverage < 0.01) discard;

  // a hint of RGB split at speed (not a glitch effect)
  float split = uVel * 0.003 * (1.0 - uOpen);
  vec3 tex = vec3(
    texture2D(uTex, vUv + vec2(split, 0.0)).r,
    texture2D(uTex, vUv).g,
    texture2D(uTex, vUv - vec2(split, 0.0)).b
  );
  vec3 col = mix(uPaper, tex, uReveal);

  // shading from the bend: faces turning away darken, a soft specular band slides across
  float unbent = 1.0 - uOpen;
  float shade = 1.0 - 0.22 * (1.0 - cos(vTheta)) * unbent;
  float spec = exp(-pow((vTheta - 0.35) * 6.0, 2.0)) * 0.10 * unbent;
  col = col * shade + spec;

  // thin bright glass rim instead of a dark edge
  float rim = 1.0 - smoothstep(0.0, 1.5, -d);
  col = mix(col, vec3(1.0), rim * 0.35);

  col = mix(col, uPaper, uDim);
  // colours are sRGB and written as-is (the canvas is flat + linear, like the backdrop)
  gl_FragColor = vec4(col, coverage);
}`;
