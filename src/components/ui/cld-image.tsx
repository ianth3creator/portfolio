"use client";

// next-cloudinary ships without a "use client" directive but CldImage uses hooks,
// so server components must import it from here.
export { CldImage } from "next-cloudinary";
