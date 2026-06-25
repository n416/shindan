import { useCallback, useMemo, useState } from 'react';
import type {
  AxisConflict,
  AxisKey,
  AxisResult,
  Choice,
  DiagnosisResult,
  Phase,
  Pole,
  Question,
  Scores,
} from '../types';
import { QUESTIONS } from '../data/questions';
import {
  PERSONAS,
  CHIMERA_PERSONA,
  AXIS_CHIMERA_TEXT,
  PERSONAS_LIGHT,
  CHIMERA_PERSONA_LIGHT,
  AXIS_CHIMERA_TEXT_LIGHT,
} from '../data/personas';

// ─────────────────────────────────────────────────────────────
//  useQuiz：診断の状態管理フック（早期打ち切りロジック版）
//
//  【出題アルゴリズム（1軸あたり最大4問）】
//  各軸は Q1・Q2（見栄）→ Q3・Q4（恐怖）の順に並ぶ。
//   1. まず Q1・Q2 を出題する。
//   2. Q1・Q2 が同票（2-0）なら、その軸を即確定し Q3・Q4 はスキップ。
//   3. Q1・Q2 が割れた（1-1）場合のみ、延長戦として Q3・Q4 を出題する。
//   4. 4問答えて「2-2」になった軸のみ、キメラ状態として確定する。
//
//  出題対象は「これまでの回答」から都度導出する（answers が単一の真実の源）。
//  これにより前進・後退・採点がすべて整合する。
//
//  ・現状はモックデータ（QUESTIONS）で完結。
//  ・Hono バックエンド接続時は
//      - questions を fetchQuestions() の結果に
//      - buildDiagnosis(scores) を submitAnswers(answers) の POST に
//    差し替えるだけで済むよう、I/O 境界をこの中に閉じてある。
// ─────────────────────────────────────────────────────────────

const ZERO_SCORES: Scores = {
  E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0,
};

/** タイプ文字列・出題を組む際の軸の並び順 */
const AXIS_ORDER: AxisKey[] = ['EI', 'SN', 'TF', 'JP'];

/** 軸 → [先に来る極, 後に来る極]（タイプ文字列の並び順 EIxx/SNxx/...） */
const AXIS_POLES: Record<AxisKey, [Pole, Pole]> = {
  EI: ['E', 'I'],
  SN: ['S', 'N'],
  TF: ['T', 'F'],
  JP: ['J', 'P'],
};

/** 軸ごとに [Q1, Q2, Q3, Q4] の順へグルーピング（ID昇順） */
function groupByAxis(questions: Question[]): Record<AxisKey, Question[]> {
  const map: Record<AxisKey, Question[]> = { EI: [], SN: [], TF: [], JP: [] };
  for (const q of questions) map[q.axis].push(q);
  for (const axis of AXIS_ORDER) {
    map[axis].sort((a, b) => a.id.localeCompare(b.id));
  }
  return map;
}

type AnswerMap = Record<string, Choice>;

export interface UseQuizProps {
  isDebug?: boolean;
}

// ── シャッフル用ユーティリティ ──
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 早期打ち切りロジックに基づき、次に出題「可能」なすべての質問を導出する。
 * 戻り値が空配列なら全軸確定済み（= 結果へ）。
 */
function getAvailableQuestions(
  byAxis: Record<AxisKey, Question[]>,
  answers: AnswerMap,
): Question[] {
  const available: Question[] = [];
  for (const axis of AXIS_ORDER) {
    const qs = byAxis[axis]; // [Q1, Q2, Q3, Q4]

    const a1 = answers[qs[0].id];
    const a2 = answers[qs[1].id];

    // Q1, Q2 は未回答なら常に候補
    if (!a1) available.push(qs[0]);
    if (!a2) available.push(qs[1]);

    // Q1, Q2 を両方回答していて、かつ割れている場合のみ Q3, Q4 が候補になる
    if (a1 && a2 && a1.pole !== a2.pole) {
      if (!answers[qs[2].id]) available.push(qs[2]);
      if (!answers[qs[3].id]) available.push(qs[3]);
    }
  }
  return available;
}

