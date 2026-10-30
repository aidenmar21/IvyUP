"use client";

import { encode } from "blurhash";

/**
 * Center-crops an image file to 4:5, scales it to 800×1000, and returns a
 * WebP blob plus a BlurHash string for the loading placeholder.
 */
export async function preparePortrait(file: File): Promise<{ blob: Blob; blurhash: string; previewUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const targetRatio = 4 / 5;
  const srcRatio = bitmap.width / bitmap.height;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (srcRatio > targetRatio) sw = Math.round(bitmap.height * targetRatio);
  else sh = Math.round(bitmap.width / targetRatio);
  const sx = Math.round((bitmap.width - sw) / 2);
  // Bias the vertical crop upward slightly: portraits usually have faces in the top third.
  const sy = Math.round((bitmap.height - sh) * 0.3);

  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, 800, 1000);

  const small = document.createElement("canvas");
  small.width = 32;
  small.height = 40;
  const sctx = small.getContext("2d")!;
  sctx.drawImage(canvas, 0, 0, 32, 40);
  const pixels = sctx.getImageData(0, 0, 32, 40).data;
  const blurhash = encode(pixels, 32, 40, 4, 5);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process the image"))), "image/webp", 0.86),
  );
  return { blob, blurhash, previewUrl: URL.createObjectURL(blob) };
}
