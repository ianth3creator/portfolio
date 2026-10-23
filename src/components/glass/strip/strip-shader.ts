/**
 * Strip card shader (docs/projects-strip.md §6). Everything is in mesh-local CSS px;
 * the mesh group sits at the stage centre and the camera is orthographic (1 unit = 1px).
 *
 * Phase 1: flat cards placed along the strip. Bend, perspective, rounded corners,
 * rim and shading arrive in phase 2.
 */

export const stripVertex = /* glsl */ `
uniform float uIndex;     // this card's index
uniform float uProgress;  // strip position in card units
uniform float uPitch;     // card width + gap, px
uniform vec2 uSize;       // card width, height in px
varying vec2 vUv;

void main() {
  vUv = uv;
  vec2 local = position.xy * uSize;              // the shared plane is 1×1
  float X = (uIndex - uProgress) * uPitch + local.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(X, local.y, 0.0, 1.0);
}`;

export const stripFragment = /* glsl */ `
uniform sampler2D uTex;
uniform float uReveal;    // 0 → paper, 1 → texture (fades in when the image arrives)
uniform vec3 uPaper;
varying vec2 vUv;

void main() {
  vec3 tex = texture2D(uTex, vUv).rgb;
  // colours are sRGB and written as-is (the canvas is flat + linear, like the backdrop)
  gl_FragColor = vec4(mix(uPaper, tex, uReveal), 1.0);
}`;
