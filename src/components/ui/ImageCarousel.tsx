import { useState, useRef, useCallback, useEffect } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { ProductImage } from '../../types';

interface ImageCarouselProps {
  images: ProductImage[];
  fallbackUrl?: string | null;
  alt: string;
  onImageClick?: (index: number) => void;
  className?: string;
  showArrows?: boolean;
  showDots?: boolean;
}

export function ImageCarousel({
  images,
  fallbackUrl,
  alt,
  onImageClick,
  className = '',
  showArrows = true,
  showDots = true,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build the images array with fallback support
  const displayImages: string[] = images.length > 0
    ? [...images].sort((a, b) => a.order - b.order).map(img => img.url)
    : fallbackUrl
      ? [fallbackUrl]
      : [];

  const hasMultipleImages = displayImages.length > 1;

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const goToNext = useCallback(() => {
    if (displayImages.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % displayImages.length);
  }, [displayImages.length]);

  const goToPrev = useCallback(() => {
    if (displayImages.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  }, [displayImages.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && hasMultipleImages) {
      goToNext();
    } else if (isRightSwipe && hasMultipleImages) {
      goToPrev();
    }
  };

  // Keyboard navigation when focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === containerRef.current) {
        if (e.key === 'ArrowRight') {
          goToNext();
        } else if (e.key === 'ArrowLeft') {
          goToPrev();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  // Reset index if images change
  useEffect(() => {
    setCurrentIndex(0);
  }, [images, fallbackUrl]);

  const handleImageClick = () => {
    if (onImageClick && displayImages.length > 0) {
      onImageClick(currentIndex);
    }
  };

  // No images placeholder
  if (displayImages.length === 0) {
    return (
      <div className={`aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}>
        <svg
          className="w-12 md:w-16 h-12 md:h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative aspect-square overflow-hidden ${className}`}
      tabIndex={0}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Images container */}
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {displayImages.map((url, index) => (
          <div
            key={url + index}
            className="w-full h-full flex-shrink-0"
          >
            <img
              src={url}
              alt={`${alt} ${index + 1}`}
              className={`w-full h-full object-cover ${onImageClick ? 'cursor-pointer' : ''}`}
              onClick={handleImageClick}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows (desktop) */}
      {showArrows && hasMultipleImages && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors hidden sm:flex items-center justify-center"
            aria-label="Imagem anterior"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors hidden sm:flex items-center justify-center"
            aria-label="Proxima imagem"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {showDots && hasMultipleImages && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {displayImages.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white scale-110'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Ir para imagem ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
