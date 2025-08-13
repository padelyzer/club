'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  quality?: number;
  fill?: boolean;
  style?: React.CSSProperties;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f6f7f8" offset="20%" />
      <stop stop-color="#edeef1" offset="50%" />
      <stop stop-color="#f6f7f8" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f6f7f8" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

export function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 300,
  className,
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  fallback = '/images/placeholder.png',
  onLoad,
  onError,
  sizes,
  quality = 75,
  fill = false,
  style,
  objectFit = 'cover',
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImageSrc(src);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    if (fallback && imageSrc !== fallback) {
      setImageSrc(fallback);
    }
    onError?.();
  };

  const shimmerDataURL = `data:image/svg+xml;base64,${toBase64(
    shimmer(width, height)
  )}`;

  const imageProps = {
    src: imageSrc,
    alt,
    onLoad: handleLoad,
    onError: handleError,
    quality,
    priority,
    className: cn(
      'transition-opacity duration-300',
      isLoading ? 'opacity-0' : 'opacity-100',
      className
    ),
    style: {
      objectFit,
      ...style,
    },
    ...(fill ? { fill: true } : { width, height }),
    ...(sizes && { sizes }),
    ...(placeholder === 'blur' && {
      placeholder: 'blur' as const,
      blurDataURL: blurDataURL || shimmerDataURL,
    }),
  };

  return (
    <div className={cn('relative overflow-hidden', fill ? 'w-full h-full' : '')}>
      {isLoading && !hasError && (
        <div
          className={cn(
            'absolute inset-0 bg-gray-200 animate-pulse',
            fill ? 'w-full h-full' : ''
          )}
          style={!fill ? { width, height } : {}}
        />
      )}
      <Image {...imageProps} />
    </div>
  );
}

// Preload utility for critical images
export function preloadImage(src: string) {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  }
}

// Lazy load images in viewport
export function LazyImage(props: OptimizedImageProps) {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    const element = document.getElementById(`lazy-img-${props.src}`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [props.src]);

  return (
    <div id={`lazy-img-${props.src}`} className={props.className}>
      {isInView ? (
        <OptimizedImage {...props} />
      ) : (
        <div
          className={cn('bg-gray-200 animate-pulse', props.className)}
          style={{
            width: props.width || '100%',
            height: props.height || '100%',
          }}
        />
      )}
    </div>
  );
}