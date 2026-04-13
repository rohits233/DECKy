'use client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slide {
  title:      string
  subtitle?:  string
  content:    string
  layout?:    string
  icon?:      string
  color?:     string
  image_url?: string
}

interface SlideLayoutProps {
  slide: Slide
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const BG      = '#0c0f1a'
const SURFACE = 'rgba(255,255,255,0.045)'
const BORDER  = 'rgba(255,255,255,0.085)'
const T1      = 'rgba(255,255,255,0.94)'
const T2      = 'rgba(255,255,255,0.60)'
const T3      = 'rgba(255,255,255,0.22)'

// ─── Accent system ────────────────────────────────────────────────────────────

type Accent = { hex: string; glow: string; grad: string; glowStrong: string }

const ACCENTS: Record<string, Accent> = {
  blue:    { hex:'#3b82f6', glow:'rgba(59,130,246,0.20)',   glowStrong:'rgba(59,130,246,0.40)',  grad:'linear-gradient(135deg,#2563eb,#06b6d4)' },
  indigo:  { hex:'#6366f1', glow:'rgba(99,102,241,0.20)',   glowStrong:'rgba(99,102,241,0.40)',  grad:'linear-gradient(135deg,#4f46e5,#7c3aed)' },
  purple:  { hex:'#a855f7', glow:'rgba(168,85,247,0.20)',   glowStrong:'rgba(168,85,247,0.40)',  grad:'linear-gradient(135deg,#7c3aed,#ec4899)' },
  green:   { hex:'#10b981', glow:'rgba(16,185,129,0.20)',   glowStrong:'rgba(16,185,129,0.40)',  grad:'linear-gradient(135deg,#059669,#0d9488)' },
  red:     { hex:'#ef4444', glow:'rgba(239,68,68,0.20)',    glowStrong:'rgba(239,68,68,0.40)',   grad:'linear-gradient(135deg,#dc2626,#ea580c)' },
  orange:  { hex:'#f97316', glow:'rgba(249,115,22,0.20)',   glowStrong:'rgba(249,115,22,0.40)',  grad:'linear-gradient(135deg,#ea580c,#d97706)' },
  pink:    { hex:'#ec4899', glow:'rgba(236,72,153,0.20)',   glowStrong:'rgba(236,72,153,0.40)',  grad:'linear-gradient(135deg,#db2777,#f43f5e)' },
  emerald: { hex:'#34d399', glow:'rgba(52,211,153,0.20)',   glowStrong:'rgba(52,211,153,0.40)',  grad:'linear-gradient(135deg,#059669,#10b981)' },
}
const getAccent = (color?: string): Accent =>
  ACCENTS[color as keyof typeof ACCENTS] ?? ACCENTS.indigo

// ─── Background patterns ──────────────────────────────────────────────────────

const DOTS: React.CSSProperties = {
  backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px,transparent 1px)',
  backgroundSize:  '28px 28px',
}
const GRID: React.CSSProperties = {
  backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
  backgroundSize:  '44px 44px',
}

// ─── Photo helper ─────────────────────────────────────────────────────────────

// Expanded map — each entry gets a different photo so slides in the same deck look distinct
const PHOTO_MAP: [string[], string][] = [
  [['growth','revenue','sales','market','profit','quarterly','financial result'],  '1611974789855-9c2a0a7236a3'],
  [['team','people','culture','talent','workforce','employee','colleague'],        '1552664730-d307ca884978'],
  [['data','analytics','metrics','kpi','dashboard','reporting','insight'],         '1551288049-bebda4e38f71'],
  [['technology','software','digital','platform','ai','machine learning','cloud'], '1518770660439-4636190af475'],
  [['strategy','vision','roadmap','direction','objective','goal','planning'],      '1486406146926-c627a92ad1ab'],
  [['finance','investment','funding','budget','capital','valuation','cost'],       '1460925895917-afdab827c52f'],
  [['risk','compliance','security','governance','legal','audit','regulation'],     '1504639725590-34d0984388bd'],
  [['customer','client','experience','service','satisfaction','support','user'],   '1519085360753-af0119f7cbe7'],
  [['operations','process','efficiency','supply','logistics','manufacturing'],     '1565043589221-1a6fd9ae45c7'],
  [['innovation','research','development','future','next','emerging','trend'],     '1451187580459-43490279c0fa'],
  [['leadership','executive','board','management','ceo','founder','decision'],     '1507679799987-c73779587ccf'],
  [['product','launch','feature','release','roadmap','milestone','delivery'],      '1542744173-8e7e53415bb0'],
  [['marketing','brand','campaign','advertising','content','social','media'],      '1533750349088-cd871a92f312'],
  [['competition','market share','competitor','landscape','positioning','edge'],   '1521791136064-7986c2920216'],
  [['sustainability','environment','esg','impact','green','carbon','climate'],     '1497436072909-60f360e1d4b1'],
]

