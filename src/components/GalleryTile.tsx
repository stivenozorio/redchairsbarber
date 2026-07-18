import Reveal from "./Reveal";
import type { GalleryItem } from "../data/gallery";

const PATTERNS = [
  "from-crimson/40 via-obsidian to-obsidian",
  "from-gold/20 via-obsidian to-obsidian",
  "from-charcoal via-crimson/20 to-obsidian",
];

export default function GalleryTile({
  item,
  index,
  delay = 0,
}: {
  item: GalleryItem;
  index: number;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <div
        className={`group relative flex aspect-[4/5] items-end overflow-hidden rounded-sm border border-gold/10 bg-gradient-to-br ${
          PATTERNS[index % PATTERNS.length]
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(201,169,97,0.15),transparent_60%)] transition-opacity duration-500 group-hover:opacity-70" />
        <div className="absolute inset-0 flex items-center justify-center opacity-10 transition-transform duration-700 group-hover:scale-110">
          <span className="font-display text-7xl text-ivory">RC</span>
        </div>
        <div className="relative z-10 w-full border-t border-gold/10 bg-obsidian/60 p-5 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-widest2 text-gold/80">{item.category}</p>
          <p className="mt-1 font-display text-lg text-ivory">{item.label}</p>
        </div>
      </div>
    </Reveal>
  );
}
