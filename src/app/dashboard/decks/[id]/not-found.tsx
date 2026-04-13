import Link from 'next/link'

export default function DeckNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="text-5xl">🔍</div>
      <h2 className="text-[18px] font-semibold">Deck not found</h2>
      <p className="text-[14px] text-white/40">
        This deck doesn't exist or you don't have access to it.
      </p>
      <Link href="/dashboard" className="px-4 py-2 bg-white text-black rounded-md text-[13px] font-medium hover:bg-white/90 transition">
        Back to decks
      </Link>
    </div>
  )
}
