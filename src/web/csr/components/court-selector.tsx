type CourtSelectorProps = {
  value: string
  onSelect: (value: string) => void
}

export const CourtSelector = ({ value, onSelect }: CourtSelectorProps) => {
  return (
    <div>
      <p class="mb-2 block text-sm font-medium text-slate-700">コート</p>
      <div class="grid grid-cols-2 gap-2">
        {['1', '2', '3', '4'].map((court) => {
          const isActive = value === court
          return (
            <button
              type="button"
              onClick={() => onSelect(court)}
              aria-pressed={isActive}
              class={`rounded-lg border px-3 py-2 text-sm transition ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              第{court}
            </button>
          )
        })}
      </div>
    </div>
  )
}
