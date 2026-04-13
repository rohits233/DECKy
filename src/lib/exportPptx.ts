import type { Slide } from '@/types';

export function prepareSlidesForExport(slides: Slide[], projectTitle: string) {
  return {
    slides: slides.map(slide => ({
      title: slide.title,
      content: slide.content,
      order: slide.order
    })),
    projectTitle
  };
}
