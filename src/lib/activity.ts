import prisma from './prisma';
import { Prisma } from '@prisma/client';

export function logActivity(data: {
  userId?: string | null;
  userName?: string | null;
  action: string;
  module?: string | null;
  entityId?: string | null;
  details?: string | null;
  aiInvolved?: boolean;
}) {
  return prisma.activityLog.create({
    data: data as Prisma.ActivityLogUncheckedCreateInput,
  }).catch(e => console.warn('[ActivityLog]', e.message));
}
