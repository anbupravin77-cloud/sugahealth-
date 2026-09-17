import { useRef, type ReactNode } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Image } from './Image';

interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  offset?: number;
  priority?: boolean;
}

/**
 * ParallaxImage
 * Uses Framer Motion useScroll and useTransform to apply a subtle,
 * cinematic vertical translation to imagery as the viewport scrolls.
 */
export function ParallaxImage({
  src = "",
  alt = "",
  className = "",
  containerClassName = "",
  offset = 30,
}: ParallaxImageProps = { src: "", alt: "" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [0, 0] : [-offset, offset]
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', containerClassName)}
    >
      <motion.div
        style={{ y }}
        className="w-full h-full will-change-transform scale-[1.08]"
      >
        <Image
          src={src}
          alt={alt}
          className={cn('w-full h-full object-cover', className)}
        />
      </motion.div>
    </div>
  );
}

interface ParallaxTextProps {
  children: ReactNode;
  offset?: number;
  direction?: 'up' | 'down';
  className?: string;
}

/**
 * ParallaxText
 * Uses Framer Motion useScroll and useTransform to apply subtle differential
 * scroll translation to editorial text or badges for elevated visual depth.
 */
export function ParallaxText({
  children = null,
  offset = 24,
  direction = "up",
  className = "",
}: ParallaxTextProps = { children: null }) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion
      ? [0, 0]
      : direction === 'up'
      ? [offset, -offset]
      : [-offset, offset]
  );

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className={cn('will-change-transform', className)}
    >
      {children}
    </motion.div>
  );
}
