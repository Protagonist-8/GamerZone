"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight custom cursor: a small dot plus a trailing ring that
 * eases toward the pointer. Grows and switches to the accent color
 * over anything clickable. Only activates for fine-pointer (mouse)
 * devices and is skipped entirely when the user prefers reduced
 * motion, so touch users and accessibility settings are unaffected.
 */
export default function CursorFX() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasFinePointer = window.matchMedia(
      "(pointer: fine)"
    ).matches;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!hasFinePointer || prefersReducedMotion) {
      return;
    }

    document.body.classList.add("gz-custom-cursor");

    const dot = dotRef.current;
    const ring = ringRef.current;

    if (!dot || !ring) {
      return;
    }

    let ringX = window.innerWidth / 2;
    let ringY = window.innerHeight / 2;
    let targetX = ringX;
    let targetY = ringY;

    function handleMove(event: MouseEvent) {
      targetX = event.clientX;
      targetY = event.clientY;

      dot!.style.transform =
        `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
    }

    function handleOver(event: MouseEvent) {
      const target = event.target as HTMLElement;

      const isInteractive = Boolean(
        target.closest(
          "a, button, input, [role='button'], .gz-cursor-interactive"
        )
      );

      ring!.dataset.active = isInteractive ? "true" : "false";
    }

    let frame: number;

    function animate() {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;

      ring!.style.transform =
        `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;

      frame = requestAnimationFrame(animate);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseover", handleOver);
    frame = requestAnimationFrame(animate);

    return () => {
      document.body.classList.remove("gz-custom-cursor");
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseover", handleOver);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 rounded-full bg-[#34e6c8]"
        style={{ transform: "translate(-50%, -50%)" }}
      />

      <div
        ref={ringRef}
        data-active="false"
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-8 w-8 rounded-full border transition-[width,height,border-color,background-color] duration-150 ease-out
          border-[#7c5cff]/60 data-[active=true]:h-11 data-[active=true]:w-11 data-[active=true]:border-[#34e6c8] data-[active=true]:bg-[#34e6c8]/10"
        style={{ transform: "translate(-50%, -50%)" }}
      />
    </>
  );
}
