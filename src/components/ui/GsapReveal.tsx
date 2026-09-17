import { useEffect, useRef, ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '../../lib/utils';

// Register plugin once
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface GsapHeaderRevealProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  triggerHook?: string; // e.g. "top 85%"
}

/**
 * Orchestrates smooth, staggered editorial entrance reveals for section headers
 * (Eyebrows, Bold Editorial Headlines, Subtitles/Descriptions)
 */
export function GsapHeaderReveal({
  children,
  className,
  stagger = 0.12,
  triggerHook = "top 88%"
}: GsapHeaderRevealProps = { children: null }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const elements = containerRef.current?.children;
      if (!elements || elements.length === 0) return;

      gsap.fromTo(
        elements,
        {
          opacity: 0,
          y: 24
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: 'power3.out',
          stagger: stagger,
          clearProps: 'all',
          scrollTrigger: {
            trigger: containerRef.current,
            start: triggerHook,
            toggleActions: 'play none none none',
            once: true
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [stagger, triggerHook]);

  return (
    <div ref={containerRef} className={cn("relative will-change-transform", className)}>
      {children}
    </div>
  );
}

interface GsapImageRevealProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

/**
 * Editorial photography reveal using GSAP ScrollTrigger
 * Features subtle scale-down and soft unmasking to match high-end magazine aesthetics
 */
export function GsapImageReveal({
  children,
  className,
  containerClassName
}: GsapImageRevealProps = { children: null }) {
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !imageContainerRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        imageContainerRef.current,
        {
          opacity: 0,
          scale: 1.05,
          filter: 'blur(4px)'
        },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: imageContainerRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
            once: true
          }
        }
      );
    }, imageContainerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={imageContainerRef}
      className={cn("overflow-hidden relative will-change-transform", containerClassName)}
    >
      <div className={className}>{children}</div>
    </div>
  );
}

interface GsapStaggerGroupProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  triggerHook?: string;
}

/**
 * Staggers cards or grid items into view with smooth GSAP ScrollTrigger
 */
export function GsapStaggerGroup({
  children,
  className,
  stagger = 0.1,
  triggerHook = "top 85%"
}: GsapStaggerGroupProps = { children: null }) {
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !groupRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const items = groupRef.current?.children;
      if (!items || items.length === 0) return;

      gsap.fromTo(
        items,
        {
          opacity: 0,
          y: 24
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: stagger,
          scrollTrigger: {
            trigger: groupRef.current,
            start: triggerHook,
            toggleActions: 'play none none none',
            once: true
          }
        }
      );
    }, groupRef);

    return () => ctx.revert();
  }, [stagger, triggerHook]);

  return (
    <div ref={groupRef} className={cn("w-full will-change-transform", className)}>
      {children}
    </div>
  );
}
