import * as THREE from "three";

/**
 * Small GPU fluid solver (stable fluids, after Pavel Dobryakov's WebGL-Fluid-Simulation),
 * written against three's renderer so it shares the glass canvas's WebGL context.
 *
 * Velocity/pressure run on a coarse grid (~128 on the short side); the dye that
 * the backdrop shows runs finer (~512). Everything lives in half-float render targets.
 */

const VERT = /* glsl */ `
uniform vec2 texelSize;
varying vec2 vUv, vL, vR, vT, vB;
void main() {
  vUv = uv;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const HEAD = /* glsl */ `
precision highp float;
varying vec2 vUv, vL, vR, vT, vB;
`;

const SPLAT = `${HEAD}
uniform sampler2D uTarget;
uniform float aspect, radius;
uniform vec3 color;
uniform vec2 point;
void main() {
  vec2 p = vUv - point;
  p.x *= aspect;
  vec3 s = exp(-dot(p, p) / radius) * color;
  gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + s, 1.0);
}`;

const ADVECT = `${HEAD}
uniform sampler2D uVelocity, uSource;
uniform vec2 simTexel;
uniform float dt, dissipation;
void main() {
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * simTexel;
  gl_FragColor = texture2D(uSource, coord) / (1.0 + dissipation * dt);
}`;

const DIVERGENCE = `${HEAD}
uniform sampler2D uVelocity;
void main() {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x;
  if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y;
  if (vB.y < 0.0) B = -C.y;
  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const CURL = `${HEAD}
uniform sampler2D uVelocity;
void main() {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const VORTICITY = `${HEAD}
uniform sampler2D uVelocity, uCurl;
uniform float curl, dt;
void main() {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 vel = texture2D(uVelocity, vUv).xy + force * dt;
  gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
}`;

const CLEAR = `${HEAD}
uniform sampler2D uTexture;
uniform float value;
void main() { gl_FragColor = value * texture2D(uTexture, vUv); }`;

const PRESSURE = `${HEAD}
uniform sampler2D uPressure, uDivergence;
void main() {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float div = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT = `${HEAD}
uniform sampler2D uPressure, uVelocity;
void main() {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
  gl_FragColor = vec4(vel, 0.0, 1.0);
}`;

// Tuned for flowing watercolour: motion carries on after the pointer stops and curls
// into soft eddies; dye lingers several seconds; big soft brush.
const CONFIG = {
  simRes: 128,
  dyeRes: 1024,
  pressureIterations: 16,
  curl: 10,
  velocityDissipation: 0.8,
  densityDissipation: 0.32,
  pressureDecay: 0.8,
  splatRadius: 0.006,
  splatForce: 6000,
};

type Double = { read: THREE.WebGLRenderTarget; write: THREE.WebGLRenderTarget; swap: () => void };

function target(w: number, h: number) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

function double(w: number, h: number): Double {
  const d = {
    read: target(w, h),
    write: target(w, h),
    swap() {
      const t = d.read;
      d.read = d.write;
      d.write = t;
    },
  };
  return d;
}

function resolution(res: number, aspect: number) {
  const max = Math.round(res * Math.max(aspect, 1 / aspect));
  const min = Math.round(res);
  return aspect > 1 ? { w: max, h: min } : { w: min, h: max };
}

/** True when the GPU can render into half-float targets (required for the solver). */
export function fluidSupported(renderer: THREE.WebGLRenderer) {
  return renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
}

export class FluidSim {
  readonly aspect: number;
  private velocity: Double;
  private dye: Double;
  private pressure: Double;
  private divergence: THREE.WebGLRenderTarget;
  private curl: THREE.WebGLRenderTarget;
  private simTexel: THREE.Vector2;
  private dyeTexel: THREE.Vector2;
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private quad: THREE.Mesh;
  private mats: Record<string, THREE.ShaderMaterial>;

  constructor(private renderer: THREE.WebGLRenderer, width: number, height: number, dyeRes = CONFIG.dyeRes) {
    this.aspect = width / height;
    const sim = resolution(CONFIG.simRes, this.aspect);
    const dye = resolution(dyeRes, this.aspect);
    this.simTexel = new THREE.Vector2(1 / sim.w, 1 / sim.h);
    this.dyeTexel = new THREE.Vector2(1 / dye.w, 1 / dye.h);
    this.velocity = double(sim.w, sim.h);
    this.pressure = double(sim.w, sim.h);
    this.divergence = target(sim.w, sim.h);
    this.curl = target(sim.w, sim.h);
    this.dye = double(dye.w, dye.h);

    const mat = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader,
        uniforms: { texelSize: { value: this.simTexel }, ...uniforms },
        depthTest: false,
        depthWrite: false,
      });
    const t = () => ({ value: null as THREE.Texture | null });
    this.mats = {
      splat: mat(SPLAT, { uTarget: t(), aspect: { value: this.aspect }, radius: { value: 0 }, color: { value: new THREE.Vector3() }, point: { value: new THREE.Vector2() } }),
      advect: mat(ADVECT, { uVelocity: t(), uSource: t(), simTexel: { value: this.simTexel }, dt: { value: 0 }, dissipation: { value: 0 } }),
      divergence: mat(DIVERGENCE, { uVelocity: t() }),
      curl: mat(CURL, { uVelocity: t() }),
      vorticity: mat(VORTICITY, { uVelocity: t(), uCurl: t(), curl: { value: CONFIG.curl }, dt: { value: 0 } }),
      clear: mat(CLEAR, { uTexture: t(), value: { value: CONFIG.pressureDecay } }),
      pressure: mat(PRESSURE, { uPressure: t(), uDivergence: t() }),
      gradient: mat(GRADIENT, { uPressure: t(), uVelocity: t() }),
    };
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mats.splat);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** One dye texel in UV units (for shading the paint surface). */
  get texel() {
    return this.dyeTexel;
  }

  /** The dye texture the backdrop samples (RGB = pigment, unbounded). */
  get texture() {
    return this.dye.read.texture;
  }

  private pass(name: string, out: THREE.WebGLRenderTarget, uniforms: Record<string, unknown> = {}, texel = this.simTexel) {
    const m = this.mats[name];
    m.uniforms.texelSize.value = texel;
    for (const [k, v] of Object.entries(uniforms)) m.uniforms[k].value = v;
    this.quad.material = m;
    this.renderer.setRenderTarget(out);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Push paint in. x/y in 0..1 (y up), dx/dy = movement in the same units since the last event.
   * color is the pigment (sRGB-ish 0..1) scaled by how much ink to drop.
   */
  splat(x: number, y: number, dx: number, dy: number, color: THREE.Vector3) {
    // keep the force isotropic on non-square screens
    if (this.aspect < 1) dx *= this.aspect;
    else dy /= this.aspect;
    const radius = CONFIG.splatRadius * Math.max(this.aspect, 1);
    const point = new THREE.Vector2(x, y);
    this.pass("splat", this.velocity.write, {
      uTarget: this.velocity.read.texture,
      point,
      radius,
      color: new THREE.Vector3(dx * CONFIG.splatForce, dy * CONFIG.splatForce, 0),
    });
    this.velocity.swap();
    this.pass("splat", this.dye.write, { uTarget: this.dye.read.texture, point, radius, color }, this.dyeTexel);
    this.dye.swap();
    this.renderer.setRenderTarget(null);
  }

  step(dt: number) {
    const v = this.velocity;
    this.pass("curl", this.curl, { uVelocity: v.read.texture });
    this.pass("vorticity", v.write, { uVelocity: v.read.texture, uCurl: this.curl.texture, dt });
    v.swap();
    this.pass("divergence", this.divergence, { uVelocity: v.read.texture });
    this.pass("clear", this.pressure.write, { uTexture: this.pressure.read.texture });
    this.pressure.swap();
    for (let i = 0; i < CONFIG.pressureIterations; i++) {
      this.pass("pressure", this.pressure.write, { uPressure: this.pressure.read.texture, uDivergence: this.divergence.texture });
      this.pressure.swap();
    }
    this.pass("gradient", v.write, { uPressure: this.pressure.read.texture, uVelocity: v.read.texture });
    v.swap();
    this.pass("advect", v.write, { uVelocity: v.read.texture, uSource: v.read.texture, dt, dissipation: CONFIG.velocityDissipation });
    v.swap();
    this.pass("advect", this.dye.write, { uVelocity: v.read.texture, uSource: this.dye.read.texture, dt, dissipation: CONFIG.densityDissipation }, this.dyeTexel);
    this.dye.swap();
    this.renderer.setRenderTarget(null);
  }

  dispose() {
    for (const d of [this.velocity, this.dye, this.pressure]) {
      d.read.dispose();
      d.write.dispose();
    }
    this.divergence.dispose();
    this.curl.dispose();
    Object.values(this.mats).forEach((m) => m.dispose());
    this.quad.geometry.dispose();
  }
}
