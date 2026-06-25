import type { CSSProperties } from 'react';
import { runnerSprite, spinSprite, runnerGlowRgb, RUNNER_BASE } from '../data/runners';

interface Props {
  /** 確定タイプ（例 "ENTJ"）。 */
  type: string;
  /** 'run' = 走り（runner-*.gif）/ 'spin' = 8方向回転（spin-*.gif）。既定 'run'。 */
  variant?: 'run' | 'spin';
  /** プレビュー用：true で URL にキャッシュ回避クエリを付け、最新GIFを必ず取得する。 */
  bust?: boolean;
}

/**
 * 結果画面の小さなステージ。タイプ別のドット絵キャラを表示する。
 * スプライトは正方形枠の中央・高さ約50%という共通フォーマット前提で、
 * .pixel-runner（固定高さ＋中央寄せ）が 124px でも 244px でも同じ見え方にする。
 * 専用スプライト未生成のタイプは onError で共通ベースにフォールバックする。
 */
export function PixelRunner({ type, variant = 'run', bust }: Props) {
  // グループ（NT/NF/SJ/SP）ごとの背景グロー色を CSS 変数で渡す
  const trackStyle = {
    '--runner-glow-rgb': runnerGlowRgb(type),
  } as CSSProperties;

  const base = variant === 'spin' ? spinSprite(type) : runnerSprite(type);
  const src = bust ? `${base}?t=${Date.now()}` : base;

  return (
    <div className="pixel-runner-track" aria-hidden style={trackStyle}>
      <img
        className="pixel-runner"
        src={src}
        alt=""
        onError={(e) => {
          // 未生成のタイプは共通ベースで表示（無限ループ防止に一度だけ）
          const img = e.currentTarget;
          if (!img.dataset.fellback) {
            img.dataset.fellback = '1';
            img.src = RUNNER_BASE;
          }
        }}
      />
    </div>
  );
}
