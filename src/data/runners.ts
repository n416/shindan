// ─────────────────────────────────────────────────────────────
//  タイプ別「走りドット絵」スプライトの解決テーブル
//
//  方針：色替えではなく、各タイプの「通り名」に合わせて PixelLab の
//  「Create from Reference」でベースから別キャラとして生成する。
//  仮面の形・シルエット・小物・差し色を変えるので、色違いではなく別人。
//
//  追加手順：
//   1. East の走りを透過GIFで Export
//   2. public/sprites/runner-<type小文字>.gif として置く（例 runner-intj.gif）
//   3. 下の該当行のコメントを外す
//  未登録（コメントのまま）のタイプは共通ベース RUNNER_BASE で表示される。
// ─────────────────────────────────────────────────────────────

/** 全タイプ共通の暫定ベース（未生成タイプの onError フォールバック先） */
export const RUNNER_BASE = '/sprites/runner-east.gif';

/**
 * 確定タイプ → 走りスプライトのパス（規約: /sprites/runner-<type小文字>.gif）。
 * バッチで生成したファイルを置けば自動で参照される。まだ無いタイプは
 * 画像読み込み失敗時に PixelRunner 側で RUNNER_BASE にフォールバックする。
 */
export function runnerSprite(resolvedType: string): string {
  return `/sprites/runner-${resolvedType.toLowerCase()}.gif`;
}

/** 確定タイプ → 8方向回転ループのパス（/sprites/spin-<type小文字>.gif）。 */
export function spinSprite(resolvedType: string): string {
  return `/sprites/spin-${resolvedType.toLowerCase()}.gif`;
}

// ─────────────────────────────────────────────────────────────
//  4大グループ（NT 分析家 / NF 外交官 / SJ 番人 / SP 探検家）の
//  背景グロー色。確定タイプ4文字の組み合わせから判定する。
//    2文字目 N → 3文字目で NT(T) / NF(F)
//    2文字目 S → 4文字目で SJ(J) / SP(P)
// ─────────────────────────────────────────────────────────────
export type RunnerGroup = 'NT' | 'NF' | 'SJ' | 'SP';

/** 背景グローの RGB 三つ組（rgba(..., α) に差し込む） */
const GROUP_GLOW_RGB: Record<RunnerGroup, string> = {
  NT: '139, 92, 246', // 分析家：紫
  NF: '16, 185, 129', // 外交官：緑
  SJ: '59, 130, 246', // 番人：青
  SP: '250, 204, 21', // 探検家：黄
};

/** 確定タイプ4文字 → 所属グループ */
export function runnerGroup(resolvedType: string): RunnerGroup {
  const t = resolvedType.toUpperCase();
  if (t[1] === 'N') return t[2] === 'T' ? 'NT' : 'NF';
  return t[3] === 'J' ? 'SJ' : 'SP';
}

/** 確定タイプ4文字 → 背景グローの RGB 三つ組 */
export function runnerGlowRgb(resolvedType: string): string {
  return GROUP_GLOW_RGB[runnerGroup(resolvedType)];
}
