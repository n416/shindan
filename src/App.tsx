import { useQuiz, buildDiagnosis } from './hooks/useQuiz';
import { StartScreen } from './components/StartScreen';
import { QuestionScreen } from './components/QuestionScreen';
import { ResultScreen } from './components/ResultScreen';
import { RevealScreen } from './components/RevealScreen';
import { DebugPanel } from './components/DebugPanel';
import { PreviewGallery } from './components/PreviewGallery';
import { FrontGallery } from './components/FrontGallery';
import { deserializeScores, serializeScores } from './utils/share';
import { useState } from 'react';

export default function App() {
  const isDebug =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('debug') === 'true'
      : false;

  const quiz = useQuiz({ isDebug });
  const [selectedTone, setSelectedTone] = useState<'lumen' | 'noir' | null>(null);

  // 開発用：?fronts で全タイプの正面デザイン一覧、?preview で走り一覧（クイズをスキップ）
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.has('fronts')) {
      return (
        <main className="relative min-h-dvh">
          <FrontGallery />
        </main>
      );
    }
    if (params.has('preview')) {
      return (
        <main className="relative min-h-dvh">
          <PreviewGallery />
        </main>
      );
    }
    if (params.has('r')) {
      const scoresStr = params.get('r');
      if (scoresStr) {
        const scores = deserializeScores(scoresStr);
        if (scores) {
          const result = buildDiagnosis(scores);
          const toneParam = params.get('t');
          const initialTone = toneParam === 'n' ? 'noir' : 'lumen';
          
          return (
            <main className="relative min-h-dvh">
              <div
                aria-hidden
                className="animate-pulse-slow pointer-events-none fixed left-1/2 top-1/3 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-blood/20 blur-[120px]"
              />
              <ResultScreen
                result={result}
                scores={scores}
                initialTone={initialTone}
                onRetry={() => {
                  window.location.href = window.location.origin + window.location.pathname;
                }}
              />
            </main>
          );
        }
      }
    }
  }

  return (
    <main className="relative min-h-dvh">
      {/* 中央のぼんやりした神秘的グロー */}
      <div
        aria-hidden
        className="animate-pulse-slow pointer-events-none fixed left-1/2 top-1/3 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-blood/20 blur-[120px]"
      />

      {quiz.phase === 'start' && (
        <StartScreen onStart={quiz.start} questionCount={quiz.questions.length} />
      )}

      {quiz.phase === 'question' && quiz.currentQuestion && (
        <QuestionScreen
          question={quiz.currentQuestion}
          axisIndex={quiz.currentAxisIndex}
          axisTotal={4}
          progress={quiz.progress}
          canGoBack={quiz.answeredOrder.length > 0}
          onAnswer={quiz.answer}
          onBack={quiz.back}
        />
      )}

      {quiz.phase === 'reveal' && (
        <RevealScreen
          onSelect={(tone) => {
            setSelectedTone(tone);
            // ここでクリックされた瞬間に保存する（自分自身の診断のみ）
            if (quiz.result && quiz.scores) {
              const rParam = serializeScores(quiz.scores);
              const tParam = tone === 'lumen' ? 'l' : 'n';
              const title = tone === 'lumen' ? quiz.result.personaLight.title : quiz.result.persona.title;
              try {
                localStorage.setItem('persona_last_result', JSON.stringify({
                  typeLabel: quiz.result.typeLabel,
                  title: title,
                  urlParam: `?r=${rParam}&t=${tParam}`
                }));
              } catch (e) {
                console.warn('Failed to save last result', e);
              }
            }
            quiz.goToResult();
          }}
        />
      )}

      {quiz.phase === 'result' && quiz.result && (
        <ResultScreen
          result={quiz.result}
          scores={quiz.scores}
          onRetry={() => {
            window.history.replaceState(null, '', window.location.pathname);
            quiz.reset();
          }}
          initialTone={selectedTone ?? undefined}
        />
      )}

      {/* 隠しデバッグパネル（全フェーズで右下に常駐） */}
      {isDebug && (
        <DebugPanel
          phase={quiz.phase}
          scores={quiz.scores}
          axisDebug={quiz.axisDebug}
          currentQuestionId={quiz.currentQuestion?.id ?? null}
          nextQuestionId={quiz.nextQuestionId}
          answeredCount={quiz.answeredOrder.length}
        />
      )}
    </main>
  );
}
