"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { decode } from "blurhash";
import { cn } from "@/lib/utils";

/** next/image with a BlurHash placeholder that crossfades to the photo once loaded. */
export function BlurImage({
  src,
  alt,
  blurhash,
  sizes,
  className,
  priority,
}: {
  src: string;
  alt: string;
  blurhash?: string | null;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return;
    try {
      const pixels = decode(blurhash, 32, 40);
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const image = ctx.createImageData(32, 40);
      image.data.set(pixels);
      ctx.putImageData(image, 0, 0);
    } catch {
      // Invalid hash: the paper background shows instead.
    }
  }, [blurhash]);

  return (
    <div className={cn("relative overflow-hidden bg-paper-2", className)}>
      {blurhash && (
        <canvas
          ref={canvasRef}
          width={32}
          height={40}
          aria-hidden
          className={cn("absolute inset-0 h-full w-full transition-opacity duration-500 ease-soft", loaded && "opacity-0")}
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        className={cn(
          "object-cover transition-[opacity,transform] duration-500 ease-soft",
          loaded ? "scale-100 opacity-100" : "scale-[1.02] opacity-0",
        )}
      />
    </div>
  );
}
