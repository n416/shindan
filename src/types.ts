// ─────────────────────────────────────────────────────────────
//  ドメイン型定義
//  Hono バックエンドと後で接続する際も、このスキーマを共有する想定。
// ─────────────────────────────────────────────────────────────

/** 4つの軸 */
export type AxisKey = 'EI' | 'SN' | 'TF' | 'JP';

/** 各軸の極（どちらかに加点される） */
export type Pole =
  | 'E' | 'I'
  | 'S' | 'N'
  | 'T' | 'F'
  | 'J' | 'P';

/** 質問の意図（見栄バイアス / 恐怖バイアス） */
export type BiasType = 'vanity' | 'fear';

/** 選択肢（A / B） */
export interface Choice {
  /** 表示ラベル */
  label: 'A' | 'B';
  /** 選択肢本文 */
  text: string;
  /** この選択肢を選んだ時に加点される極 */
  pole: Pole;
  /** デバッグ用：なぜこの加点なのかの理由 */
  reason: string;
}

/** 1問の質問 */
export interface Question {
  /** 内部ID 例: "EI-01" */
  id: string;
  /** 所属する軸 */
  axis: AxisKey;
  /** 測定バイアス */
  bias: BiasType;
  /** 質問文（シチュエーション） */
  text: string;
  /** 必ず2択 */
  choices: [Choice, Choice];
}

/** 各極の素点 */
export type Scores = Record<Pole, number>;

/** 1軸の判定結果 */
export interface AxisResult {
  axis: AxisKey;
  /** 確定した極（同票の場合は null = キメラ） */
  winner: Pole | null;
  /** 同票（2対2 等）かどうか */
  isChimera: boolean;
  /** [先に来る極, 後に来る極]（キメラ表示の "(E/I)" 用） */
  poles: [Pole, Pole];
}

/** 同票（キメラ）になった軸ごとの葛藤情報 */
export interface AxisConflict {
  axis: AxisKey;
  poles: [Pole, Pole];
  /** その軸固有の葛藤テキスト */
  text: string;
}

/** 最終診断結果 */
export interface DiagnosisResult {
  /** 4軸の判定 */
  axes: AxisResult[];
  /** 表示用タイプ文字列 例: "ENTJ" / "EN(T/F)J" */
  typeLabel: string;
  /** キメラ（同票軸）を1つでも含むか */
  hasChimera: boolean;
  /** 確定タイプ（キメラ部分は便宜的に一方へ寄せた4文字） */
  resolvedType: string;
  /** ベースとなるタイプの通り名と解説（闇＝NOIR：見栄と恐怖） */
  persona: Persona;
  /** 同票だった軸ごとの葛藤テキスト（NOIR・同票が無ければ空配列） */
  chimeraConflicts: AxisConflict[];
  /** ポジティブ版の通り名と解説（光＝LUMEN：強み） */
  personaLight: Persona;
  /** 同票だった軸ごとのポジティブ版テキスト（LUMEN） */
  chimeraConflictsLight: AxisConflict[];
}

/** タイプの通り名・解説 */
export interface Persona {
  /** 通り名 例: "完璧主義なサイボーグ" */
  title: string;
  /** ひとことキャッチ */
  tagline: string;
  /** 解説文 */
  description: string;
  /** キメラ合成用の上半身（例："反逆の"） */
  prefix?: string;
  /** キメラ合成用の下半身（例："起業家"） */
  suffix?: string;
}

/** 画面フェーズ */
export type Phase = 'start' | 'question' | 'reveal' | 'result';
