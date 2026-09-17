import { useState, ImgHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Skeleton } from './Skeleton';

export { Skeleton };

export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
}

export function Image({ src = "", alt = "", className, containerClassName, ...props }: ImageProps = { src: "", alt: "" }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-neutral-100", containerClassName)}>
      {!loaded && <Skeleton className="absolute inset-0 z-10 w-full h-full rounded-none" />}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-700 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
}

