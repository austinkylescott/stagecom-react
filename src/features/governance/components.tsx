import { useState } from 'react'

import {
  setTheaterMemberCapabilityFn,
  updateTheaterGovernanceFn,
} from './server-functions'

import type { ProducerEligibility, TheaterCapability } from './persistence'

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
  members: Array<{
    capabilities: TheaterCapability[]
    displayName: string
    roles: string[]
    userId: string
  }>
}

export function TheaterGovernanceSettings({
  initialData,
}: {
  initialData: GovernanceData
}) {
  const [governance, setGovernance] = useState(initialData.governance)
  const [members, setMembers] = useState(initialData.members)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  return (
    <section className="page-wrap pb-12">
      <div className="island-shell rounded-lg px-6 py-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          Event governance
        </p>
        <h2 className="mt-2 text-2xl font-extrabold text-[var(--sea-ink)]">
          Producer and review policy
        </h2>
        <form
          className="mt-5 grid gap-4 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault()
            setIsSaving(true)
            setMessage(null)

            try {
              const result = await updateTheaterGovernanceFn({
                data: governance,
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
              <option value="designated_proposers">Designated Proposers</option>
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
            <span className="font-mono text-xs font-medium text-[var(--sea-ink-soft)]">
              Venue identity: {governance.primaryVenueId}
            </span>
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
              setGovernance((value) => ({ ...value, turnoverBufferMinutes }))
            }
            value={governance.turnoverBufferMinutes}
          />
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
          <button
            className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-50 md:col-span-2"
            disabled={isSaving || !governance.primaryVenueName.trim()}
            type="submit"
          >
            {isSaving ? 'Saving…' : 'Save Event governance'}
          </button>
        </form>
        {message ? (
          <p className="mt-3 text-sm font-semibold">{message}</p>
        ) : null}
      </div>

      <div className="mt-5 island-shell rounded-lg px-6 py-6">
        <h2 className="text-2xl font-extrabold text-[var(--sea-ink)]">
          Member capabilities
        </h2>
        <div className="mt-4 grid gap-3">
          {members.map((member) => (
            <article
              className="rounded-md border border-[var(--line)] px-4 py-4"
              key={member.userId}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold">{member.displayName}</h3>
                  <p className="text-sm text-[var(--sea-ink-soft)]">
                    Theater role: {member.roles.join(', ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {(['proposer', 'reviewer'] as const).map((capability) => {
                    const enabled = member.capabilities.includes(capability)

                    return (
                      <button
                        className="rounded-md border border-[var(--line)] px-3 py-2 text-sm font-bold"
                        key={capability}
                        onClick={async () => {
                          setMessage(null)
                          const result = await setTheaterMemberCapabilityFn({
                            data: {
                              capability,
                              enabled: !enabled,
                              theaterId: governance.theaterId,
                              userId: member.userId,
                            },
                          })

                          if (!result.ok) {
                            setMessage(result.error.message)
                            return
                          }

                          setMembers((current) =>
                            current.map((candidate) =>
                              candidate.userId === member.userId
                                ? {
                                    ...candidate,
                                    capabilities: enabled
                                      ? candidate.capabilities.filter(
                                          (value) => value !== capability,
                                        )
                                      : [...candidate.capabilities, capability],
                                  }
                                : candidate,
                            ),
                          )
                        }}
                        type="button"
                      >
                        {enabled ? 'Remove' : 'Designate'} {capability}
                      </button>
                    )
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>
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
