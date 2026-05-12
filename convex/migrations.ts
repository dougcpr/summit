import { mutation } from "./_generated/server";

export const clearProjects = mutation({
  args: {},
  handler: async (ctx) => {
    const db = ctx.db as unknown as {
      query: (name: string) => { collect: () => Promise<Array<{ _id: any; projectId?: any; photoStorageId?: any }>> };
      patch: (id: any, value: any) => Promise<void>;
      delete: (id: any) => Promise<void>;
    };

    const climbs = await db.query("climbs").collect();
    let climbsUpdated = 0;
    for (const c of climbs) {
      if (c.projectId !== undefined) {
        await db.patch(c._id, { projectId: undefined });
        climbsUpdated++;
      }
    }

    const moves = await db.query("projectMoves").collect();
    for (const m of moves) await db.delete(m._id);

    const projects = await db.query("projects").collect();
    for (const p of projects) {
      if (p.photoStorageId) {
        try {
          await ctx.storage.delete(p.photoStorageId);
        } catch {
          // photo already gone
        }
      }
      await db.delete(p._id);
    }

    return {
      climbsUpdated,
      movesDeleted: moves.length,
      projectsDeleted: projects.length,
    };
  },
});

export const backfillUnknownHoldTypes = mutation({
  args: {},
  handler: async (ctx) => {
    const climbs = await ctx.db
      .query("climbs")
      .collect();

    const unknowns = climbs.filter((c) => c.holdType === "unknown");
    let jugs = 0, crimps = 0, slopers = 0;

    for (const c of unknowns) {
      const roll = Math.random();
      let holdType: string;
      if (roll < 0.5) {
        holdType = "jug";
        jugs++;
      } else if (roll < 0.9) {
        holdType = "crimp";
        crimps++;
      } else {
        holdType = "sloper";
        slopers++;
      }
      await ctx.db.patch(c._id, { holdType });
    }

    return { updated: unknowns.length, jugs, crimps, slopers };
  },
});
