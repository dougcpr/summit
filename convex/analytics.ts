import { query } from "./_generated/server";
import { v } from "convex/values";

const GRADES = ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"];

async function getUserId(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.tokenIdentifier;
}

function gradeIdx(grade: string): number {
  return GRADES.indexOf(grade);
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

// --- Pyramid ---

export const pyramid = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const goalIdx = gradeIdx(args.goalGrade);
    if (goalIdx < 0) return { rows: [], weeksRemaining: 0 };

    const sends = climbs.filter((c) => c.completed);
    const sendsByGrade: Record<string, number> = {};
    for (const s of sends) {
      sendsByGrade[s.grade] = (sendsByGrade[s.grade] || 0) + 1;
    }

    const projectIdx = goalIdx - 1;
    const buildMaxIdx = goalIdx - 2;
    const buildMinIdx = Math.max(0, goalIdx - 4);
    const warmupMaxIdx = Math.max(0, buildMinIdx - 1);

    type PyramidRow = { label: string; sends: number; color: string };
    const rows: PyramidRow[] = [];

    if (goalIdx >= 6) {
      // Combine warm-up
      let warmupSends = 0;
      for (let i = 0; i <= warmupMaxIdx; i++) {
        warmupSends += sendsByGrade[GRADES[i]] || 0;
      }
      rows.push({ label: `V0-${GRADES[warmupMaxIdx]}`, sends: warmupSends, color: "warm-up" });

      // Combine build-base
      let buildSends = 0;
      for (let i = buildMinIdx; i <= buildMaxIdx; i++) {
        buildSends += sendsByGrade[GRADES[i]] || 0;
      }
      rows.push({
        label: `${GRADES[buildMinIdx]}-${GRADES[buildMaxIdx]}`,
        sends: buildSends,
        color: "build-base",
      });

      // Project
      if (projectIdx >= 0) {
        rows.push({
          label: GRADES[projectIdx],
          sends: sendsByGrade[GRADES[projectIdx]] || 0,
          color: "project",
        });
      }

      // Reach (goal grade)
      rows.push({
        label: GRADES[goalIdx],
        sends: sendsByGrade[GRADES[goalIdx]] || 0,
        color: "reach",
      });
    } else {
      // Show individual grades up to goal
      for (let i = 0; i <= goalIdx; i++) {
        rows.push({
          label: GRADES[i],
          sends: sendsByGrade[GRADES[i]] || 0,
          color: GRADES[i],
        });
      }
    }

    // Weeks remaining (52-week cycle, rough estimate from first climb)
    let weeksRemaining = 52;
    if (climbs.length > 0) {
      const firstClimb = climbs.reduce((a, b) => (a.climbedAt < b.climbedAt ? a : b));
      const elapsed = Date.now() - firstClimb.climbedAt;
      const weeksElapsed = Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000));
      weeksRemaining = Math.max(0, 52 - weeksElapsed);
    }

    return { rows: rows.reverse(), weeksRemaining };
  },
});

// --- Heatmap Data ---

export const heatmapData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const byDay: Record<string, { sum: number; count: number }> = {};
    for (const c of climbs) {
      const d = new Date(c.climbedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const num = gradeIdx(c.grade);
      if (num >= 0) {
        if (!byDay[key]) byDay[key] = { sum: 0, count: 0 };
        byDay[key].sum += num;
        byDay[key].count += 1;
      }
    }

    return Object.entries(byDay).map(([date, { sum, count }]) => ({
      date,
      avg: sum / count,
      count,
    }));
  },
});

// --- Hold Type Breakdown (last 30 days) ---

export const holdTypeBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("climbedAt", thirtyDaysAgo))
      .collect();

    const counts: Record<string, number> = { jug: 0, crimp: 0, sloper: 0 };
    for (const c of climbs) {
      if (c.holdType in counts) counts[c.holdType]++;
    }

    const total = climbs.length || 1;
    const types = Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
    }));

    // Least climbed type
    const focus = types.reduce((a, b) => (a.count < b.count ? a : b));

    return { types, focus: focus.type };
  },
});

// --- Weekly Training Zones ---

export const weeklyZones = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const goalIdx = gradeIdx(args.goalGrade);
    if (goalIdx < 0) return { zones: [], todayZone: "" };

    const projectIdx = goalIdx - 1;
    const buildMaxIdx = goalIdx - 2;
    const buildMinIdx = Math.max(0, goalIdx - 4);
    const warmupMaxIdx = Math.max(0, buildMinIdx - 1);

    const weekStart = getStartOfWeek(new Date());

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("climbedAt", weekStart.getTime()),
      )
      .collect();

    function countZone(minIdx: number, maxIdx: number) {
      let sends = 0;
      let attempts = 0;
      for (const c of climbs) {
        const gi = gradeIdx(c.grade);
        if (gi >= minIdx && gi <= maxIdx) {
          if (c.completed) sends++;
          else attempts++;
        }
      }
      return { sends, attempts };
    }

    const warmUp = countZone(0, warmupMaxIdx);
    const buildBase = countZone(buildMinIdx, buildMaxIdx);
    const project = countZone(projectIdx, projectIdx);
    const reach = countZone(goalIdx, GRADES.length - 1);

    const zones = [
      {
        label: "Warm Up",
        grade: `V0-${GRADES[warmupMaxIdx]}`,
        target: 8,
        ...warmUp,
        color: "accent",
      },
      {
        label: "Build Base",
        grade: `${GRADES[buildMinIdx]}-${GRADES[buildMaxIdx]}`,
        target: 6,
        ...buildBase,
        color: "tertiary",
      },
      {
        label: "Project",
        grade: GRADES[projectIdx] || "—",
        target: 3,
        attemptTarget: 8,
        ...project,
        color: "secondary",
      },
      {
        label: "Reach",
        grade: `${GRADES[goalIdx]}+`,
        target: 1,
        attemptTarget: 6,
        ...reach,
        color: "primary",
      },
    ];

    // Today's suggested zone
    const dayOfWeek = new Date().getDay();
    const todayZone =
      dayOfWeek === 1 || dayOfWeek === 4
        ? "Project"
        : dayOfWeek === 3 || dayOfWeek === 6
          ? "Build Base"
          : dayOfWeek === 5
            ? "Reach"
            : "Build Base";

    return { zones, todayZone };
  },
});

// --- Send Rates (last 30 days) ---

export const sendRates = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const goalIdx = gradeIdx(args.goalGrade);
    if (goalIdx < 0) return [];

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const projectIdx = goalIdx - 1;
    const buildMaxIdx = goalIdx - 2;
    const buildMinIdx = Math.max(0, goalIdx - 4);
    const warmupMaxIdx = Math.max(0, buildMinIdx - 1);

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("climbedAt", thirtyDaysAgo),
      )
      .collect();

    function rate(minIdx: number, maxIdx: number) {
      let sends = 0;
      let total = 0;
      for (const c of climbs) {
        const gi = gradeIdx(c.grade);
        if (gi >= minIdx && gi <= maxIdx) {
          total++;
          if (c.completed) sends++;
        }
      }
      return total > 0 ? Math.round((sends / total) * 100) : 0;
    }

    return [
      { zone: "Warm Up", actual: rate(0, warmupMaxIdx), expected: 95 },
      { zone: "Build Base", actual: rate(buildMinIdx, buildMaxIdx), expected: 90 },
      { zone: "Project", actual: rate(projectIdx, projectIdx), expected: 20 },
      { zone: "Reach", actual: rate(goalIdx, GRADES.length - 1), expected: 5 },
    ];
  },
});