// Fallback pool — cycle through these for slides that don't keyword-match
const FALLBACKS = [
  '1557804506-669a67965ba0',
  '1497366216548-37526070297c',
  '1542744095-291d1f67b221',
  '1497366811353-6870744d04b2',
]

function photoUrl(text: string, imageUrl?: string, seed = 0): string {
  if (imageUrl) return imageUrl
  const lower = text.toLowerCase()
  for (const [kws, id] of PHOTO_MAP) {
    if (kws.some(k => lower.includes(k)))
      return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1920&q=80`
  }
  const id = FALLBACKS[seed % FALLBACKS.length]
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1920&q=80`
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function AccentBar({ a }: { a: Accent }) {
  return <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: a.grad }} />
}

function Badge({ label, a }: { label: string; a: Accent }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.16em] uppercase text-white"
      style={{ background: a.grad }}
    >
      {label}
    </span>
  )
}

// Strip leading bullet chars and blank lines
const parse = (s: string) =>
  s.split('\n').map(l => l.replace(/^[•–\-]\s*/, '').trim()).filter(Boolean)

// ─── TitleSlide ───────────────────────────────────────────────────────────────
// Full-bleed photo background + dark overlay + left-aligned headline

export function TitleSlide({ slide }: SlideLayoutProps) {
  const a        = getAccent(slide.color)
  const photo    = photoUrl(slide.title + ' ' + slide.content, slide.image_url, 0)
  const subtitle = slide.subtitle || parse(slide.content)[0] || ''

  return (
    <div className="h-full relative overflow-hidden flex items-center" style={{ background: BG }}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg,rgba(12,15,26,0.97) 42%,rgba(12,15,26,0.45) 100%)' }} />
      <div className="absolute inset-0" style={DOTS} />
      {/* Accent glow emanating from left */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse,${a.glowStrong} 0%,transparent 65%)` }} />

      <div className="relative z-10 px-20 max-w-[62%]">
        <Badge label="Presentation" a={a} />
        <h1 className="text-[3.8rem] font-black leading-[1.0] tracking-[-0.02em] mt-5 mb-4" style={{ color: T1 }}>
          {slide.title}
        </h1>
        <div className="w-16 h-[4px] rounded-full mb-5" style={{ background: a.grad }} />
        {subtitle && (
          <p className="text-[1.15rem] font-light leading-relaxed max-w-[520px]" style={{ color: T2 }}>{subtitle}</p>
        )}
      </div>

      {/* Bottom-right year watermark */}
      <div className="absolute bottom-6 right-10 text-[11px] font-semibold tracking-[0.22em] uppercase" style={{ color: T3 }}>
        {new Date().getFullYear()}
      </div>
      <AccentBar a={a} />
    </div>
  )
}

// ─── BulletsSlide ─────────────────────────────────────────────────────────────
// Left 65%: numbered bullet cards. Right 35%: photo sidebar with gradient fade.

export function BulletsSlide({ slide }: SlideLayoutProps) {
  const a       = getAccent(slide.color)
  const bullets = parse(slide.content)
  const photo   = photoUrl(slide.title + ' ' + slide.content, slide.image_url, 1)

  return (
    <div className="h-full relative overflow-hidden flex" style={{ background: BG }}>
      {/* Dot texture underneath everything */}
      <div className="absolute inset-0" style={DOTS} />

      {/* LEFT — content area */}
      <div className="relative z-10 flex flex-col w-[64%] flex-shrink-0">
        {/* Header */}
        <div className="px-12 pt-9 pb-3 flex-shrink-0">
          <Badge label="Key Points" a={a} />
          <h2 className="text-[1.9rem] font-black tracking-tight leading-tight mt-3" style={{ color: T1 }}>
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p className="text-[0.88rem] font-light mt-1.5 leading-snug" style={{ color: T2 }}>{slide.subtitle}</p>
          )}
          <div className="w-10 h-[3px] rounded-full mt-3" style={{ background: a.hex }} />
        </div>

        {/* Bullets */}
        <div className="flex-1 flex flex-col gap-2 px-12 pb-9 overflow-hidden">
          {bullets.slice(0, 6).map((b, i) => (
            <div
              key={i}
              className="flex items-start gap-4 flex-1 rounded-xl px-4 py-3"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, minHeight: 0 }}
            >
              <div
                className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-white font-black text-[11px]"
                style={{ background: a.grad, boxShadow: `0 3px 10px ${a.glow}` }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <p className="text-[0.9rem] leading-snug font-medium pt-0.5" style={{ color: T1 }}>{b}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — photo sidebar */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} />
        {/* Fade in from the left */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(12,15,26,1) 0%,rgba(12,15,26,0.3) 50%,transparent 100%)' }} />
        {/* Accent glow overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 60% 40%,${a.glow} 0%,transparent 70%)` }} />
      </div>

      <AccentBar a={a} />
    </div>
  )
}

