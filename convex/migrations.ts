import { mutation } from "./_generated/server";

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
