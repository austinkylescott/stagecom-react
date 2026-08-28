import { appError } from '@/server/errors'
import { getBearerTokenFromRequest } from '@/server/auth/session'
import { createSupabaseAnonClient, createSupabaseServiceRoleClient } from '@/server/supabase/client'

export type ScheduleBlock = {
  createdAt: string
  createdByName: string
  endsAt: string
  id: string
  history: Array<{ action: string; createdAt: string; version: number }>
  privateLabel: string
  privateNotes: string | null
  startsAt: string
  state: 'active' | 'released' | 'cancelled'
  version: number
}

export type ScheduleBlockPersistence = {
  authorizeManagement(input: { theaterId: string; userId: string }): Promise<boolean>
  findTheaterForBlock(input: { scheduleBlockId: string }): Promise<string>
  change(input: { action: 'updated' | 'released' | 'cancelled'; actorUserId: string; commandId: string; endsAt?: string; expectedVersion: number; privateLabel?: string; privateNotes?: string | null; scheduleBlockId: string; startsAt?: string }): Promise<ScheduleBlock>
  create(input: { actorUserId: string; commandId: string; endsAt: string; privateLabel: string; privateNotes: string | null; startsAt: string; theaterId: string }): Promise<ScheduleBlock>
  list(input: { theaterSlug: string }): Promise<{ canManage: boolean; scheduleBlocks: ScheduleBlock[]; theaterId: string; theaterName: string }>
}
type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code: string; message: string } | null }> }

export function createSupabaseScheduleBlockPersistence(): ScheduleBlockPersistence {
  return {
    async authorizeManagement({ theaterId, userId }) {
      const { data, error } = await authenticatedClient().from('theater_memberships').select('roles').eq('theater_id', theaterId).eq('user_id', userId).eq('status', 'active').maybeSingle()
      if (error) throw appError('external_service_error', 'Theater access could not be checked.')
      return data?.roles.some((role) => role === 'owner' || role === 'admin') ?? false
    },
    async create(input) {
      const { data, error } = await (createSupabaseServiceRoleClient() as unknown as RpcClient).rpc('create_schedule_block', {
        p_actor_user_id: input.actorUserId, p_command_id: input.commandId, p_ends_at: input.endsAt,
        p_private_label: input.privateLabel, p_private_notes: input.privateNotes, p_starts_at: input.startsAt, p_theater_id: input.theaterId,
      })
      if (error) throw scheduleBlockRpcError(error)
      return mapBlock(data)
    },
    async findTheaterForBlock({ scheduleBlockId }) {
      const client = authenticatedClient() as unknown as {
        from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: { theater_id: string } | null; error: { message: string } | null }> } } }
      }
      const { data, error } = await client.from('schedule_blocks').select('theater_id').eq('id', scheduleBlockId).maybeSingle()
      if (error) throw appError('external_service_error', 'Schedule Block access could not be checked.')
      if (!data) throw appError('not_found', 'Schedule Block was not found.')
      return data.theater_id
    },
    async change(input) {
      const { data, error } = await (createSupabaseServiceRoleClient() as unknown as RpcClient).rpc('change_schedule_block', {
        p_action: input.action, p_actor_user_id: input.actorUserId, p_command_id: input.commandId,
        p_ends_at: input.endsAt ?? null, p_expected_version: input.expectedVersion, p_private_label: input.privateLabel ?? null,
        p_private_notes: input.privateNotes ?? null, p_schedule_block_id: input.scheduleBlockId, p_starts_at: input.startsAt ?? null,
      })
      if (error) throw scheduleBlockRpcError(error)
      return mapBlock(data)
    },
    async list({ theaterSlug }) {
      const { data, error } = await (createSupabaseServiceRoleClient() as unknown as RpcClient).rpc('get_schedule_blocks', { p_theater_slug: theaterSlug })
      if (error) throw appError('external_service_error', 'Schedule Blocks could not be loaded.')
      const result = data as { canManage: boolean; scheduleBlocks: ScheduleBlock[]; theaterId: string; theaterName: string } | null
      if (!result) throw appError('not_found', 'Theater was not found.')
      return result
    },
  }
}

function mapBlock(data: unknown): ScheduleBlock {
  const row = data as Record<string, unknown>
  return { createdAt: String(row.created_at), createdByName: '', endsAt: String(row.ends_at), history: [], id: String(row.id), privateLabel: String(row.private_label), privateNotes: row.private_notes as string | null, startsAt: String(row.starts_at), state: row.state as ScheduleBlock['state'], version: Number(row.version) }
}
function scheduleBlockRpcError(error: { code: string; message: string }) {
  if (error.code === 'P0002') return appError('not_found', error.message)
  if (error.code === '42501') return appError('forbidden', error.message)
  if (error.code === '40001' || error.code === '55000' || error.code === '23P01') return appError('conflict', error.message)
  if (error.code === '22023' || error.code === '23514') return appError('validation_error', error.message)
  return appError('external_service_error', 'Schedule Block could not be saved.')
}
function authenticatedClient() {
  const token = getBearerTokenFromRequest()
  if (!token) throw appError('unauthenticated', 'Sign in is required.')
  return createSupabaseAnonClient(token)
}
