import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getMoneyLeaks } from '../../services/analyticsApi'
import { askYourMoney, generateMonthlyStory } from '../../services/aiApi'
import type { FinancialInsight, MoneyLeakReport } from '../../types/api'

function monthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const toIso = (value: Date) => {
    const offset = value.getTimezoneOffset() * 60000
    return new Date(value.getTime() - offset).toISOString().slice(0, 10)
  }
  return { startDate: toIso(start), endDate: toIso(end) }
}

const prompts = [
  'Where did I spend the most this month?',
  'Why did my spending increase?',
  'How can I save more next month?',
  'Am I on track for my savings goal?',
]

function AIAdvisor() {
  const [{ startDate, endDate }] = useState(monthRange)
  const [moneyLeaks, setMoneyLeaks] = useState<MoneyLeakReport | null>(null)
  const [loadingLeaks, setLoadingLeaks] = useState(true)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loadingAnswer, setLoadingAnswer] = useState(false)
  const [answerError, setAnswerError] = useState<string | null>(null)
  const [story, setStory] = useState<FinancialInsight | null>(null)
  const [loadingStory, setLoadingStory] = useState(false)
  const [storyError, setStoryError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getMoneyLeaks(startDate, endDate)
      .then((report) => { if (!cancelled) { setMoneyLeaks(report); setLoadingLeaks(false) } })
      .catch(() => { if (!cancelled) { setMoneyLeaks(null); setLoadingLeaks(false) } })
    return () => { cancelled = true }
  }, [startDate, endDate])

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return
    setLoadingAnswer(true)
    setAnswerError(null)
    try {
      const response = await askYourMoney({ question: trimmed })
      setAnswer(response.answer)
    } catch (error) {
      setAnswerError(error instanceof Error ? error.message : 'The advisor could not answer right now.')
    } finally {
      setLoadingAnswer(false)
    }
  }

  async function createStory() {
    setLoadingStory(true)
    setStoryError(null)
    try {
      const response = await generateMonthlyStory()
      setStory(response.insight)
    } catch (error) {
      setStoryError(error instanceof Error ? error.message : 'The monthly story could not be generated.')
    } finally {
      setLoadingStory(false)
    }
  }

  const firstLeak = moneyLeaks?.leaks[0]

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2d2926] text-white">✦</div>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight">AI Money Advisor</h2>
        <p className="mx-auto mt-2 max-w-xl text-[#756c62]">Ask questions about your spending, budgets, and goals. Answers are grounded in your financial data.</p>
      </header>

      <section className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setQuestion(prompt)}
              className="rounded-xl border border-[#e1d9ce] bg-[#faf8f4] p-4 text-left text-sm hover:bg-white"
            >
              {prompt}
            </button>
          ))}
        </div>
        <form className="mt-5 flex gap-3" onSubmit={submitQuestion}>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-[#ded7cc] bg-[#faf8f4] px-4 py-3 text-sm outline-none focus:border-[#9a9187]"
            placeholder="Ask anything about your money..."
            maxLength={1000}
          />
          <button type="submit" disabled={loadingAnswer || !question.trim()} className="rounded-xl bg-[#2d2926] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {loadingAnswer ? 'Thinking…' : 'Ask'}
          </button>
        </form>
        {answerError && <p className="mt-3 text-sm text-red-700">{answerError}</p>}
        {answer && (
          <div className="mt-5 rounded-xl bg-[#f1ece5] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#756c62]">Your answer</p>
            <p className="mt-2 leading-7 text-[#302b27]">{answer}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#e3ddd4] bg-[#eee8df] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold">✦ Monthly financial story</p>
            <h3 className="mt-2 text-xl font-semibold">Turn last month into a simple story.</h3>
            <p className="mt-2 max-w-2xl leading-7 text-[#756c62]">Gemini explains the biggest spending movements using figures calculated by the app.</p>
          </div>
          <button type="button" onClick={createStory} disabled={loadingStory} className="shrink-0 rounded-xl bg-[#2d2926] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {loadingStory ? 'Writing…' : 'Create story'}
          </button>
        </div>
        {storyError && <p className="mt-4 text-sm text-red-700">{storyError}</p>}
        {story && (
          <div className="mt-5 rounded-xl bg-white/70 p-5">
            <h4 className="text-lg font-semibold">{story.title}</h4>
            <p className="mt-3 leading-7 text-[#4b443d]">{story.content}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm">
        <p className="text-sm font-semibold">✦ Current pattern</p>
        <h3 className="mt-4 text-xl font-semibold">{loadingLeaks ? 'Reading your recent spending patterns…' : firstLeak ? `${firstLeak.category_name} spending increased.` : 'No meaningful spending leak detected.'}</h3>
        <p className="mt-3 leading-7 text-[#756c62]">{loadingLeaks ? 'Comparing this period with the previous one.' : firstLeak?.explanation ?? 'The app compares your current period with the immediately preceding period and only surfaces meaningful increases.'}</p>
      </section>
    </div>
  )
}

export default AIAdvisor
