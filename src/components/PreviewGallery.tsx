import { PERSONAS } from '../data/personas';
import { runnerGroup } from '../data/runners';
import { PixelRunner } from './PixelRunner';

/**
 * 開発用プレビュー：全16タイプの走りランナーを一覧表示する。
 * クイズを解かずに各タイプのスプライト・グループ色を確認するためのページ。
 * `?preview`（任意で `?preview=ENTJ` で単体）でアクセスする。
 */

const GROUPS: { key: string; label: string; types: string[] }[] = [
  { key: 'NT', label: '分析家 NT', types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] },
  { key: 'NF', label: '外交官 NF', types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] },
  { key: 'SJ', label: '番人 SJ', types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] },
  { key: 'SP', label: '探検家 SP', types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] },
];

const GROUP_DOT: Record<string, string> = {
  NT: 'rgb(139, 92, 246)',
  NF: 'rgb(16, 185, 129)',
  SJ: 'rgb(59, 130, 246)',
  SP: 'rgb(250, 204, 21)',
};

function RunnerCard({ type }: { type: string }) {
  const persona = PERSONAS[type];
  return (
    <div className="rounded-2xl border border-white/10 bg-noir-800/40 p-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-display text-lg font-black tracking-wide text-white">{type}</span>
        <span className="text-[10px] tracking-widest text-ash/50">{runnerGroup(type)}</span>
      </div>
      <p className="mb-2 truncate text-[11px] text-ash/70">{persona?.title ?? ''}</p>
      <div className="mb-0.5 text-[10px] tracking-widest text-ash/40">走り</div>
      <PixelRunner type={type} variant="run" bust />
      <div className="mb-0.5 mt-2 text-[10px] tracking-widest text-ash/40">回転</div>
      <PixelRunner type={type} variant="spin" bust />
    </div>
  );
}

export function PreviewGallery() {
  // ?preview=ENTJ のように単体指定された場合はそのタイプだけ大きく表示
  const params = new URLSearchParams(window.location.search);
  const single = (params.get('preview') || '').toUpperCase();
  const only = single && PERSONAS[single] ? single : null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.5em] text-ash/60">Runner Preview</p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-white">
          全タイプ・走り一覧
        </h1>
        <p className="mt-2 text-xs text-ash/50">
          クイズ不要の確認用ページ（<code>?preview</code> / 単体は <code>?preview=ENTJ</code>）
        </p>
      </header>

      {only ? (
        <div className="mx-auto max-w-sm">
          <RunnerCard type={only} />
        </div>
      ) : (
        <div className="space-y-8">
          {GROUPS.map((g) => (
            <section key={g.key}>
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: GROUP_DOT[g.key] }}
                />
                <h2 className="text-sm font-bold tracking-widest text-ash">{g.label}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {g.types.map((t) => (
                  <RunnerCard key={t} type={t} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
