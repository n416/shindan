# PERSONA NOIR ── 見栄と恐怖の性格診断 (Frontend SPA)

ユーザーの「見栄（社会的望ましさバイアス）」と「恐怖（コンプレックス）」を暴く、
ダークで没入感のあるMBTI風性格診断。React + TypeScript + Tailwind CSS v4 製。

## 起動

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # 型チェック + 本番ビルド
```

## 画面構成

| フェーズ | コンポーネント | 内容 |
| --- | --- | --- |
| `start`    | `StartScreen`    | タイトルロゴ・キャッチコピー・発光する CTA |
| `question` | `QuestionScreen` | 軸ベースの進捗バー＋シチュエーション質問＋A/B 2択カード |
| `result`   | `ResultScreen`   | タイプ大表示（同票時グリッチ）・通り名・解説・X シェア・闇/光トグル |
| (常駐)      | `DebugPanel`     | 右下トグル。各軸スコアと次問IDを半透明オーバーレイ表示 |

## 出題アルゴリズム（早期打ち切り）

軸ごとに最大4問。`Q1・Q2`（見栄）→ `Q3・Q4`（恐怖）の順で、各軸を順番に処理する。

1. まず `Q1・Q2` を出題する。
2. `Q1・Q2` が **同票（2-0）** なら、その時点で軸を確定し `Q3・Q4` はスキップ → 次の軸へ。
3. `Q1・Q2` が **割れた（1-1）** 場合のみ、延長戦として `Q3・Q4` を出題する。
4. 4問答えて **2対2** になった軸のみ、キメラ状態とする。

総出題数は迷い方次第で **最短8問〜最大16問** に変動する。出題対象は
「これまでの回答」から `resolveNextQuestion()` で都度導出するため、前進・後退・
採点がすべて整合する（`answers` が単一の真実の源）。

## キメラ（同票）表示

上記4により **2対2の同票** になった軸は `winner` が確定せず、`EN(T/F)J` のように
`(T/F)` 形式で表示し、CSS グリッチ（赤シアンのRGBずれ＋チカチカ明滅、
`src/index.css` の `.glitch`）が走る。割れずに 2-0 で確定した軸はキメラにならない
（＝「Q1・Q2 で葛藤し、さらに Q3・Q4 でも割れた人」だけがキメラになる）。

### 同票時の結果は「どの軸が割れたか」で動的に変わる

汎用のキメラ文ではなく、**同票になった軸ごとの専用葛藤テキスト**を出力する。

- ベースの解説：確定タイプ（同票軸は便宜上 resolve した4文字）の `persona.description`
- そこへ、同票だった軸の数だけ `AXIS_CHIMERA_TEXT[axis]`（`src/data/personas.ts`）を
  動的に連結。例 `(E/I)N(T/F)J` なら E/I と T/F の2つの葛藤テキストが並ぶ。

データは `DiagnosisResult.chimeraConflicts: AxisConflict[]`（`src/types.ts`）として
組み立て、[ResultScreen](src/components/ResultScreen.tsx) が「決着のつかない軸」
ブロックとしてレンダリングする。

## 闇 NOIR / 光 LUMEN トグル

結果画面上部のトグルで、同じ診断結果を2つの面で見られる（デフォルトは世界観優先の
**闇 NOIR**）。シェア文・アクセント色・バッジ文言は表示中の面に追従する。

- **闇 NOIR**：見栄と恐怖を暴くダークな解説（`PERSONAS` / `AXIS_CHIMERA_TEXT`）。
  同票軸はグリッチ表示。
- **光 LUMEN**：同じタイプを「強み」として言い換えたポジティブな解説
  （`PERSONAS_LIGHT` / `AXIS_CHIMERA_TEXT_LIGHT`、`src/data/personas.ts`）。
  ネガティブな内容を共有したくない人向け。同票軸はグリッチを止め「二面性の才」
  として肯定的に提示する。

両面のデータは `buildDiagnosis()` で同時に組み立て、`DiagnosisResult` の
`persona` / `chimeraConflicts`（闇）と `personaLight` / `chimeraConflictsLight`
（光）に格納。トグルの状態（`tone`）に応じて `ResultScreen` が出し分ける。

## シェア機能と結果の復元

結果画面からX（Twitter）へシェアする際、現在の診断スコアをシリアライズしてクエリパラメータ（`?r=...`）に含めたURLを生成します。
また、シェアボタンは「光（強み）」と「闇（見栄）」の2種類が用意されており、どちらの面をシェアするかによって `&t=l` または `&t=n` のパラメータが付与されます。
このURLにアクセスすると、初期状態からクイズをスキップして直接その人の診断結果（および指定されたトーン）を描画します。

## バックエンド (Hono) との接続ポイント

通信・採点ロジックは **`src/hooks/useQuiz.ts`** に隔離済み。現状はモックデータ
（`src/data/questions.ts`）で単体動作する。API 接続時は以下を差し替えるだけ：

- 質問取得：`const questions = QUESTIONS;` → `fetchQuestions()` の結果
- 採点：`buildDiagnosis(scores)` → `submitAnswers(answers)` の POST レスポンス

`src/types.ts` のスキーマ（`Question` / `Choice` / `Scores` / `DiagnosisResult`）を
フロント・バックで共有する想定。

## データ生成について

16問は軸ごと（EI / SN / TF / JP）に別セッションのシナリオライター・プロンプトで
生成し、`src/data/questions.ts` に格納している。フック側は ID 昇順で各軸を
`[Q1, Q2(見栄), Q3, Q4(恐怖)]` に並べ直して出題するため、配列内の並び順は問わない。
各選択肢には採点用の `pole` と、デバッグ用の `reason`（加点理由）を保持。
