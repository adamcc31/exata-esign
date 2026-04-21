import { query } from '@/lib/db';

export async function createAuditLog(params: {
  actorId?: string | null;
  actorType: 'staff' | 'super_admin' | 'client';
  action: string;
  targetId?: string | null;
  metadata?: Record<string, any>;
}) {
  await query(
    `INSERT INTO audit_logs (actor_id, actor_type, action, target_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      params.actorId || null,
      params.actorType,
      params.action,
      params.targetId || null,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ]
  );
}
