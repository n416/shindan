import { useState } from 'react';
import type { DiagnosisResult, Scores } from '../types';
import { serializeScores } from '../utils/share';
import { PixelRunner } from './PixelRunner';
import {
  PERSONAS,
  PERSONAS_LIGHT,
  CHIMERA_PERSONA,
  CHIMERA_PERSONA_LIGHT,
  CHIMERA_3_PERSONAS,
  CHIMERA_3_PERSONAS_LIGHT,
  CHIMERA_4_PERSONA,
  CHIMERA_4_PERSONA_LIGHT,
} from '../data/personas';

interface Props {
  result: DiagnosisResult;
  scores: Scores;
  initialTone?: Tone;
  onRetry: () => void;
}

type Tone = 'noir' | 'lumen';

/**
 * 結果画面：闇（NOIR＝見栄と恐怖）／光（LUMEN＝強み）をトグルで切替。
 * デフォルトは世界観優先の NOIR。シェア文は表示中の面に追従する。
 */
export function ResultScreen({ result, scores, initialTone, onRetry }: Props) {
  const [tone, setTone] = useState<Tone>(initialTone ?? 'lumen');
  const isLumen = tone === 'lumen';

  // キメラ（同票軸）は両極を展開した全候補タイプ。確定軸は winner のみ。
  // 例: (E/I)STP → ["ESTP", "ISTP"]。確定タイプのみなら長さ1。
  const candidates = result.axes
    .map((a) => (a.isChimera ? a.poles : [a.winner as string]))
    .reduce<string[]>((acc, opts) => acc.flatMap((p) => opts.map((x) => p + x)), ['']);
  const [selectedType, setSelectedType] = useState(result.resolvedType);

  const { typeLabel, hasChimera } = result;
  let persona = isLumen
    ? PERSONAS_LIGHT[selectedType] ?? CHIMERA_PERSONA_LIGHT
    : PERSONAS[selectedType] ?? CHIMERA_PERSONA;
  const conflicts = isLumen ? result.chimeraConflictsLight : result.chimeraConflicts;
  const showGlitch = hasChimera && !isLumen; // 光モードではグリッチを止める

  // ── キメラ時の通り名（称号）の上書き ──
  if (hasChimera) {
    const conflictCount = result.chimeraConflicts.length;
    if (conflictCount === 4) {
      persona = {
        ...persona,
        title: isLumen ? CHIMERA_4_PERSONA_LIGHT.title : CHIMERA_4_PERSONA.title,
      };
    } else if (conflictCount === 3) {
      // 確定している唯一の軸（winnerがnullでないもの）を見つける
      const resolvedAxis = result.axes.find((a) => !a.isChimera);
      if (resolvedAxis && resolvedAxis.winner) {
        const p3 = isLumen
          ? CHIMERA_3_PERSONAS_LIGHT[resolvedAxis.winner]
          : CHIMERA_3_PERSONAS[resolvedAxis.winner];
        if (p3) {
          persona = { ...persona, title: p3.title };
        }
      }
    } else {
      // 1軸・2軸のキメラ：候補から最初と最後のパーツを合成
      const firstType = candidates[0];
      const lastType = candidates[candidates.length - 1];
      const p1 = isLumen ? PERSONAS_LIGHT[firstType] : PERSONAS[firstType];
      const p2 = isLumen ? PERSONAS_LIGHT[lastType] : PERSONAS[lastType];
      
      if (p1?.prefix && p2?.suffix) {
        persona = {
          ...persona,
          title: `${p1.prefix}${p2.suffix}`,
        };
      }
    }
  }

  // ── トーンごとのアクセント ──
  const accent = isLumen
    ? {
        titleGradient: 'from-amber-200 via-amber-300 to-violet-300',
        typeGradient: 'from-white via-amber-100 to-amber-300/60',
        typeGlow: 'drop-shadow-[0_0_30px_rgba(252,211,77,0.3)]',
        divider: 'via-amber-300',
        badge: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
        badgeText: `✦ DUAL NATURE ── ${conflicts.length}軸が二面性`,
        sectionLabel: 'text-amber-300/80',
        sectionText: '── あなたが持つ両刀の才 ──',
        card: 'border-amber-300/30 bg-amber-300/[0.06]',
        cardHead: 'text-amber-200',
        cardSuffix: '軸の強み',
        chip: 'border-amber-300/50 bg-amber-300/10',
        chipText: 'text-amber-200',
      }
    : {
        titleGradient: 'from-blood-soft to-violet-glow',
        typeGradient: 'from-white via-white to-ash/50',
        typeGlow: 'drop-shadow-[0_0_30px_rgba(226,58,93,0.25)]',
        divider: 'via-blood',
        badge: 'border-blood/40 bg-blood/10 text-blood-soft',
        badgeText: `⚠ CHIMERA DETECTED ── ${conflicts.length}軸が同票`,
        sectionLabel: 'text-blood-soft/80',
        sectionText: '── 決着のつかない軸 ──',
        card: 'border-blood/40 bg-blood/[0.06]',
        cardHead: 'text-blood-soft',
        cardSuffix: '軸の葛藤',
        chip: 'border-blood/50 bg-blood/10',
        chipText: 'text-blood-soft',
      };

  // ── シェア文の生成（光・闇の2種類を固定で生成） ──
  const baseShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?r=${serializeScores(scores)}`
    : 'https://example.com';

  const pLight = PERSONAS_LIGHT[result.resolvedType] ?? CHIMERA_PERSONA_LIGHT;
  const pNoir = PERSONAS[result.resolvedType] ?? CHIMERA_PERSONA;

  // キメラ判定等の上書きロジックは ResultScreen.tsx 冒頭で persona に適用されているが、
  // ここではシェア文言用に改めて取得するか、上記で求めた persona のロジックを使う。
  // 実は `persona` は `tone` に依存して決まるため、ここではシェア用に両方の persona を作ります。
  let sharePersonaLight = pLight;
  let sharePersonaNoir = pNoir;
  
  if (hasChimera) {
    const conflictCount = result.chimeraConflicts.length;
    if (conflictCount === 4) {
      sharePersonaLight = { ...sharePersonaLight, title: CHIMERA_4_PERSONA_LIGHT.title };
      sharePersonaNoir = { ...sharePersonaNoir, title: CHIMERA_4_PERSONA.title };
    } else if (conflictCount === 3) {
      const resolvedAxis = result.axes.find((a) => !a.isChimera);
      if (resolvedAxis && resolvedAxis.winner) {
        if (CHIMERA_3_PERSONAS_LIGHT[resolvedAxis.winner]) {
          sharePersonaLight = { ...sharePersonaLight, title: CHIMERA_3_PERSONAS_LIGHT[resolvedAxis.winner].title };
        }
        if (CHIMERA_3_PERSONAS[resolvedAxis.winner]) {
          sharePersonaNoir = { ...sharePersonaNoir, title: CHIMERA_3_PERSONAS[resolvedAxis.winner].title };
        }
      }
    } else {
      const firstType = candidates[0];
      const lastType = candidates[candidates.length - 1];
      const pl1 = PERSONAS_LIGHT[firstType];
      const pl2 = PERSONAS_LIGHT[lastType];
      const pn1 = PERSONAS[firstType];
      const pn2 = PERSONAS[lastType];
      if (pl1?.prefix && pl2?.suffix) sharePersonaLight = { ...sharePersonaLight, title: `${pl1.prefix}${pl2.suffix}` };
      if (pn1?.prefix && pn2?.suffix) sharePersonaNoir = { ...sharePersonaNoir, title: `${pn1.prefix}${pn2.suffix}` };
    }
  }

  const shareTextLight = hasChimera
    ? `私の結果は ${typeLabel} ──「${sharePersonaLight.title}」。${result.chimeraConflictsLight.map(c => `${c.poles[0]}/${c.poles[1]}`).join('・')} 軸の二面性を併せ持つタイプらしい。`
    : `私の結果は「${sharePersonaLight.title}」(${typeLabel})！ ${sharePersonaLight.tagline}`;

  const shareTextNoir = hasChimera
    ? `私の診断結果は ${typeLabel} ──「${sharePersonaNoir.title}」をベースに、${result.chimeraConflicts.map(c => `${c.poles[0]}/${c.poles[1]}`).join('・')} 軸が同票のキメラだった。`
    : `私の診断結果は「${sharePersonaNoir.title}」(${typeLabel}) でした。`;

  const xIntentUrlLight = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${shareTextLight}\n#PERSONA_NOIR で本当の強みを発見された。`
  )}&url=${encodeURIComponent(`${baseShareUrl}&t=l`)}`;

  const xIntentUrlNoir = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${shareTextNoir}\n#PERSONA_NOIR で見栄と恐怖を暴かれてきた。`
  )}&url=${encodeURIComponent(`${baseShareUrl}&t=n`)}`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center px-6 pb-14 pt-14 text-center">
      <p className="animate-fade-up text-[11px] uppercase tracking-[0.5em] text-ash/60">
        Diagnosis Complete
      </p>

      {hasChimera && (
        <p
          className={`animate-fade-up mt-4 inline-block rounded-full border px-3 py-1 text-[11px] tracking-widest ${accent.badge}`}
        >
          {accent.badgeText}
        </p>
      )}

      {/* タイプ大表示 */}
      <div className="animate-fade-up mt-6" style={{ animationDelay: '0.1s' }}>
        {showGlitch ? (
          <h1
            className="glitch font-display text-5xl font-black tracking-tight sm:text-7xl"
            data-text={typeLabel}
          >
            {typeLabel}
          </h1>
        ) : (
          <h1 className="font-display text-6xl font-black tracking-tight sm:text-8xl">
            <span
              className={`bg-gradient-to-b ${accent.typeGradient} bg-clip-text text-transparent ${accent.typeGlow}`}
            >
              {typeLabel}
            </span>
          </h1>
        )}
      </div>

      {/* キャラ表示。キメラ（同票）なら全候補を出して選べるようにする。 */}
      <div className="animate-fade-up mt-7 w-full" style={{ animationDelay: '0.15s' }}>
        {candidates.length === 1 ? (
          <PixelRunner type={selectedType} />
        ) : (
          <div className="mt-2 flex flex-col items-center gap-2">
            <p className="text-[11px] tracking-[0.3em] text-ash/60">
              選択中：<span className="font-bold text-white">{selectedType}</span>
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {candidates.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedType(c)}
                  aria-pressed={c === selectedType}
                  className={`flex-shrink-0 w-24 flex flex-col items-center transition-all duration-300 ${
                    c === selectedType
                      ? 'scale-100 opacity-100'
                      : 'scale-75 opacity-40 hover:scale-90 hover:opacity-80'
                  }`}
                >
                  {/* 小さく並べるために、親要素でscale制御 */}
                  <PixelRunner type={c} />
                  <div
                    className={`mt-2 rounded-xl border px-3 py-1 font-display text-xs font-bold tracking-wide transition-all ${
                      c === selectedType
                        ? 'border-white/50 bg-white/10 text-white'
                        : 'border-white/10 bg-noir-800/50 text-ash/60'
                    }`}
                  >
                    {c}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-ash/40">同票なので、タップして別の顔を選べます</p>
          </div>
        )}
      </div>

      <div
        className={`mx-auto my-8 h-px w-20 bg-gradient-to-r from-transparent to-transparent ${accent.divider}`}
      />

      {/* 通り名 */}
      <h2 className="animate-fade-up text-2xl font-bold sm:text-3xl" style={{ animationDelay: '0.2s' }}>
        <span className={`bg-gradient-to-r ${accent.titleGradient} bg-clip-text text-transparent`}>
          {persona.title}
        </span>
      </h2>
      <p className="animate-fade-up mt-3 text-sm italic text-ash" style={{ animationDelay: '0.25s' }}>
        「{persona.tagline}」
      </p>

      {/* 解説 */}
      <p
        className="animate-fade-up mt-7 max-w-md text-left text-[15px] leading-loose text-white/85"
        style={{ animationDelay: '0.3s' }}
      >
        {persona.description}
      </p>


      {/* 同票（キメラ）軸ごとのテキスト：該当軸の分だけ動的に差し込む */}
      {conflicts.length > 0 && (
        <div
          className="animate-fade-up mt-7 w-full max-w-md space-y-4"
          style={{ animationDelay: '0.32s' }}
        >
          <p className={`text-center text-[11px] tracking-[0.35em] ${accent.sectionLabel}`}>
            {accent.sectionText}
          </p>
          {conflicts.map((c) => (
            <div key={c.axis} className={`rounded-2xl border p-5 text-left ${accent.card}`}>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                {showGlitch ? (
                  <span
                    className="glitch font-display text-lg"
                    data-text={`${c.poles[0]} / ${c.poles[1]}`}
                  >
                    {c.poles[0]} / {c.poles[1]}
                  </span>
                ) : (
                  <span className={`font-display text-lg ${accent.cardHead}`}>
                    {c.poles[0]} / {c.poles[1]}
                  </span>
                )}
                <span className="text-ash/70">{accent.cardSuffix}</span>
              </div>
              <p className="text-[14px] leading-loose text-white/85">{c.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* 4軸ブレイクダウン */}
      <div className="animate-fade-up mt-9 grid w-full max-w-md grid-cols-4 gap-2" style={{ animationDelay: '0.35s' }}>
        {result.axes.map((ax) => (
          <div
            key={ax.axis}
            className={`rounded-xl border p-3 ${
              ax.isChimera ? accent.chip : 'border-white/10 bg-noir-800/50'
            }`}
          >
            <div className="text-lg font-black">
              {ax.isChimera ? (
                <span className={accent.chipText}>{ax.poles[0]}/{ax.poles[1]}</span>
              ) : (
                <span className="text-white">{ax.winner}</span>
              )}
            </div>
            <div className="mt-1 text-[10px] tracking-widest text-ash/50">
              {ax.poles[0]}–{ax.poles[1]}
            </div>
          </div>
        ))}
      </div>

      {/* シェア & リトライ */}
      <div className="mt-11 flex w-full max-w-xs flex-col gap-3">
        {isLumen ? (
          <a
            href={xIntentUrlLight}
            target="_blank"
            rel="noopener noreferrer"
            className="glow-cta glow-cta-lumen flex items-center justify-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-6 py-4 text-sm font-bold tracking-wide text-amber-200 backdrop-blur-sm hover:bg-amber-300/20"
          >
            <span className="text-base">𝕏</span>
            光（強み）をシェアする
          </a>
        ) : (
          <a
            href={xIntentUrlNoir}
            target="_blank"
            rel="noopener noreferrer"
            className="glow-cta glow-cta-noir flex items-center justify-center gap-2 rounded-2xl border border-blood/30 bg-blood/10 px-6 py-4 text-sm font-bold tracking-wide text-blood-soft backdrop-blur-sm hover:bg-blood/20"
          >
            <span className="text-base">𝕏</span>
            闇（見栄）をシェアする
          </a>
        )}
        <button
          onClick={onRetry}
          className="mt-2 rounded-2xl px-6 py-3 text-xs tracking-widest text-ash/60 transition-colors hover:text-ash"
        >
          ↺ もう一度診断する
        </button>

        {/* 視点の切替（シェアボタンの下に配置） */}
        <div className="animate-fade-up mt-6 w-full" style={{ animationDelay: '0.4s' }}>
          <p className="mb-3 text-center text-[11px] tracking-[0.2em] text-ash/50">
            ── この結果には、もう一つの顔がある ──
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTone('lumen')}
              aria-pressed={isLumen}
              className={`rounded-2xl border px-3 py-3 transition-all ${
                isLumen
                  ? 'border-amber-300/50 bg-amber-300/15 text-amber-200'
                  : 'border-white/10 bg-noir-800/50 text-ash/50 hover:text-ash'
              }`}
            >
              <span className="block text-xs font-bold">☀ 光 LUMEN</span>
              <span className="mt-0.5 block text-[9px] tracking-widest opacity-80">
                あなたの強み
              </span>
            </button>
            <button
              onClick={() => setTone('noir')}
              aria-pressed={!isLumen}
              className={`rounded-2xl border px-3 py-3 transition-all ${
                !isLumen
                  ? 'border-blood/50 bg-blood/15 text-blood-soft'
                  : 'border-white/10 bg-noir-800/50 text-ash/50 hover:text-ash'
              }`}
            >
              <span className="block text-xs font-bold">🌑 闇 NOIR</span>
              <span className="mt-0.5 block text-[9px] tracking-widest opacity-80">
                見栄と恐怖
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
