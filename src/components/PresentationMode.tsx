'use client';

import { useState, useEffect } from 'react'

interface Slide {
  title:     string
  content:   string
  layout?:   string
  icon?:     string
  color?:    string
  image_url?: string
}

import { TitleSlide, BulletsSlide, NumbersSlide, TimelineSlide, TwoColumnSlide, ContentSlide, ImageTextSlide } from './SlideLayouts';

interface PresentationModeProps {
  slides: Slide[];
  onClose: () => void;
}

export default function PresentationMode({ slides, onClose }: PresentationModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentIndex((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, onClose]);

  const currentSlide = slides[currentIndex];

  const renderSlideLayout = (slide: Slide) => {
    switch (slide.layout) {
      case 'title':
        return <TitleSlide slide={slide} />;
      case 'bullets':
        return <BulletsSlide slide={slide} />;
      case 'numbers':
        return <NumbersSlide slide={slide} />;
      case 'timeline':
        return <TimelineSlide slide={slide} />;
      case 'two-column':
        return <TwoColumnSlide slide={slide} />;
      case 'image-text':
        return <ImageTextSlide slide={slide} />;
      default:
        return <ContentSlide slide={slide} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Slide Content */}
      <div className="flex-1 relative">
        {renderSlideLayout(currentSlide)}
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-900">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }}
        ></div>
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 flex items-center justify-between shadow-2xl">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
          disabled={currentIndex === 0}
          className="px-6 py-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 disabled:opacity-30 transition font-medium"
        >
          ← Previous
        </button>

        <div className="flex items-center gap-6">
          <div className="text-lg font-medium">
            {currentIndex + 1} / {slides.length}
          </div>
          <div className="flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all ${
                  idx === currentIndex 
                    ? 'w-8 h-3 bg-indigo-500 rounded-full' 
                    : 'w-3 h-3 bg-gray-600 rounded-full hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, slides.length - 1))}
          disabled={currentIndex === slides.length - 1}
          className="px-6 py-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 disabled:opacity-30 transition font-medium"
        >
          Next →
        </button>

        <button
          onClick={onClose}
          className="px-6 py-2 bg-red-500/90 backdrop-blur-sm rounded-lg hover:bg-red-600 transition font-medium"
        >
          Exit (ESC)
        </button>
      </div>
    </div>
  );
}
