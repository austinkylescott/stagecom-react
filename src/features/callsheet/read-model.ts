export type CallsheetCommitmentKind =
  | 'admin_invitation'
  | 'ownership_transfer'
  | 'availability_response'
  | 'cast_invitation'
  | 'counteroffer'
  | 'occurrence_call'
  | 'proposal_edits'

export type CallsheetCommitmentInput = {
  action: string
  actionableAt: string | null
  deadline?: string
  event: { slug: string; title: string }
  id: string
  responseId?: string
  kind: CallsheetCommitmentKind
  relationship: string
  targetAnchor: string
  theater: { slug: string; title: string }
}

export type CallsheetCommitment = CallsheetCommitmentInput & {
  urgencyReason?: string
}

export function createCallsheetReadModel({
  commitments,
  now = new Date(),
}: {
  commitments: CallsheetCommitmentInput[]
  now?: Date
}) {
  return {
    commitments: commitments
      .map((commitment) => ({
        ...commitment,
        ...(getUrgencyReason(commitment, now)
          ? { urgencyReason: getUrgencyReason(commitment, now) }
          : {}),
      }))
      .sort((left, right) => compareCommitments(left, right, now)),
  }
}

function compareCommitments(
  left: CallsheetCommitment,
  right: CallsheetCommitment,
  now: Date,
) {
  const priorityDifference =
    commitmentPriority(left, now) - commitmentPriority(right, now)
  if (priorityDifference !== 0) return priorityDifference

  const dateDifference = commitmentTime(left) - commitmentTime(right)
  if (dateDifference !== 0) return dateDifference

  return left.id.localeCompare(right.id)
}

function commitmentTime(commitment: CallsheetCommitmentInput) {
  return commitment.actionableAt
    ? Date.parse(commitment.actionableAt)
    : Number.POSITIVE_INFINITY
}

function commitmentPriority(commitment: CallsheetCommitmentInput, now: Date) {
  const deadline = commitment.deadline ? Date.parse(commitment.deadline) : null
  if (deadline !== null && deadline <= now.getTime()) return 0
  if (deadline !== null && deadline <= now.getTime() + 24 * 60 * 60 * 1_000) {
    return 1
  }

  return {
    admin_invitation: 2,
    ownership_transfer: 2,
    cast_invitation: 2,
    counteroffer: 2,
    proposal_edits: 3,
    availability_response: 4,
    occurrence_call: 5,
  }[commitment.kind]
}

function getUrgencyReason(commitment: CallsheetCommitmentInput, now: Date) {
  if (!commitment.deadline) return undefined

  const deadline = Date.parse(commitment.deadline)
  if (deadline <= now.getTime()) return 'Response overdue'
  if (deadline <= now.getTime() + 24 * 60 * 60 * 1_000) {
    return 'Response due within 24 hours'
  }

  return undefined
}
