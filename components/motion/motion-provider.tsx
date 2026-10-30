"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export const EASE = "power3.out"; // close to cubic-bezier(0.2, 0.7, 0.2, 1)

let lenis: Lenis | null = null;
export function getLenis() {
  return lenis;
}

/**
 * Public-site motion runtime. Lenis owns smooth scrolling and is driven from
 * GSAP's ticker so ScrollTrigger and Lenis share one animation frame.
 * Elements opt in with:
 *   data-reveal            fade + rise when scrolled into view
 *   data-reveal="stagger"  same, staggered across direct children
 * Headlines marked data-split animate in with CSS (see globals.css) so they
 * paint before hydration.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Lenis + GSAP ticker, created once.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    lenis = new Lenis({ autoRaf: false, lerp: 0.12, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  // Reveals, re-bound on every route.
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("motion-ready");
    if (reduce) return;

    lenis?.scrollTo(0, { immediate: true });

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        const stagger = el.dataset.reveal === "stagger";
        const targets = stagger ? Array.from(el.children) : [el];
        if (stagger) gsap.set(el, { opacity: 1 });
        gsap.fromTo(
          targets,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: EASE,
            stagger: stagger ? 0.07 : 0,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      });
    });

    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, [pathname]);

  return <>{children}</>;
}
