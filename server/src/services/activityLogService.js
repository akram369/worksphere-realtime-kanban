const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../db/prisma');
const { realtimeServer } = require('../websocket/socketServer');

class ActivityLogService {
  /**
   * Log an activity and broadcast to tenant subscribers in real-time
   */
  static async log({ tenantId, boardId, userId, actionType, entityType, entityId, details }) {
    const id = `log-${uuidv4().slice(0, 8)}`;
    const detailsJson = typeof details === 'object' ? JSON.stringify(details) : details;

    try {
      const logRecord = await prisma.activityLog.create({
        data: {
          id,
          tenant_id: tenantId,
          board_id: boardId || null,
          user_id: userId || null,
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId,
          details: detailsJson
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true, email: true }
          }
        }
      });

      let parsedDetails = details;
      try {
        parsedDetails = JSON.parse(logRecord.details);
      } catch (e) {}

      const formattedRecord = {
        ...logRecord,
        user_name: logRecord.user?.name || null,
        user_avatar: logRecord.user?.avatar || null,
        user_email: logRecord.user?.email || null,
        details: parsedDetails
      };

      // Broadcast committed audit entry to tenant
      realtimeServer.broadcastToTenant(tenantId, 'ACTIVITY_LOGGED', formattedRecord);

      return formattedRecord;
    } catch (err) {
      console.error('[ActivityLogService] Error logging activity:', err);
      return null;
    }
  }

  /**
   * Retrieve recent activity logs for a tenant
   */
  static async getTenantLogs(tenantId, limit = 50) {
    try {
      const logs = await prisma.activityLog.findMany({
        where: { tenant_id: tenantId },
        include: {
          user: {
            select: { id: true, name: true, avatar: true, email: true }
          }
        },
        orderBy: { created_at: 'desc' },
        take: parseInt(limit, 10) || 50
      });

      return logs.map(l => {
        let details = l.details;
        try {
          details = JSON.parse(l.details);
        } catch (e) {}
        return {
          ...l,
          user_name: l.user?.name || null,
          user_avatar: l.user?.avatar || null,
          user_email: l.user?.email || null,
          details
        };
      });
    } catch (err) {
      console.error('[ActivityLogService] Error fetching logs:', err);
      return [];
    }
  }
}

module.exports = { ActivityLogService };
