import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';

interface RevealProps {
  children: ReactNode;
  width?: "fit-content" | "100%";
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const Reveal = ({ children = null, width = "100%", delay = 0, className, direction = "up" }: RevealProps = { children: null }) => {
  const shouldReduceMotion = useReducedMotion();
  const yOffset = direction === 'up' ? 24 : direction === 'down' ? -24 : 0;
  const xOffset = direction === 'left' ? 24 : direction === 'right' ? -24 : 0;

  const isCenter = className?.includes('text-center') || className?.includes('justify-center') || className?.includes('items-center');

  return (
    <div style={{ width }} className={cn("relative", className)}>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: yOffset, x: xOffset }}
        whileInView={{ opacity: 1, y: 0, x: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{
          duration: shouldReduceMotion ? 0.2 : 0.6,
          delay: shouldReduceMotion ? 0 : delay,
          ease: [0.21, 0.47, 0.32, 0.98]
        }}
        className={cn(
          "w-full",
          isCenter && "flex flex-col items-center text-center justify-center"
        )}
      >
        {children}
      </motion.div>
    </div>
  );
};
