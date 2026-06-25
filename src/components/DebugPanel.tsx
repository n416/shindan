import { useState } from 'react';
import type { Phase, Scores } from '../types';
import type { AxisDebug, AxisStatus } from '../hooks/useQuiz';

interface Props {
  phase: Phase;
  scores: Scores;
  axisDebug: AxisDebug[];
  currentQuestionId: string | null;
  nextQuestionId: string | null;
  answeredCount: number;
}

const STATUS_LABEL: Record<AxisStatus, string> = {
  pending: '…',
  extending: '延長戦',
  resolved: '確定',
  chimera: 'CHIMERA',
};

const STATUS_COLOR: Record<AxisStatus, string> = {
  pending: 'text-ash/50',
  extending: 'text-amber-300/90',
  resolved: 'text-emerald-300/90',
  chimera: 'text-blood-soft',
};

/** 隠し機能：右下のトグルで開くデバッグオーバーレイ */
export function DebugPanel({
  phase,
  scores,
  axisDebug,
  currentQuestionId,
  nextQuestionId,
  answeredCount,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* トグルボタン（右下に小さく） */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-3 right-3 z-[60] rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-widest backdrop-blur-sm transition-colors ${
          open
            ? 'border-blood-soft/70 bg-blood/20 text-blood-soft'
            : 'border-white/15 bg-black/40 text-ash/50 hover:text-ash'
        }`}
        aria-pressed={open}
      >
        {open ? '■ DEBUG' : '□ Debug'}
      </button>

      {/* オーバーレイパネル */}
      {open && (
        <div className="fixed bottom-12 right-3 z-[60] w-[252px] rounded-lg border border-white/15 bg-black/80 p-3 font-mono text-[11px] leading-relaxed text-emerald-300/90 shadow-2xl backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1.5 text-white/70">
            <span>// DEBUG MODE: ON</span>
            <span className="text-ash/50">{phase}</span>
          </div>

          {/* 軸ごとのスコア＆早期打ち切り状態 */}
          <div className="space-y-0.5">
            {axisDebug.map((ax) => (
              <div key={ax.axis} className="flex items-center justify-between gap-2">
                <span className="text-white/80">
                  {ax.poles[0]}:{ax.votes[0]} / {ax.poles[1]}:{ax.votes[1]}
                  <span className="text-ash/40"> ({ax.answered}q)</span>
                </span>
                <span className={STATUS_COLOR[ax.status]}>
                  {STATUS_LABEL[ax.status]}
                </span>
              </div>
            ))}
          </div>

          {/* 素点（参考） */}
          <div className="mt-2 border-t border-white/10 pt-1.5 text-ash/50">
            raw E{scores.E} I{scores.I} S{scores.S} N{scores.N} T{scores.T} F{scores.F} J{scores.J} P{scores.P}
          </div>

          <div className="mt-2 border-t border-white/10 pt-1.5 text-white/60">
            <div>answered : {answeredCount}</div>
            <div>
              current  : <span className="text-amber-300/90">{currentQuestionId ?? '—'}</span>
            </div>
            <div className="break-all">
              next     : <span className="text-cyan-300/90">{nextQuestionId ?? '(end → result)'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
