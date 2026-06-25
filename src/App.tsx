import { useQuiz, buildDiagnosis } from './hooks/useQuiz';
import { StartScreen } from './components/StartScreen';
import { QuestionScreen } from './components/QuestionScreen';
import { ResultScreen } from './components/ResultScreen';
import { DebugPanel } from './components/DebugPanel';
import { PreviewGallery } from './components/PreviewGallery';
import { FrontGallery } from './components/FrontGallery';
import { deserializeScores } from './utils/share';
export default function App() {
  const quiz = useQuiz();

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
                  window.location.href = window.location.pathname;
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

      {quiz.phase === 'result' && quiz.result && (
        <ResultScreen result={quiz.result} scores={quiz.scores} onRetry={quiz.reset} />
      )}

      {/* 隠しデバッグパネル（全フェーズで右下に常駐） */}
      <DebugPanel
        phase={quiz.phase}
        scores={quiz.scores}
        axisDebug={quiz.axisDebug}
        currentQuestionId={quiz.currentQuestion?.id ?? null}
        nextQuestionId={quiz.nextQuestionId}
        answeredCount={quiz.answeredOrder.length}
      />
    </main>
  );
}
