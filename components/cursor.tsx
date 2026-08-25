"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function Cursor() {
  const pathname = usePathname();
  const shouldReduce = useReducedMotion();
  const [pointerFine, setPointerFine] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);
  const enabled = pointerFine && !shouldReduce && pathname !== "/simulation";

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const springX = useSpring(mouseX, { damping: 28, stiffness: 380, mass: 0.4 });
  const springY = useSpring(mouseY, { damping: 28, stiffness: 380, mass: 0.4 });

  // Pointer capability is unknown until after mount (SSR has no window), so this
  // subscribes to the media query rather than branching on `window` during render,
  // which would otherwise produce a server/client markup mismatch.
  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    const update = () => setPointerFine(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setVisible(true);
    };
    const handleLeaveWindow = () => setVisible(false);
    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      setHovering(!!target.closest("a, button, [data-cursor-hover]"));
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseover", handleOver);
    document.documentElement.addEventListener("mouseleave", handleLeaveWindow);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseover", handleOver);
      document.documentElement.removeEventListener("mouseleave", handleLeaveWindow);
    };
  }, [enabled, mouseX, mouseY]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] rounded-full bg-white mix-blend-difference"
      style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
      animate={{
        width: hovering ? 56 : 14,
        height: hovering ? 56 : 14,
        opacity: visible ? 1 : 0,
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    />
  );
}
