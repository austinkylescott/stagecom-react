import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useState } from 'react'

import {
  updateEventPolicyFn,
  updateTheaterGovernanceFn,
} from './server-functions'

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
      <Card className=" px-6 py-6 gap-0">
        <h2 className="mt-2 text-2xl font-semibold text-foreground">
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
              const result =
                section === 'event-policy'
                  ? await updateEventPolicyFn({
                      data: {
                        counterofferResponseHours:
                          governance.counterofferResponseHours,
                        ...(canManageOwnerSelfApproval
                          ? {
                              ownerSelfApprovalEnabled:
                                governance.ownerSelfApprovalEnabled,
                            }
                          : {}),
                        producerEligibility: governance.producerEligibility,
                        theaterId: governance.theaterId,
                      },
                    })
                  : await updateTheaterGovernanceFn({
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
              <Label className="grid gap-2 text-sm font-medium">
                Producer eligibility
                <NativeSelect
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
                </NativeSelect>
              </Label>
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
                <Label className="flex items-center gap-3 text-sm font-medium md:col-span-2">
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
                </Label>
              ) : null}
            </>
          ) : (
            <>
              <Label className="grid gap-2 text-sm font-medium">
                Primary Venue name
                <Input
                  onChange={(event) =>
                    setGovernance((value) => ({
                      ...value,
                      primaryVenueName: event.target.value,
                    }))
                  }
                  value={governance.primaryVenueName}
                />
              </Label>
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
          <Button
            className="md:col-span-2"
            disabled={
              isSaving ||
              (section === 'venue-calendar' &&
                !governance.primaryVenueName.trim())
            }
            type="submit"
          >
            {isSaving ? 'Saving…' : 'Save settings'}
          </Button>
        </form>
        {message ? (
          <p className="mt-3 text-sm font-semibold">{message}</p>
        ) : null}
      </Card>
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
    <Label className="grid gap-2 text-sm font-medium">
      {label}
      <Input
        min={0}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        type="number"
        value={value}
      />
    </Label>
  )
}
