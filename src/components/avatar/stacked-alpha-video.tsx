"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

/**
 * Plays a "stacked alpha" MP4: the top half of each frame is colour, the bottom
 * half is the alpha mask (white = opaque). A tiny WebGL shader recombines them,
 * which gives a transparent video in every browser, Safari/iOS included.
 */
export type StackedAlphaHandle = { play: () => void; pause: () => void };

type Props = {
  src: string;
  poster: string;
  className?: string;
  /** Render the poster only (reduced motion / no WebGL). */
  still?: boolean;
  /** Seconds into the clip to start from on first play (later loops start at 0). */
  startAt?: number;
};

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2((a_pos.x + 1.0) * 0.5, 1.0 - (a_pos.y + 1.0) * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D u_tex;
varying vec2 v_uv;
void main() {
  vec3 rgb = texture2D(u_tex, vec2(v_uv.x, v_uv.y * 0.5)).rgb;
  float a  = texture2D(u_tex, vec2(v_uv.x, 0.5 + v_uv.y * 0.5)).r;
  gl_FragColor = vec4(rgb * a, a);
}`;

export const StackedAlphaVideo = forwardRef<StackedAlphaHandle, Props>(
  function StackedAlphaVideo({ src, poster, className, still, startAt = 0 }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [ready, setReady] = useState(false);

    useImperativeHandle(ref, () => ({
      play: () => void videoRef.current?.play().catch(() => {}),
      pause: () => videoRef.current?.pause(),
    }));

    useEffect(() => {
      if (still) return;
      const host = hostRef.current;
      if (!host) return;
      // A fresh canvas per run: the cleanup below loses its context, and in dev React runs
      // effects twice, so reusing one canvas would hand back the dead context (drawn as a white block).
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      canvas.className = "absolute inset-0 h-full w-full";
      const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });
      if (!gl) return;
      host.appendChild(canvas);

      const video = document.createElement("video");
      video.src = src;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      videoRef.current = video;
      if (startAt > 0) {
        video.addEventListener(
          "loadedmetadata",
          () => (video.currentTime = Math.min(startAt, Math.max(0, video.duration - 0.1))),
          { once: true },
        );
      }

      const compile = (type: number, source: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, source);
        gl.compileShader(s);
        return s;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      let raf = 0;
      let sized = false;
      const draw = () => {
        if (gl.isContextLost()) {
          setReady(false); // fall back to the poster
          return;
        }
        if (video.readyState >= 2) {
          if (!sized) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight / 2;
            gl.viewport(0, 0, canvas.width, canvas.height);
          }
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          if (!sized) {
            sized = true;
            setReady(true);
          }
        }
        raf = requestAnimationFrame(draw);
      };

      // Only decode while on screen.
      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      });
      io.observe(canvas);
      raf = requestAnimationFrame(draw);

      return () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        video.pause();
        video.removeAttribute("src");
        video.load();
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        canvas.remove();
        setReady(false);
      };
    }, [src, still, startAt]);

    return (
      <div className={className ?? "relative"}>
        {/* Poster sits underneath and shows until the first video frame is drawn. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-300"
          style={{ opacity: ready ? 0 : 1 }}
        />
        {!still && (
          <div
            ref={hostRef}
            aria-hidden
            className="absolute inset-0 transition-opacity duration-300"
            style={{ opacity: ready ? 1 : 0 }}
          />
        )}
      </div>
    );
  },
);