/** スコアから1軸の判定を行う（2-2 のみキメラ） */
function judgeAxis(axis: AxisKey, scores: Scores): AxisResult {
  const [a, b] = AXIS_POLES[axis];
  const diff = scores[a] - scores[b];
  if (diff === 0) {
    return { axis, winner: null, isChimera: true, poles: [a, b] };
  }
  return { axis, winner: diff > 0 ? a : b, isChimera: false, poles: [a, b] };
}

/** 4軸の判定から最終診断結果を構築 */
export function buildDiagnosis(scores: Scores): DiagnosisResult {
  const axes = AXIS_ORDER.map((axis) => judgeAxis(axis, scores));

  // 表示用ラベル： キメラ軸は "(T/F)"、確定軸は単一文字
  const typeLabel = axes
    .map((r) => (r.isChimera ? `(${r.poles[0]}/${r.poles[1]})` : r.winner))
    .join('');

  // 確定タイプ：キメラ軸は便宜的に先頭の極へ寄せて4文字を作る（解説引き当て用）
  const resolvedType = axes.map((r) => r.winner ?? r.poles[0]).join('');

  const hasChimera = axes.some((r) => r.isChimera);

  // ベースは「確定タイプ（同票軸は便宜上 resolve した4文字）」の解説。
  // キメラでも汎用文ではなく、確定した軸の人格像を土台にする。
  const persona = PERSONAS[resolvedType] ?? CHIMERA_PERSONA;
  const personaLight = PERSONAS_LIGHT[resolvedType] ?? CHIMERA_PERSONA_LIGHT;

  // 同票だった軸の分だけ、専用テキストを動的に収集（複数なら複数連結）。
  // 闇（NOIR）と光（LUMEN）の両面を用意しておく。
  const chimeraAxes = axes.filter((r) => r.isChimera);
  const chimeraConflicts: AxisConflict[] = chimeraAxes.map((r) => ({
    axis: r.axis,
    poles: r.poles,
    text: AXIS_CHIMERA_TEXT[r.axis],
  }));
  const chimeraConflictsLight: AxisConflict[] = chimeraAxes.map((r) => ({
    axis: r.axis,
    poles: r.poles,
    text: AXIS_CHIMERA_TEXT_LIGHT[r.axis],
  }));

  return {
    axes,
    typeLabel,
    hasChimera,
    resolvedType,
    persona,
    chimeraConflicts,
    personaLight,
    chimeraConflictsLight,
  };
}

// ── デバッグ用：軸ごとの内部状態 ──────────────────────────────
export type AxisStatus =
  | 'pending'    // まだ Q1・Q2 を回答中
  | 'extending'  // Q1・Q2 が割れて延長戦中
  | 'resolved'   // 確定（2-0 / 3-1 等）
  | 'chimera';   // 2-2 同票

export interface AxisDebug {
  axis: AxisKey;
  poles: [Pole, Pole];
  /** [poles[0]の得票, poles[1]の得票] */
  votes: [number, number];
  /** この軸で回答済みの問題数 */
  answered: number;
  status: AxisStatus;
}

function axisStatus(votes: [number, number], answered: number): AxisStatus {
  if (answered < 2) return 'pending';
  const [v0, v1] = votes;
  if (answered === 2) {
    // 2問時点で同票(2-0)なら確定、割れて(1-1)いれば延長
    return v0 === v1 ? 'extending' : 'resolved';
  }
  // 3問目（延長戦の途中）はまだ Q4 が残るので「延長戦」のまま
  if (answered === 3) return 'extending';
  // 4問完了
  return v0 === v1 ? 'chimera' : 'resolved';
}

