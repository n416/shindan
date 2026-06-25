import type { Choice, Question } from '../types';
import { ProgressBar } from './ProgressBar';

interface Props {
  question: Question;
  /** 現在の軸（0-based） */
  axisIndex: number;
  /** 軸の総数 */
  axisTotal: number;
  progress: number;
  canGoBack: boolean;
  onAnswer: (choice: Choice) => void;
  onBack: () => void;
}

const BIAS_LABEL: Record<Question['bias'], string> = {
  vanity: '── 仮面 / 見栄 ──',
  fear: '── 延長戦 / 恐怖 ──',
};

/** 質問画面：進捗バー + シチュエーション + 2択カード */
export function QuestionScreen({
  question,
  axisIndex,
  axisTotal,
  progress,
  canGoBack,
  onAnswer,
  onBack,
}: Props) {
  return (
    // key で問題ごとに再マウントしてフェードを効かせる
    <div key={question.id} className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-10 pt-8 sm:pt-12">
      <ProgressBar progress={progress} axisStep={axisIndex + 1} axisTotal={axisTotal} />

      <div className="animate-fade-up mt-10 flex flex-1 flex-col">
        {/* バイアス種別ラベル */}
        <p
          className={`mb-4 text-center text-[11px] tracking-[0.4em] ${
            question.bias === 'fear' ? 'text-blood-soft/80' : 'text-violet-glow/70'
          }`}
        >
          {BIAS_LABEL[question.bias]}
        </p>

        {/* 質問文 */}
        <h2 className="mb-9 text-center text-lg font-bold leading-relaxed sm:text-xl">
          {question.text}
        </h2>

        {/* 2択カード（縦並び・広いタップ領域） */}
        <div className="flex flex-col gap-4">
          {question.choices.map((choice) => (
            <button
              key={choice.label}
              onClick={() => onAnswer(choice)}
              className="group relative w-full rounded-2xl border border-white/10 bg-noir-800/60 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:border-blood-soft hover:bg-noir-700/70 hover:shadow-[0_0_28px_-6px_rgba(226,58,93,0.5)] focus:outline-none focus-visible:border-blood-soft active:scale-[0.99]"
            >
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-white/15 text-sm font-bold text-ash transition-colors duration-300 group-hover:border-blood-soft group-hover:bg-blood/20 group-hover:text-white">
                  {choice.label}
                </span>
                <p className="text-[15px] leading-relaxed text-white/90 group-hover:text-white">
                  {choice.text}
                </p>
              </div>
              {/* ホバー時に左端が灯る */}
              <span className="pointer-events-none absolute inset-y-3 left-0 w-[2px] rounded-full bg-blood-soft opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </button>
          ))}
        </div>

        {/* 戻る */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={onBack}
            disabled={!canGoBack}
            className="text-xs tracking-widest text-ash/50 transition-colors hover:text-ash disabled:opacity-0"
          >
            ← ひとつ戻る
          </button>
        </div>
      </div>
    </div>
  );
}
