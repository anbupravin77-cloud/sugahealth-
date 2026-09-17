import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Reveal } from './Reveal';
import { Image } from './Image';
import { GsapHeaderReveal, GsapImageReveal } from './GsapReveal';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'left' | 'center';
  image?: string;
}

export function PageHeader({ title = "", subtitle, align = "left", image }: PageHeaderProps = { title: "" }) {
  return (
    <section className="relative pt-8 pb-10 sm:pt-12 sm:pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-neutral-200/80 bg-white">
      {image && (
        <GsapImageReveal containerClassName="absolute inset-0 -z-10 w-full h-full opacity-10 md:opacity-15 grayscale">
          <Image src={image} alt="Background texture" containerClassName="w-full h-full" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/80 to-white" />
        </GsapImageReveal>
      )}
      <div className={cn("max-w-7xl mx-auto w-full", align === 'center' ? "text-center flex flex-col items-center" : "text-left")}>
        <GsapHeaderReveal className={align === 'center' ? "flex flex-col items-center text-center w-full" : ""}>
          <h1 className={cn("font-sans text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-950 leading-[1.15] pb-1 max-w-4xl", align === 'center' && "text-center mx-auto")}>
            {title}
          </h1>
          {subtitle && (
            <p className={cn("mt-4 sm:mt-5 text-base sm:text-lg text-neutral-600 max-w-2xl leading-relaxed font-normal", align === 'center' && "text-center mx-auto")}>
              {subtitle}
            </p>
          )}
        </GsapHeaderReveal>
      </div>
    </section>
  );
}

interface SectionProps {
  children: ReactNode;
  className?: string;
  background?: 'default' | 'surface';
  id?: string;
}

export function Section({ children = null, className, background = "default", id }: SectionProps = { children: null }) {
  return (
    <section 
      id={id}
      className={cn(
        "py-10 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 w-full",
        background === 'surface' ? "bg-neutral-50" : "bg-white",
        className
      )}
    >
      <div className="max-w-7xl mx-auto w-full">
        {children}
      </div>
    </section>
  );
}