function computeAxisDebug(
  byAxis: Record<AxisKey, Question[]>,
  answers: AnswerMap,
): AxisDebug[] {
  return AXIS_ORDER.map((axis) => {
    const [pa, pb] = AXIS_POLES[axis];
    const qs = byAxis[axis];
    let answered = 0;
    let v0 = 0;
    let v1 = 0;
    for (const q of qs) {
      const a = answers[q.id];
      if (!a) continue;
      answered += 1;
      if (a.pole === pa) v0 += 1;
      else if (a.pole === pb) v1 += 1;
    }
    return {
      axis,
      poles: [pa, pb],
      votes: [v0, v1],
      answered,
      status: axisStatus([v0, v1], answered),
    };
  });
}

/**
 * 進捗 0–1。総出題数が動的（8〜16問）なので、
 * 各軸 1/4 の重みで「その軸に必要な問題数のうち何問答えたか」を積算する。
 */
function computeProgress(
  byAxis: Record<AxisKey, Question[]>,
  answers: AnswerMap,
): number {
  let sum = 0;
  for (const axis of AXIS_ORDER) {
    const qs = byAxis[axis];
    const a0 = answers[qs[0].id];
    const a1 = answers[qs[1].id];
    const answered = qs.filter((q) => answers[q.id]).length;
    // この軸に必要な問題数：割れたら4、それ以外は2が基準
    const needed = a0 && a1 && a0.pole !== a1.pole ? 4 : 2;
    sum += Math.min(1, answered / needed);
  }
  return sum / AXIS_ORDER.length;
}

/**
 * デバッグ用：現在の問題の「次に呼ばれるべき問題ID」。
 * Q2 直後は回答により分岐するため確定できず、注記文字列を返す。
 */
function computeNextIdHint(
  byAxis: Record<AxisKey, Question[]>,
  current: Question | null,
): string | null {
  if (!current) return null;
  const qs = byAxis[current.axis];
  const idx = qs.findIndex((q) => q.id === current.id);

  if (idx === 0) return qs[1].id;                 // Q1 → Q2（確定）
  if (idx === 2) return qs[3].id;                 // Q3 → Q4（確定）
  if (idx === 1) {
    return `分岐 (同票→次軸へ / 割れ→延長 ${qs[2].id}+${qs[3].id})`;
  }
  return '(ランダム選出のため予測不可)';
}

export interface UseQuiz {
  /** 画面フェーズ */
  phase: Phase;
  /** 全質問（モック／デバッグ用） */
  questions: Question[];
  /** 現在出題中の質問（無ければ null） */
  currentQuestion: Question | null;
  /** 現在の軸インデックス（0–3、質問フェーズのみ） */
  currentAxisIndex: number;
  /** 進捗 0–1 */
  progress: number;
  /** 各極の現在スコア */
  scores: Scores;
  /** これまでの回答（questionId → 選んだ Choice） */
  answers: AnswerMap;
  /** 回答した順の questionId 履歴（戻る用） */
  answeredOrder: string[];
  /** 確定した診断結果（result フェーズのみ） */
  result: DiagnosisResult | null;
  /** ▼ デバッグ：軸ごとの内部状態 */
  axisDebug: AxisDebug[];
  /** ▼ デバッグ：次に呼ばれるべき問題ID（分岐時は注記） */
  nextQuestionId: string | null;

  /** 診断を開始 */
  start: () => void;
  /** 選択肢を選んで次へ */
  answer: (choice: Choice) => void;
  /** 1問戻る */
  back: () => void;
  /** 最初からやり直す */
  reset: () => void;
}

