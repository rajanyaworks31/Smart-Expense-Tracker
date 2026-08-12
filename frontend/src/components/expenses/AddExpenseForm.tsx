import { useState } from 'react'
import type { FormEvent } from 'react'

export type ExpenseFormData = {
  amount: number
  description: string
  category: string
  date: string
}

type AddExpenseFormProps = {
  onAdd: (expense: ExpenseFormData) => void
  onCancel: () => void
  initialData?: ExpenseFormData
  title?: string
  submitLabel?: string
}

const categories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other']

function AddExpenseForm({
  onAdd,
  onCancel,
  initialData,
  title = 'Add expense',
  submitLabel = 'Add expense',
}: AddExpenseFormProps) {
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [category, setCategory] = useState(initialData?.category ?? 'Food')
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const numericAmount = Number(amount)

    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter an amount greater than ₹0.')
      return
    }

    if (!description.trim()) {
      setError('Please add a short description.')
      return
    }

    onAdd({
      amount: numericAmount,
      description: description.trim(),
      category,
      date,
    })
  }

  return (
    <div className="overflow-hidden rounded-[26px] border border-[#e5ded4] bg-[#fffdfa] shadow-[0_14px_45px_rgba(77,65,52,0.07)] sm:p-0">
      <div className="flex items-start justify-between gap-4 bg-[#f5eee4] px-5 py-5 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a9187]">New transaction</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2 py-1 text-sm text-[#9a9187] transition hover:bg-[#f7f4ef] hover:text-[#2d2926]"
          aria-label="Close add expense form"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
        <div>
          <label htmlFor="expense-amount" className="mb-1.5 block text-sm font-medium">Amount</label>
          <div className="flex items-center rounded-xl border border-[#ded7cc] bg-[#faf8f4] px-3 focus-within:border-[#9a9187]">
            <span className="text-[#756c62]">₹</span>
            <input
              id="expense-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value)
                setError('')
              }}
              placeholder="0.00"
              className="w-full bg-transparent px-2 py-3 text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="expense-description" className="mb-1.5 block text-sm font-medium">Description</label>
          <input
            id="expense-description"
            type="text"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value)
              setError('')
            }}
            placeholder="e.g. Dinner at a restaurant"
            className="w-full rounded-xl border border-[#ded7cc] bg-[#faf8f4] px-4 py-3 text-sm outline-none transition focus:border-[#9a9187]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="expense-category" className="mb-1.5 block text-sm font-medium">Category</label>
            <select
              id="expense-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-xl border border-[#ded7cc] bg-[#faf8f4] px-4 py-3 text-sm outline-none focus:border-[#9a9187]"
            >
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="expense-date" className="mb-1.5 block text-sm font-medium">Date</label>
            <input
              id="expense-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-xl border border-[#ded7cc] bg-[#faf8f4] px-4 py-3 text-sm outline-none focus:border-[#9a9187]"
            />
          </div>
        </div>

        {error && <p className="rounded-xl bg-[#fdf1ed] px-3 py-2 text-sm text-[#9a5d4f]">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-[#eee9e2] pt-4">
          <button type="button" onClick={onCancel} className="rounded-xl border border-[#ded7cc] px-4 py-2.5 text-sm font-semibold text-[#756c62] transition hover:bg-[#faf8f4]">
            Cancel
          </button>
          <button type="submit" className="rounded-xl bg-[#2f2b27] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddExpenseForm
