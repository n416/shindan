import { PERSONAS } from '../data/personas';

/**
 * 開発用：全16タイプの「正面参照デザイン」を1ページに並べて確認する。
 * 画像は public/_debug/<type>_ref.png（バッチ生成で順次増える）。
 * `?fronts` でアクセス。まだ生成されていないタイプは画像が欠ける。
 */

const GROUPS: { key: string; label: string; types: string[] }[] = [
  { key: 'NT', label: '分析家 NT', types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] },
  { key: 'NF', label: '外交官 NF', types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] },
  { key: 'SJ', label: '番人 SJ', types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] },
  { key: 'SP', label: '探検家 SP', types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] },
];

// マウント時刻でキャッシュ回避（再生成のたび最新を見るため）
const BUST = Date.now();

function FrontCard({ type }: { type: string }) {
  const persona = PERSONAS[type];
  return (
    <div className="rounded-2xl border border-white/10 bg-noir-800/40 p-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-display text-lg font-black tracking-wide text-white">{type}</span>
      </div>
      <p className="mb-2 truncate text-[11px] text-ash/70">{persona?.title ?? ''}</p>
      <div className="flex aspect-square items-center justify-center rounded-xl bg-black/30">
        <img
          src={`/_debug/${type.toLowerCase()}_ref.png?t=${BUST}`}
          alt={type}
          className="max-h-full max-w-full"
          style={{ imageRendering: 'pixelated' }}
          onError={(e) => {
            (e.currentTarget.style.opacity = '0.15');
          }}
        />
      </div>
    </div>
  );
}

export function FrontGallery() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.5em] text-ash/60">Front Designs</p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-white">
          全タイプ・正面デザイン一覧
        </h1>
        <p className="mt-2 text-xs text-ash/50">
          生成済みのものから表示（<code>Ctrl+F5</code> で最新化）・未生成は薄く表示
        </p>
      </header>

      <div className="space-y-8">
        {GROUPS.map((g) => (
          <section key={g.key}>
            <h2 className="mb-3 text-sm font-bold tracking-widest text-ash">{g.label}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {g.types.map((t) => (
                <FrontCard key={t} type={t} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
