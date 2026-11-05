import { redis } from '../config/redis.js';
import crypto from 'crypto';

/**
 * Service to dispatch timetable optimization tasks to the Python Solver via Redis.
 */
export const dispatchSolverTask = async ({ timetableId, department, semester, academicYear }) => {
  const taskId = crypto.randomUUID();
  const queueName = process.env.SOLVER_QUEUE_NAME || 'timetable_solver_tasks';

  const payload = {
    taskId,
    timetableId,
    department,
    semester,
    academicYear,
    createdAt: new Date().toISOString(),
  };

  try {
    // Push the payload to Redis list for the Celery/Python worker to consume
    await redis.lpush(queueName, JSON.stringify(payload));
    console.log(`[QueueService] Task ${taskId} dispatched to queue "${queueName}"`);
    return { success: true, taskId };
  } catch (error) {
    console.error(`[QueueService] Error dispatching task: ${error.message}`);
    throw error;
  }
};
