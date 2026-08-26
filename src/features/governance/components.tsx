import { useState } from 'react'

import { updateTheaterGovernanceFn } from './server-functions'

import type { ProducerEligibility } from './persistence'

type GovernanceData = {
  governance: {
    counterofferResponseHours: number
    ownerSelfApprovalEnabled: boolean
    primaryVenueId: string
    primaryVenueName: string
    producerEligibility: ProducerEligibility
    setupBufferMinutes: number
    theaterId: string
    turnoverBufferMinutes: number
  }
}

export function TheaterGovernanceSettings({
  canManageOwnerSelfApproval,
  section,
  initialData,
}: {
  canManageOwnerSelfApproval: boolean
  initialData: GovernanceData
  section: 'event-policy' | 'venue-calendar'
}) {
  const [governance, setGovernance] = useState(initialData.governance)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  return (
    <section className="page-wrap pb-12">
      <div className="island-shell rounded-lg px-6 py-6">
        <h2 className="mt-2 text-2xl font-extrabold text-[var(--sea-ink)]">
          {section === 'event-policy'
            ? 'Producer and review policy'
            : 'Primary Venue and scheduling buffers'}
        </h2>
        <form
          className="mt-5 grid gap-4 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault()
            setIsSaving(true)
            setMessage(null)

            try {
              const { ownerSelfApprovalEnabled, ...ordinaryGovernance } =
                governance
              const result = await updateTheaterGovernanceFn({
                data: canManageOwnerSelfApproval
                  ? governance
                  : ordinaryGovernance,
              })

              if (!result.ok) {
                setMessage(result.error.message)
                return
              }

              setGovernance(result.data)
              setMessage('Governance saved.')
            } finally {
              setIsSaving(false)
            }
          }}
        >
          {section === 'event-policy' ? (
            <>
              <label className="grid gap-2 text-sm font-bold">
                Producer eligibility
                <select
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
                  onChange={(event) =>
                    setGovernance((value) => ({
                      ...value,
                      producerEligibility: event.target
                        .value as ProducerEligibility,
                    }))
                  }
                  value={governance.producerEligibility}
                >
                  <option value="all_members">All active Members</option>
                  <option value="designated_proposers">
                    Designated Proposers
                  </option>
                  <option value="admins_only">Owners and Admins only</option>
                </select>
              </label>
              <GovernanceField
                label="Counteroffer response window (hours)"
                onChange={(counterofferResponseHours) =>
                  setGovernance((value) => ({
                    ...value,
                    counterofferResponseHours,
                  }))
                }
                value={governance.counterofferResponseHours}
              />
              {canManageOwnerSelfApproval ? (
                <label className="flex items-center gap-3 text-sm font-bold md:col-span-2">
                  <input
                    checked={governance.ownerSelfApprovalEnabled}
                    onChange={(event) =>
                      setGovernance((value) => ({
                        ...value,
                        ownerSelfApprovalEnabled: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  Allow audited Owner self-approval
                </label>
              ) : null}
            </>
          ) : (
            <>
              <label className="grid gap-2 text-sm font-bold">
                Primary Venue name
                <input
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
                  onChange={(event) =>
                    setGovernance((value) => ({
                      ...value,
                      primaryVenueName: event.target.value,
                    }))
                  }
                  value={governance.primaryVenueName}
                />
              </label>
              <GovernanceField
                label="Setup buffer (minutes)"
                onChange={(setupBufferMinutes) =>
                  setGovernance((value) => ({ ...value, setupBufferMinutes }))
                }
                value={governance.setupBufferMinutes}
              />
              <GovernanceField
                label="Turnover buffer (minutes)"
                onChange={(turnoverBufferMinutes) =>
                  setGovernance((value) => ({
                    ...value,
                    turnoverBufferMinutes,
                  }))
                }
                value={governance.turnoverBufferMinutes}
              />
            </>
          )}
          <button
            className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-50 md:col-span-2"
            disabled={
              isSaving ||
              (section === 'venue-calendar' &&
                !governance.primaryVenueName.trim())
            }
            type="submit"
          >
            {isSaving ? 'Saving…' : 'Save settings'}
          </button>
        </form>
        {message ? (
          <p className="mt-3 text-sm font-semibold">{message}</p>
        ) : null}
      </div>
    </section>
  )
}

function GovernanceField({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: number) => void
  value: number
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <input
        className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
        min={0}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        type="number"
        value={value}
      />
    </label>
  )
}
