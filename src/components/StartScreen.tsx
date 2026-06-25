import { useState, useEffect } from 'react';

interface Props {
  onStart: () => void;
  questionCount: number;
}

/** スタート画面：タイトルロゴ・キャッチコピー・発光CTA */
export function StartScreen({ onStart, questionCount }: Props) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastResult, setLastResult] = useState<{ typeLabel: string; title: string; urlParam: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('persona_last_result');
      if (saved) {
        setLastResult(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load last result', e);
    }
  }, []);

  const handleStart = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      onStart();
      setIsAnimating(false);
    }, 600);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <div className="animate-fade-up">
        <p className="mb-5 text-[11px] uppercase tracking-[0.55em] text-ash/60">
          Psyche Diagnostic
        </p>

        {/* タイトルロゴ（テキスト） */}
        <h1 className="font-display text-5xl font-black leading-none tracking-tight sm:text-7xl">
          <span className="block bg-gradient-to-b from-white via-white to-ash/40 bg-clip-text text-transparent">
            PERSONA
          </span>
          <span className="mt-1 block bg-gradient-to-b from-blood-soft to-blood bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(226,58,93,0.35)]">
            NOIR
          </span>
        </h1>

        <div className="mx-auto my-7 h-px w-16 bg-gradient-to-r from-transparent via-blood to-transparent" />

        {/* キャッチコピー */}
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-ash sm:max-w-sm sm:text-base">
          あなたが被る<span className="text-white">「見栄」</span>の仮面と、
          その下に隠した<span className="text-blood-soft">「恐怖」</span>。
          <br />
          究極の二択だけが、本当のあなたを暴く。
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={handleStart}
        disabled={isAnimating}
        className={`glow-cta glow-cta-noir group relative mt-12 w-full max-w-xs rounded-2xl border border-blood/50 bg-noir-800/70 px-8 py-5 text-base font-bold tracking-wide backdrop-blur-sm sm:max-w-sm ${
          isAnimating ? 'animate-flash-fast' : ''
        }`}
        style={{ animationDelay: '0.15s' }}
      >
        <span className="bg-gradient-to-r from-white to-blood-soft bg-clip-text text-transparent">
          診断を始める
        </span>
        <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      </button>

      <p className="animate-fade-up mt-6 text-[11px] tracking-widest text-ash/40" style={{ animationDelay: '0.25s' }}>
        所要 約2分 ・ あなたの迷い次第で {questionCount / 2}〜{questionCount}問
      </p>

      {/* 前回の結果表示 */}
      {lastResult && (
        <div className="animate-fade-up mt-12 flex flex-col items-center gap-3" style={{ animationDelay: '0.35s' }}>
          <p className="text-[12px] leading-relaxed text-ash/70">
            前回の結果：<span className="font-bold text-white">{lastResult.typeLabel}</span> {lastResult.title} でした。
          </p>
          <a
            href={lastResult.urlParam}
            className="rounded-xl border border-white/10 bg-noir-800/50 px-4 py-2 text-[11px] font-bold tracking-widest text-ash transition-all hover:border-blood-soft/50 hover:text-white"
          >
            [ 診断結果をもう一度見る ]
          </a>
        </div>
      )}
    </div>
  );
}
