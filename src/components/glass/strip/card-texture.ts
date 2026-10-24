import { getCldImageUrl } from "next-cloudinary";
import * as THREE from "three";
import type { StripImage, StripItem } from "@/lib/strip-store";

/** --paper-2 in sRGB, for the app-only card background and the shader's loading colour. */
export const PAPER_2 = "#efebe3";

const WIDTHS = [480, 640, 800, 960, 1280, 1600];

/**
 * Texture width for a card drawn `cardPx` device pixels wide: the smallest standard width that
 * covers it. A texture much larger than the card makes the GPU sample a smaller mip, which
 * looks blurry at rest (a 1280px image on a ~470px phone card was visibly soft).
 */
export function textureWidth(cardPx: number) {
  return WIDTHS.find((w) => w >= cardPx) ?? WIDTHS[WIDTHS.length - 1];
}

/** 16:10 crop from the top of the image (docs/projects-strip.md §7). */
export function cardImageUrl(image: StripImage, width: number) {
  return getCldImageUrl({
    src: image.publicId,
    width,
    height: Math.round((width * 10) / 16),
    crop: "fill",
    gravity: "north",
    format: "auto",
  });
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function configure(tex: THREE.Texture) {
  // The glass canvas is `flat` + `linear` and writes raw sRGB, so textures must pass through
  // undecoded. Tagging them SRGBColorSpace would decode to linear and render too dark.
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * App-only projects: up to 3 phone screenshots on paper, the middle one raised, rounded tops.
 * Mirrors CardMedia in components/home/projects.tsx.
 */
async function phoneComposite(phones: StripImage[], width: number) {
  const W = width;
  const H = Math.round((W * 10) / 16);
  const shots = await Promise.all(
    phones.slice(0, 3).map((p) => loadImage(getCldImageUrl({ src: p.publicId, width: Math.round(W * 0.3), format: "auto" }))),
  );
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER_2;
  ctx.fillRect(0, 0, W, H);

  const phoneW = W * 0.28;
  const gap = W * 0.04;
  const total = shots.length * phoneW + (shots.length - 1) * gap;
  let x = (W - total) / 2;
  shots.forEach((img, i) => {
    const phoneH = (img.height / img.width) * phoneW;
    // middle phone raised; the bottoms run off the card and are cropped, like the CSS card
    const y = H * 0.12 - (i === 1 ? H * 0.06 : 0);
    ctx.save();
    ctx.shadowColor = "rgba(40, 32, 20, 0.28)";
    ctx.shadowBlur = W * 0.02;
    ctx.shadowOffsetY = W * 0.008;
    ctx.beginPath();
    ctx.roundRect(x, y, phoneW, phoneH, [W * 0.012, W * 0.012, 0, 0]);
    ctx.fillStyle = PAPER_2;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, phoneW, phoneH, [W * 0.012, W * 0.012, 0, 0]);
    ctx.clip();
    ctx.drawImage(img, x, y, phoneW, phoneH);
    ctx.restore();
    x += phoneW + gap;
  });
  return new THREE.CanvasTexture(canvas);
}

/** Loads the card's texture: the wide image, or the phone composite for app-only projects. */
export async function loadCardTexture(item: StripItem, width: number): Promise<THREE.Texture | null> {
  if (item.image) {
    const img = await loadImage(cardImageUrl(item.image, width));
    return configure(new THREE.Texture(img));
  }
  if (item.phones.length) return configure(await phoneComposite(item.phones, width));
  return null;
}
