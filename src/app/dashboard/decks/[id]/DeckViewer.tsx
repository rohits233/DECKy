'use client'

import { useState } from 'react'
import {
  TitleSlide,
  BulletsSlide,
  NumbersSlide,
  TimelineSlide,
  TwoColumnSlide,
  ContentSlide,
  ImageTextSlide,
} from '@/components/SlideLayouts'
import PresentationMode from '@/components/PresentationMode'
import type { Slide } from './page'

const LAYOUT_MAP: Record<string, React.ComponentType<{ slide: Slide }>> = {
  title:        ({ slide }) => <TitleSlide slide={slide} />,
  bullets:      ({ slide }) => <BulletsSlide slide={slide} />,
  numbers:      ({ slide }) => <NumbersSlide slide={slide} />,
  timeline:     ({ slide }) => <TimelineSlide slide={slide} />,
  'two-column': ({ slide }) => <TwoColumnSlide slide={slide} />,
  'image-text': ({ slide }) => <ImageTextSlide slide={slide} />,
  content:      ({ slide }) => <ContentSlide slide={slide} />,
}

function SlidePreview({ slide }: { slide: Slide }) {
  const Component = LAYOUT_MAP[slide.layout] ?? LAYOUT_MAP.content
  return (
    <div className="w-full aspect-[16/9] rounded-lg overflow-hidden border border-white/[0.08]">
      <div className="w-full h-full scale-[0.6] origin-top-left" style={{ width: '166.67%', height: '166.67%' }}>
        <Component slide={slide} />
      </div>
    </div>
  )
}

export function DeckViewer({ slides }: { slides: Slide[] }) {
  const [active,        setActive]      = useState(0)
  const [presentMode,   setPresentMode] = useState(false)

  const current = slides[active]

  return (
    <>
      {presentMode && (
        <PresentationMode
          slides={slides}
          onClose={() => setPresentMode(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-5">
        {/* Thumbnail sidebar */}
        <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[640px] pb-2 lg:pb-0">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`shrink-0 w-32 lg:w-full rounded-lg overflow-hidden border-2 transition ${
                i === active ? 'border-blue-500' : 'border-white/[0.06] hover:border-white/20'
              }`}
            >
              <div className="w-full aspect-[16/9] relative">
                <div className="absolute inset-0 scale-[0.25] origin-top-left" style={{ width: '400%', height: '400%' }}>
                  <div className="w-full h-full">
                    {(() => {
                      const C = LAYOUT_MAP[s.layout] ?? LAYOUT_MAP.content
                      return <C slide={s} />
                    })()}
                  </div>
                </div>
              </div>
              <div className="px-1.5 py-1 bg-black/30">
                <p className="text-[10px] text-white/40 truncate">{i + 1}. {s.title}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Main preview */}
        <div className="space-y-3">
          <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/[0.08]">
            {(() => {
              const C = LAYOUT_MAP[current.layout] ?? LAYOUT_MAP.content
              return <C slide={current} />
            })()}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                disabled={active === 0}
                onClick={() => setActive(a => a - 1)}
                className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-md text-[13px] text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 transition"
              >
                ←
              </button>
              <span className="text-[13px] text-white/40">
                {active + 1} / {slides.length}
              </span>
              <button
                disabled={active === slides.length - 1}
                onClick={() => setActive(a => a + 1)}
                className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-md text-[13px] text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 transition"
              >
                →
              </button>
            </div>

            <button
              onClick={() => setPresentMode(true)}
              className="px-4 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-md text-[13px] text-white/60 hover:text-white hover:bg-white/[0.08] transition flex items-center gap-1.5"
            >
              ⛶ Present
            </button>
          </div>

          {/* Slide detail */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-1">
            <p className="text-[11px] text-white/30 uppercase tracking-wider">{current.layout}</p>
            <p className="text-[16px] font-semibold">{current.title}</p>
            {current.content && (
              <p className="text-[13px] text-white/50 whitespace-pre-line mt-1">{current.content}</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
