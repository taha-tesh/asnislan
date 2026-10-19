const tones = {
  navy: "from-navy to-navy-soft text-white",
  leaf: "from-leaf to-emerald-500 text-white",
  gold: "from-gold to-amber-400 text-navy",
  rose: "from-rose to-pink-400 text-white",
} as const;

export function StatCard({ label, value, tone }: { label: string; value: string | number; tone: keyof typeof tones }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-3 shadow-lg shadow-navy/10 sm:p-4 ${tones[tone]}`}>
      <p className="text-[11px] leading-tight opacity-80 sm:text-xs">{label}</p>
      <p className="mt-1 text-lg font-extrabold tabular-nums sm:text-2xl">{value}</p>
    </div>
  );
}