// ─── NumbersSlide ─────────────────────────────────────────────────────────────
// Full-bleed photo background + dark overlay. Stat cards float on top in 2×2.

export function NumbersSlide({ slide }: SlideLayoutProps) {
  const a     = getAccent(slide.color)
  const lines = parse(slide.content)
  const photo = photoUrl(slide.title + ' ' + slide.content, slide.image_url, 2)

  return (
    <div className="h-full relative overflow-hidden flex flex-col" style={{ background: BG }}>
      {/* Full-bleed photo */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} />
      {/* Heavy dark overlay so text stays legible */}
      <div className="absolute inset-0" style={{ background: 'rgba(12,15,26,0.82)' }} />
      <div className="absolute inset-0" style={GRID} />
      {/* Accent glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle,${a.glowStrong} 0%,transparent 60%)` }} />

      {/* Header */}
      <div className="relative z-10 px-14 pt-9 pb-3 flex-shrink-0">
        <Badge label="By the Numbers" a={a} />
        <h2 className="text-[2rem] font-black tracking-tight leading-tight mt-3" style={{ color: T1 }}>
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p className="text-[0.88rem] font-light mt-1.5" style={{ color: T2 }}>{slide.subtitle}</p>
        )}
        <div className="w-10 h-[3px] rounded-full mt-3" style={{ background: a.hex }} />
      </div>

      {/* 2×2 stat cards */}
      <div className="relative z-10 flex-1 px-14 pb-10 grid grid-cols-2 gap-4 overflow-hidden">
        {lines.slice(0, 4).map((line, i) => {
          const num   = line.match(/[\d,.]+\s*[%$€£KMBkmb+×xX]?/)?.[0]?.trim() ?? String(i + 1)
          const label = line.replace(/[\d,.]+\s*[%$€£KMBkmb+×xX]?/, '').replace(/^[:\-–]\s*/, '').trim()
          return (
            <div
              key={i}
              className="relative rounded-2xl px-8 py-6 overflow-hidden flex flex-col justify-between"
              style={{ background: 'rgba(12,15,26,0.75)', border: `1px solid ${BORDER}`, backdropFilter: 'blur(12px)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: a.grad }} />
              <div
                className="text-[3.2rem] font-black leading-none mb-3"
                style={{ background: a.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
              >
                {num}
              </div>
              <p className="text-[0.88rem] font-medium leading-snug" style={{ color: T2 }}>{label}</p>
            </div>
          )
        })}
      </div>

      <AccentBar a={a} />
    </div>
  )
}

// ─── TimelineSlide ────────────────────────────────────────────────────────────
// Top photo banner (30% height) with gradient fade down. Steps below.

export function TimelineSlide({ slide }: SlideLayoutProps) {
  const a     = getAccent(slide.color)
  const steps = parse(slide.content).slice(0, 5)
  const photo = photoUrl(slide.title + ' ' + slide.content, slide.image_url, 3)
  const horiz = steps.length <= 4

  return (
    <div className="h-full relative overflow-hidden flex flex-col" style={{ background: BG }}>
      {/* Photo banner top */}
      <div className="absolute top-0 left-0 right-0 h-[38%] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(12,15,26,0.5) 0%,rgba(12,15,26,0.97) 100%)' }} />
        {/* Accent tint */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(135deg,${a.glow} 0%,transparent 60%)` }} />
      </div>

      {/* Header floats on top of photo */}
      <div className="relative z-10 px-14 pt-9 pb-0 flex-shrink-0">
        <Badge label="Roadmap" a={a} />
        <h2 className="text-[2.1rem] font-black tracking-tight leading-tight mt-3" style={{ color: T1 }}>
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p className="text-[0.88rem] font-light mt-1.5" style={{ color: T2 }}>{slide.subtitle}</p>
        )}
        <div className="w-10 h-[3px] rounded-full mt-3" style={{ background: a.hex }} />
      </div>

      {/* Steps */}
      <div className="relative z-10 flex-1 px-14 pb-8 pt-5 flex flex-col justify-center overflow-hidden">
        {horiz ? (
          <div className="relative">
            <div className="absolute top-[18px] left-[18px] right-[18px] h-[2px]"
              style={{ background: `linear-gradient(90deg,${a.hex},rgba(255,255,255,0.06))` }} />
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${steps.length},1fr)` }}>
              {steps.map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm z-10"
                    style={{ background: a.grad, boxShadow: `0 0 18px ${a.glowStrong}` }}
                  >
                    {i + 1}
                  </div>
                  <div
                    className="w-full rounded-xl p-3 text-center"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                  >
                    <p className="text-[0.82rem] font-medium leading-snug" style={{ color: T1 }}>{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative space-y-2.5">
            <div className="absolute left-[18px] top-[18px] bottom-0 w-[2px]"
              style={{ background: `linear-gradient(180deg,${a.hex},transparent)` }} />
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-5">
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm z-10"
                  style={{ background: a.grad, boxShadow: `0 0 14px ${a.glow}` }}
                >
                  {i + 1}
                </div>
                <div
                  className="flex-1 rounded-xl px-5 py-3"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                >
                  <p className="text-[0.9rem] font-medium" style={{ color: T1 }}>{step}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AccentBar a={a} />
    </div>
  )
}

// ─── TwoColumnSlide ───────────────────────────────────────────────────────────
// Left: photo panel with gradient overlay + title. Right: numbered content cards.

export function TwoColumnSlide({ slide }: SlideLayoutProps) {
  const a     = getAccent(slide.color)
  const lines = parse(slide.content)
  const mid   = Math.ceil(lines.length / 2)
  const left  = lines.slice(0, mid)
  const right = lines.slice(mid)
  const photo = photoUrl(slide.title + ' ' + slide.content, slide.image_url, 4)

  return (
    <div className="h-full relative overflow-hidden flex" style={{ background: BG }}>
      {/* LEFT — photo panel */}
      <div
        className="relative w-[42%] flex flex-col justify-end pb-10 px-10 overflow-hidden flex-shrink-0"
        style={{ borderRight: `1px solid ${BORDER}` }}
      >
        {/* Photo */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} />
        {/* Dark gradient: heavier at bottom where text lives */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(12,15,26,0.4) 0%,rgba(12,15,26,0.93) 55%,rgba(12,15,26,0.98) 100%)' }} />
        {/* Accent tint */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 40% 30%,${a.glow} 0%,transparent 65%)` }} />

        {/* Text on top of photo */}
        <div className="relative z-10">
          <Badge label="Analysis" a={a} />
          <h2 className="text-[1.85rem] font-black leading-tight tracking-tight mt-4 mb-3" style={{ color: T1 }}>
            {slide.title}
          </h2>
          <div className="w-10 h-[3px] rounded-full mb-4" style={{ background: a.hex }} />
          {slide.subtitle && (
            <p className="text-[0.82rem] font-light leading-relaxed mb-3" style={{ color: T2 }}>{slide.subtitle}</p>
          )}
          <div className="space-y-2.5">
            {left.map((l, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: a.hex }} />
                <p className="text-[0.84rem] font-light leading-relaxed" style={{ color: T2 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — dark numbered cards */}
      <div className="relative flex-1 flex flex-col justify-center px-10 py-12 overflow-hidden">
        <div className="absolute inset-0" style={DOTS} />
        <div className="absolute bottom-[-20%] left-[-20%] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle,${a.glow} 0%,transparent 65%)` }} />
        <div className="relative z-10 space-y-3">
          {right.map((l, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-xl px-5 py-3.5"
              style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            >
              <div
                className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-white font-black text-xs"
                style={{ background: a.grad, boxShadow: `0 3px 10px ${a.glow}` }}
              >
                {i + 1}
              </div>
              <p className="text-[0.92rem] font-medium leading-snug pt-0.5" style={{ color: T1 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      <AccentBar a={a} />
    </div>
  )
}

// ─── ContentSlide ─────────────────────────────────────────────────────────────
// Top section: photo strip full-width (35% height). Bottom: bullet list.

export function ContentSlide({ slide }: SlideLayoutProps) {
  const a      = getAccent(slide.color)
  const lines  = parse(slide.content)
  const asList = lines.length > 1
  const photo  = photoUrl(slide.title + ' ' + slide.content, slide.image_url, 5)

  return (
    <div className="h-full relative overflow-hidden flex flex-col" style={{ background: BG }}>
      {/* Photo strip at top */}
      <div className="absolute top-0 left-0 right-0 h-[32%] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(12,15,26,0.55) 0%,rgba(12,15,26,1) 100%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(90deg,${a.glow} 0%,transparent 50%)` }} />
      </div>

      <div className="absolute inset-0" style={DOTS} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle,${a.glow} 0%,transparent 65%)`, opacity: 0.6 }} />

      {/* Header — floats over photo strip */}
      <div className="relative z-10 px-14 pt-9 pb-3 flex-shrink-0">
        <Badge label="Insights" a={a} />
        <h2 className="text-[2.1rem] font-black tracking-tight leading-tight mt-3" style={{ color: T1 }}>
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p className="text-[0.88rem] font-light mt-1.5" style={{ color: T2 }}>{slide.subtitle}</p>
        )}
        <div className="w-10 h-[3px] rounded-full mt-3" style={{ background: a.hex }} />
      </div>

      {/* Content area */}
      <div className="relative z-10 flex-1 px-14 pb-8 flex flex-col justify-start overflow-hidden">
        {asList ? (
          <div className="space-y-2">
            {lines.slice(0, 6).map((line, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-xl px-5 py-3"
                style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
              >
                <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2" style={{ background: a.hex }} />
                <p className="text-[0.9rem] font-medium leading-snug" style={{ color: T1 }}>{line}</p>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="w-full rounded-2xl p-10 relative overflow-hidden"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div className="absolute top-3 left-8 text-[5rem] font-black leading-none" style={{ color: a.hex, opacity: 0.10 }}>"</div>
            <p className="text-[1.4rem] font-semibold leading-relaxed relative z-10" style={{ color: T1 }}>
              {lines[0] ?? slide.content}
            </p>
          </div>
        )}
      </div>

      <AccentBar a={a} />
    </div>
  )
}

// ─── ImageTextSlide ───────────────────────────────────────────────────────────
// Right: large photo panel (55%). Left: dark content panel with bullets.

export function ImageTextSlide({ slide }: SlideLayoutProps) {
  const a     = getAccent(slide.color)
  const photo = photoUrl(slide.title + ' ' + slide.content, slide.image_url, 6)
  const lines = parse(slide.content)

  return (
    <div className="h-full relative overflow-hidden flex" style={{ background: BG }}>
      {/* LEFT — text panel */}
      <div className="relative z-10 flex flex-col justify-center w-[50%] flex-shrink-0 px-12 py-12 overflow-hidden">
        <div className="absolute inset-0" style={DOTS} />
        <div className="absolute top-[-20%] left-[-20%] w-[450px] h-[450px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle,${a.glow} 0%,transparent 65%)` }} />
        <div className="relative z-10">
          <Badge label="Spotlight" a={a} />
          <h2 className="text-[2rem] font-black leading-tight tracking-tight mt-4 mb-3" style={{ color: T1 }}>
            {slide.title}
          </h2>
          <div className="w-10 h-[3px] rounded-full mb-4" style={{ background: a.hex }} />
          {slide.subtitle && (
            <p className="text-[0.85rem] font-light leading-relaxed mb-4" style={{ color: T2 }}>{slide.subtitle}</p>
          )}
          <div className="space-y-2.5">
            {lines.slice(0, 5).map((l, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div
                  className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-white font-bold text-[10px] mt-0.5"
                  style={{ background: a.grad }}
                >
                  {i + 1}
                </div>
                <p className="text-[0.88rem] font-medium leading-snug" style={{ color: T1 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — photo panel */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} />
        {/* Fade from left */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(12,15,26,0.98) 0%,rgba(12,15,26,0.2) 40%,transparent 100%)' }} />
        {/* Accent tint */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 70% 50%,${a.glow} 0%,transparent 60%)` }} />
      </div>

      <AccentBar a={a} />
    </div>
  )
}
