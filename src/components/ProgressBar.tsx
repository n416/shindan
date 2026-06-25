interface Props {
  /** 0–1 */
  progress: number;
  /** 現在の軸（1-based） */
  axisStep: number;
  /** 軸の総数 */
  axisTotal: number;
}

/**
 * 細くスタイリッシュな進捗バー。
 * 早期打ち切りで総出題数が変動するため、固定の「Q/16」ではなく
 * 「軸 N/4」＋達成率で進捗を示す。
 */
export function ProgressBar({ progress, axisStep, axisTotal }: Props) {
  const pct = Math.round(progress * 100);
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-ash/70">
        <span>
          AXIS {String(axisStep).padStart(2, '0')} / {String(axisTotal).padStart(2, '0')}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-glow via-blood-soft to-blood transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(pct, 4)}%` }}
        >
          {/* 走光 */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="animate-shimmer h-full w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
