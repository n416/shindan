import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PERSONAS,
  PERSONAS_LIGHT,
  CHIMERA_3_PERSONAS,
  CHIMERA_3_PERSONAS_LIGHT,
  CHIMERA_4_PERSONA,
  CHIMERA_4_PERSONA_LIGHT,
} from '../src/data/personas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');
const RESULT_DIR = path.join(DIST_DIR, 'result');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

// 4軸のパターン
const AXIS_PATTERNS = [
  ['E', 'I', 'X'],
  ['S', 'N', 'X'],
  ['T', 'F', 'X'],
  ['J', 'P', 'X'],
];

// OGP画像のベースURL (GitHub PagesのURL)
// process.env.GITHUB_REPOSITORY があればそれを使うが、ローカルでのテスト用に固定値を入れることも可能
// vite.config.ts で base を /shindan/ 等に設定しているなら、GIFへのパスも /shindan/sprites/... となる
// 今回は GitHub Pages 上での絶対URLを指定する (https://n416.github.io/shindan/sprites/...)
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'n416/shindan';
const REPO_NAME = GITHUB_REPO.split('/')[1];
const BASE_URL = `https://${GITHUB_REPO.split('/')[0]}.github.io/${REPO_NAME}`;

// 再帰的に全パターン(81)を生成
function generatePatterns(): string[] {
  const results: string[] = [];
  function recurse(current: string, axisIndex: number) {
    if (axisIndex === 4) {
      results.push(current);
      return;
    }
    for (const p of AXIS_PATTERNS[axisIndex]) {
      recurse(current + p, axisIndex + 1);
    }
  }
  recurse('', 0);
  return results;
}

// X が含まれるパターン（キメラ）を展開して全候補を返す
// 例: "XSTP" -> ["ESTP", "ISTP"]
function expandChimera(pattern: string): string[] {
  const options = pattern.split('').map((char, index) => {
    if (char !== 'X') return [char];
    return AXIS_PATTERNS[index].slice(0, 2); // 'E'と'I'など
  });

  return options.reduce<string[]>((acc, curr) => {
    return acc.flatMap(a => curr.map(c => a + c));
  }, ['']);
}

// パターンから persona のタイトルと OGP 画像パスを生成する
function getPersonaData(pattern: string, isLumen: boolean) {
  const candidates = expandChimera(pattern);
  const conflictCount = pattern.split('').filter(c => c === 'X').length;
  
  // OGP用のGIFは、常に最初の候補キャラクターのものを使う
  const representType = candidates[0].toLowerCase();
  const gifUrl = `${BASE_URL}/sprites/runner-${representType}.gif`;

  // キメラではない場合
  if (conflictCount === 0) {
    const p = isLumen ? PERSONAS_LIGHT[pattern] : PERSONAS[pattern];
    return { title: p?.title || '', gifUrl, tagline: p?.tagline || '' };
  }

  // 以下キメラの場合のタイトル合成（useQuiz.ts と同様）
  let title = '';
  if (conflictCount === 4) {
    title = isLumen ? CHIMERA_4_PERSONA_LIGHT.title : CHIMERA_4_PERSONA.title;
  } else if (conflictCount === 3) {
    // 唯一確定している軸を探す
    const resolvedIndex = pattern.split('').findIndex(c => c !== 'X');
    const winner = pattern[resolvedIndex];
    if (isLumen && CHIMERA_3_PERSONAS_LIGHT[winner]) {
      title = CHIMERA_3_PERSONAS_LIGHT[winner].title;
    } else if (!isLumen && CHIMERA_3_PERSONAS[winner]) {
      title = CHIMERA_3_PERSONAS[winner].title;
    }
  } else {
    const firstType = candidates[0];
    const lastType = candidates[candidates.length - 1];
    const p1 = isLumen ? PERSONAS_LIGHT[firstType] : PERSONAS[firstType];
    const p2 = isLumen ? PERSONAS_LIGHT[lastType] : PERSONAS[lastType];
    if (p1?.prefix && p2?.suffix) {
      title = `${p1.prefix}${p2.suffix}`;
    }
  }

  const typeLabel = pattern.split('').map((char, idx) => {
    if (char !== 'X') return char;
    const poles = AXIS_PATTERNS[idx];
    return `(${poles[0]}/${poles[1]})`;
  }).join('');

  return { title, gifUrl, typeLabel };
}

async function main() {
  if (!fs.existsSync(INDEX_HTML_PATH)) {
    console.error('dist/index.html not found. Run `vite build` first.');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

  if (!fs.existsSync(RESULT_DIR)) {
    fs.mkdirSync(RESULT_DIR, { recursive: true });
  }

  const patterns = generatePatterns();

  let generatedCount = 0;

  for (const pattern of patterns) {
    for (const tone of ['lumen', 'noir']) {
      const isLumen = tone === 'lumen';
      const data = getPersonaData(pattern, isLumen);
      
      const shareText = data.typeLabel 
        ? `${data.typeLabel} ──「${data.title}」`
        : `「${data.title}」(${pattern})`;

      // HTMLの置換
      let html = baseHtml;
      
      // title, og:title, og:description, og:image の置換
      // 既存の meta タグを正規表現で書き換える
      const siteName = 'PERSONA NOIR ── 見栄と恐怖の性格診断';
      html = html.replace(/<title>.*?<\/title>/, `<title>${data.title} | ${siteName}</title>`);
      html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/i, `<meta property="og:title" content="${data.title} | ${siteName}" />`);
      html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/i, `<meta property="og:description" content="${shareText}" />`);
      html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${data.title} | ${siteName}" />`);
      html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${shareText}" />`);
      
      // 画像が存在すれば置換
      if (data.gifUrl) {
        html = html.replace(/<meta property="og:image" content=".*?"\s*\/?>/i, `<meta property="og:image" content="${data.gifUrl}" />`);
        // Twitter Card Image
        html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/?>/i, `<meta name="twitter:image" content="${data.gifUrl}" />`);
      }

      const fileName = `${pattern}-${tone}.html`;
      fs.writeFileSync(path.join(RESULT_DIR, fileName), html);
      generatedCount++;
    }
  }

  console.log(`Successfully generated ${generatedCount} OGP HTML files in dist/result/`);
}

main().catch(console.error);
