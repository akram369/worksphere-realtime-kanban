const { prisma } = require('../db/prisma');

class FractionalIndexService {
  /**
   * Calculate fractional position between prevPos and nextPos
   * Standard spacing starts at 1000.0, 2000.0, 3000.0...
   */
  static calculatePosition(prevPos, nextPos) {
    const prev = prevPos !== undefined && prevPos !== null ? parseFloat(prevPos) : null;
    const next = nextPos !== undefined && nextPos !== null ? parseFloat(nextPos) : null;

    if (prev === null && next === null) {
      return 1000.0;
    }

    if (prev === null) {
      // Inserting at top
      if (next <= 1.0) {
        return next / 2.0;
      }
      return next - 1000.0 > 0 ? next - 1000.0 : next / 2.0;
    }

    if (next === null) {
      // Inserting at bottom
      return prev + 1000.0;
    }

    // Inserting between two positions
    const mid = (prev + next) / 2.0;
    return mid;
  }

  /**
   * Check if precision between two items is dangerously narrow (delta < 0.0001)
   */
  static needsRebalance(prevPos, nextPos) {
    if (prevPos === null || nextPos === null) return false;
    return Math.abs(nextPos - prevPos) < 0.0001;
  }

  /**
   * Rebalance all tasks in a column with clean 1000-interval positions
   */
  static async rebalanceColumn(columnId) {
    return prisma.$transaction(async (tx) => {
      const tasks = await tx.task.findMany({
        where: { column_id: columnId },
        orderBy: { position: 'asc' },
        select: { id: true }
      });

      let currentPos = 1000.0;
      for (const t of tasks) {
        await tx.task.update({
          where: { id: t.id },
          data: { position: currentPos }
        });
        currentPos += 1000.0;
      }
      return tasks.length;
    });
  }
}

module.exports = { FractionalIndexService };
