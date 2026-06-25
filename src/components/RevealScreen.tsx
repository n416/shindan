interface Props {
  onSelect: (tone: 'lumen' | 'noir') => void;
}

export function RevealScreen({ onSelect }: Props) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <div className="animate-fade-up">
        <p className="mb-5 text-[11px] uppercase tracking-[0.55em] text-ash/60">
          Diagnosis Complete
        </p>
        <h2 className="mb-12 text-2xl font-bold tracking-widest text-white sm:text-3xl">
          診断結果が完成しました。
          <br />
          <span className="mt-4 block text-lg text-ash">どちらを見ますか？</span>
        </h2>
      </div>

      <div
        className="animate-fade-up flex w-full max-w-xs flex-col gap-4 sm:max-w-sm"
        style={{ animationDelay: '0.15s' }}
      >
        <button
          onClick={() => onSelect('lumen')}
          className="glow-cta group relative w-full rounded-2xl border border-amber-300/30 bg-amber-300/10 px-8 py-5 text-base font-bold tracking-wide text-amber-200 backdrop-blur-sm transition-all hover:bg-amber-300/20"
        >
          <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
            光（強み）を見る
          </span>
          <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </button>

        <button
          onClick={() => onSelect('noir')}
          className="glow-cta group relative w-full rounded-2xl border border-blood/30 bg-blood/10 px-8 py-5 text-base font-bold tracking-wide text-blood-soft backdrop-blur-sm transition-all hover:bg-blood/20"
        >
          <span className="bg-gradient-to-r from-white to-blood-soft bg-clip-text text-transparent">
            闇（見栄）を見る
          </span>
          <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </button>
      </div>
    </div>
  );
}
