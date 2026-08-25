"use client";

import { motion, useReducedMotion } from "framer-motion";

import { Fragment } from "react";

export function RevealText({
  children,
  className,
  delay = 0,
  stagger = 0.04,
}: {
  children: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const shouldReduce = useReducedMotion();
  const words = children.split(" ");

  return (
    <span className={className}>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="inline-block overflow-hidden pb-[0.1em] -mb-[0.1em] align-bottom">
            <motion.span
              className="inline-block"
              initial={shouldReduce ? false : { y: "110%" }}
              whileInView={{ y: "0%" }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{
                duration: shouldReduce ? 0 : 0.7,
                ease: [0.16, 1, 0.3, 1],
                delay: shouldReduce ? 0 : delay + i * stagger,
              }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </span>
  );
}
