import { AuditLog } from '../models/AuditLog.js';

/**
 * Service to record administrative activities for security and transparency.
 */
export const logAudit = async ({
  req,
  action,
  entityType,
  entityId,
  description,
  changes = {},
}) => {
  try {
    const user = req.user;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    await AuditLog.create({
      user: user._id,
      userName: user.fullName || 'Unknown',
      userRole: user.role || 'GUEST',
      action,
      entityType,
      entityId: entityId.toString(),
      description,
      changes,
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
    });
  } catch (error) {
    console.error(`[Audit Log Error]: ${error.message}`);
  }
};
