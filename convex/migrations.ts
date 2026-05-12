import { mutation } from "./_generated/server";

export const clearProjects = mutation({
  args: {},
  handler: async (ctx) => {
    const climbsWithProject = await ctx.db.query("climbs").collect();
    let climbsUpdated = 0;
    for (const c of climbsWithProject) {
      if ((c as { projectId?: unknown }).projectId !== undefined) {
        await ctx.db.patch(c._id, { projectId: undefined });
        climbsUpdated++;
      }
    }

    const moves = await ctx.db.query("projectMoves").collect();
    for (const m of moves) await ctx.db.delete(m._id);

    const projects = await ctx.db.query("projects").collect();
    for (const p of projects) {
      try {
        await ctx.storage.delete(p.photoStorageId);
      } catch {
        // photo already gone
      }
      await ctx.db.delete(p._id);
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