export function useQuiz({ isDebug = false }: UseQuizProps = {}): UseQuiz {
  const questions = QUESTIONS; // 後で fetch 結果に差し替え可能
  const byAxis = useMemo(() => groupByAxis(questions), [questions]);

  const [phase, setPhase] = useState<Phase>('start');
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [answeredOrder, setAnsweredOrder] = useState<string[]>([]);
  const [questionOrder, setQuestionOrder] = useState<string[]>([]);
  const [flipChoices, setFlipChoices] = useState<Record<string, boolean>>({});

  // 回答からスコアを都度計算（単一の真実の源）
  const scores = useMemo<Scores>(() => {
    const s: Scores = { ...ZERO_SCORES };
    for (const choice of Object.values(answers)) {
      s[choice.pole] += 1;
    }
    return s;
  }, [answers]);

  // 早期打ち切りロジックとランダム化で導く現在の質問
  const currentQuestion = useMemo<Question | null>(() => {
    if (phase !== 'question') return null;
    const available = getAvailableQuestions(byAxis, answers);
    if (available.length === 0) return null;

    let selected: Question;
    if (isDebug) {
      // デバッグモード時は従来の出題順（候補の先頭）
      selected = available[0];
    } else {
      // 通常モード時は questionOrder の中で最も優先度が高い（インデックスが小さい）ものを選ぶ
      selected = available.reduce((best, current) => {
        const bestIdx = questionOrder.indexOf(best.id);
        const currentIdx = questionOrder.indexOf(current.id);
        // questionOrder に無い等の例外回避
        if (bestIdx === -1) return current;
        if (currentIdx === -1) return best;
        return currentIdx < bestIdx ? current : best;
      });
    }

    // 選択肢の反転処理
    if (flipChoices[selected.id]) {
      return {
        ...selected,
        choices: [selected.choices[1], selected.choices[0]] as [Choice, Choice],
      };
    }
    return selected;
  }, [phase, byAxis, answers, isDebug, questionOrder, flipChoices]);

  const currentAxisIndex = currentQuestion
    ? AXIS_ORDER.indexOf(currentQuestion.axis)
    : 0;

  const result = useMemo<DiagnosisResult | null>(() => {
    if (phase !== 'result') return null;
    return buildDiagnosis(scores);
  }, [phase, scores]);

  const progress = useMemo(() => {
    if (phase === 'result') return 1;
    if (phase === 'start') return 0;
    return computeProgress(byAxis, answers);
  }, [phase, byAxis, answers]);

  const axisDebug = useMemo(
    () => computeAxisDebug(byAxis, answers),
    [byAxis, answers],
  );

  const nextQuestionId = useMemo(
    () => (phase === 'question' ? computeNextIdHint(byAxis, currentQuestion) : null),
    [phase, byAxis, currentQuestion],
  );

  const start = useCallback(() => {
    setAnswers({});
    setAnsweredOrder([]);
    
    // 全問題のIDをシャッフル
    const qIds = [...questions].map((q) => q.id);
    setQuestionOrder(shuffleArray(qIds));
    
    // 選択肢の反転フラグを50%で設定
    const flips: Record<string, boolean> = {};
    for (const id of qIds) {
      flips[id] = Math.random() < 0.5;
    }
    setFlipChoices(flips);
    
    setPhase('question');
  }, [questions]);

  const answer = useCallback(
    (choice: Choice) => {
      if (!currentQuestion) return;

      const nextAnswers: AnswerMap = { ...answers, [currentQuestion.id]: choice };
      setAnswers(nextAnswers);
      setAnsweredOrder((prev) => [...prev, currentQuestion.id]);

      // 早期打ち切り込みで、次に出す問題があるか判定
      if (getAvailableQuestions(byAxis, nextAnswers).length === 0) {
        setPhase('result');
      }
    },
    [byAxis, answers, currentQuestion],
  );

  const back = useCallback(() => {
    if (answeredOrder.length === 0) return;
    const last = answeredOrder[answeredOrder.length - 1];
    setAnsweredOrder(answeredOrder.slice(0, -1));
    setAnswers((a) => {
      const copy = { ...a };
      delete copy[last];
      return copy;
    });
    // 結果画面から戻ってきた場合も質問フェーズへ戻す
    setPhase('question');
  }, [answeredOrder]);

  const reset = useCallback(() => {
    setAnswers({});
    setAnsweredOrder([]);
    setPhase('start');
  }, []);

  return {
    phase,
    questions,
    currentQuestion,
    currentAxisIndex,
    progress,
    scores,
    answers,
    answeredOrder,
    result,
    axisDebug,
    nextQuestionId,
    start,
    answer,
    back,
    reset,
  };
}
