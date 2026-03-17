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

    const sendsByGrade: Record<string, number> = {};
    const attemptsByGrade: Record<string, number> = {};
    for (const c of climbs) {
      attemptsByGrade[c.grade] = (attemptsByGrade[c.grade] || 0) + 1;
      if (c.completed) {
        sendsByGrade[c.grade] = (sendsByGrade[c.grade] || 0) + 1;
      }
    }

    type PyramidRow = { label: string; sends: number; attempts: number; target: number; color: string };
    const rows: PyramidRow[] = [];

    for (let i = 0; i <= goalIdx; i++) {
      const stepsBelow = goalIdx - i;
      const target = stepsBelow === 0 ? 1 : Math.pow(2, stepsBelow + 1);
      rows.push({
        label: GRADES[i],
        sends: sendsByGrade[GRADES[i]] || 0,
        attempts: attemptsByGrade[GRADES[i]] || 0,
        target,
        color: GRADES[i],
      });
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
      count: Math.floor(sum / count) + 1, // 1-indexed avg grade: 1=V0, 2=V1, etc.
    }));
  },
});

// --- Hold Type Breakdown (last 30 days) ---

export const holdTypeBreakdown = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const goalIdx = gradeIdx(args.goalGrade);
    const suggestedStartGrade = GRADES[Math.max(0, goalIdx - 3)] || "V0";

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("climbedAt", ninetyDaysAgo))
      .collect();

    // For each hold type, count sends per grade
    const sendsByHoldAndGrade: Record<string, Record<string, number>> = {
      jug: {}, crimp: {}, sloper: {},
    };
    for (const c of climbs) {
      const ht = c.holdType.toLowerCase();
      if (c.completed && ht in sendsByHoldAndGrade) {
        const g = c.grade;
        sendsByHoldAndGrade[ht][g] = (sendsByHoldAndGrade[ht][g] || 0) + 1;
      }
    }

    // Highest grade with 2+ sends per hold type, fallback to highest single send
    const types = Object.entries(sendsByHoldAndGrade).map(([type, grades]) => {
      let gradeLevel = "—";
      let gradeLevelIdx = -1;
      let bestSingleIdx = -1;
      let bestSingleGrade = "—";
      for (const [grade, count] of Object.entries(grades)) {
        const idx = gradeIdx(grade);
        if (count >= 2 && idx > gradeLevelIdx) {
          gradeLevelIdx = idx;
          gradeLevel = grade;
        }
        if (idx > bestSingleIdx) {
          bestSingleIdx = idx;
          bestSingleGrade = grade;
        }
      }
      if (gradeLevelIdx < 0 && bestSingleIdx >= 0) {
        gradeLevel = bestSingleGrade;
        gradeLevelIdx = bestSingleIdx;
      }
      if (gradeLevelIdx < 0) {
        gradeLevel = suggestedStartGrade;
        gradeLevelIdx = gradeIdx(suggestedStartGrade);
      }
      return { type, gradeLevel, gradeLevelIdx };
    });

    // Weakest by grade level
    const weakest = types.reduce((a, b) => (a.gradeLevelIdx < b.gradeLevelIdx ? a : b));

    return { types, weakest: weakest.type };
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
    const buildMinIdx = Math.max(0, goalIdx - 3);
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

// --- Timeline Milestones ---

export const timelineMilestones = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (climbs.length === 0) return null;

    const sorted = [...climbs].sort((a, b) => a.climbedAt - b.climbedAt);
    const startDate = sorted[0].climbedAt;
    const endDate = startDate + 52 * 7 * 24 * 60 * 60 * 1000;

    // Date of 3rd send per grade (consistently reached)
    const firstSends: { grade: string; date: number }[] = [];
    const sendCounts: Record<string, number> = {};
    const recorded = new Set<string>();
    for (const c of sorted) {
      if (c.completed && !recorded.has(c.grade)) {
        sendCounts[c.grade] = (sendCounts[c.grade] || 0) + 1;
        if (sendCounts[c.grade] >= 3) {
          recorded.add(c.grade);
          const gi = gradeIdx(c.grade);
          const goalGi = gradeIdx(args.goalGrade);
          if (gi >= 0 && gi <= goalGi) {
            firstSends.push({ grade: c.grade, date: c.climbedAt });
          }
        }
      }
    }

    // Detect gaps of 14+ days
    const gaps: { start: number; end: number }[] = [];
    const GAP_THRESHOLD = 14 * 24 * 60 * 60 * 1000;
    for (let i = 1; i < sorted.length; i++) {
      const diff = sorted[i].climbedAt - sorted[i - 1].climbedAt;
      if (diff >= GAP_THRESHOLD) {
        gaps.push({ start: sorted[i - 1].climbedAt, end: sorted[i].climbedAt });
      }
    }

    return { startDate, endDate, now: Date.now(), firstSends, gaps };
  },
});

// --- Coach Nudges ---

export const coachNudges = query({
  args: {
    goalGrade: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const goalIdx = gradeIdx(args.goalGrade);
    if (goalIdx < 0) return { nudges: [] };

    const projectIdx = goalIdx - 1;
    const buildMaxIdx = goalIdx - 2;
    const buildMinIdx = Math.max(0, goalIdx - 3);

    // Fetch last 90 days of climbs
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const recentClimbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("climbedAt", ninetyDaysAgo),
      )
      .collect();

    // Group by session (distinct climbedAt dates)
    const sessionMap = new Map<number, typeof recentClimbs>();
    for (const c of recentClimbs) {
      const existing = sessionMap.get(c.climbedAt) || [];
      existing.push(c);
      sessionMap.set(c.climbedAt, existing);
    }
    const sessionDates = [...sessionMap.keys()].sort((a, b) => b - a);

    if (sessionDates.length === 0) return { nudges: [] };

    // Short window: last 3 sessions
    const short3Dates = sessionDates.slice(0, 3);
    const short3Climbs = short3Dates.flatMap((d) => sessionMap.get(d)!);

    // Medium window: sessions 4-10 (baseline, excludes recent 3)
    const baselineDates = sessionDates.slice(3, 10);
    const baselineClimbs = baselineDates.flatMap((d) => sessionMap.get(d)!);

    // Helper: compute send rate for a grade range in a set of climbs
    function sendRateForRange(
      climbs: typeof recentClimbs,
      minIdx: number,
      maxIdx: number,
    ): { sends: number; total: number; rate: number } {
      let sends = 0;
      let total = 0;
      for (const c of climbs) {
        const gi = gradeIdx(c.grade);
        if (gi >= minIdx && gi <= maxIdx) {
          total++;
          if (c.completed) sends++;
        }
      }
      return { sends, total, rate: total > 0 ? Math.round((sends / total) * 100) : -1 };
    }

    // Helper: send rate for a single grade
    function sendRateForGrade(
      climbs: typeof recentClimbs,
      idx: number,
    ): { sends: number; total: number; rate: number } {
      return sendRateForRange(climbs, idx, idx);
    }

    const nudges: { message: string; type: string }[] = [];

    // --- Rule 1: Fatigue detection ---
    // Overall send rate drops 15+ points from baseline to recent 3
    const overallRecent = sendRateForRange(short3Climbs, 0, GRADES.length - 1);
    const overallBaseline = sendRateForRange(baselineClimbs, 0, GRADES.length - 1);
    if (
      overallBaseline.rate >= 0 &&
      overallRecent.rate >= 0 &&
      overallBaseline.rate - overallRecent.rate >= 15
    ) {
      nudges.push({
        message: `Send rates dropping across the board — consider a rest day or easy session`,
        type: "fatigue",
      });
    }

    // --- Rule 2: Grade overreach ---
    // Any build/project grade < 50% over last 3 sessions (min 3 attempts)
    if (nudges.length === 0) {
      for (let i = buildMinIdx; i <= projectIdx; i++) {
        const stats = sendRateForGrade(short3Climbs, i);
        if (stats.total >= 3 && stats.rate < 50) {
          nudges.push({
            message: `${GRADES[i]}s at ${stats.rate}% — focus on clean sends there before pushing up`,
            type: "overreach",
          });
          break;
        }
      }
    }

    // --- Rule 3: Regression alert ---
    // Grade was 70%+ over sessions 4-10, now < 50% in last 3
    if (nudges.length === 0 && baselineClimbs.length > 0) {
      for (let i = buildMinIdx; i <= projectIdx; i++) {
        const recent = sendRateForGrade(short3Climbs, i);
        const baseline = sendRateForGrade(baselineClimbs, i);
        if (
          baseline.total >= 3 &&
          baseline.rate >= 70 &&
          recent.total >= 3 &&
          recent.rate < 50
        ) {
          nudges.push({
            message: `${GRADES[i]} send rate dropped from ${baseline.rate}% to ${recent.rate}% — something's off, revisit those`,
            type: "regression",
          });
          break;
        }
      }
    }

    // --- Rule 4: Ready to push ---
    // All build grades at 70%+ over last 3 sessions (min 3 attempts each)
    if (nudges.length === 0) {
      let allSolid = true;
      for (let i = buildMinIdx; i <= buildMaxIdx; i++) {
        const stats = sendRateForGrade(short3Climbs, i);
        if (stats.total < 3 || stats.rate < 70) {
          allSolid = false;
          break;
        }
      }
      if (allSolid && buildMinIdx <= buildMaxIdx) {
        nudges.push({
          message: `${GRADES[projectIdx]}s looking smooth — try a ${GRADES[goalIdx]} when it feels right`,
          type: "push",
        });
      }
    }

    // --- Rule 5: Solid fallback ---
    if (nudges.length === 0) {
      const buildGrades =
        buildMinIdx === buildMaxIdx
          ? GRADES[buildMinIdx]
          : `${GRADES[buildMinIdx]}-${GRADES[buildMaxIdx]}`;
      nudges.push({
        message: `Base looks solid — keep building volume at ${buildGrades}`,
        type: "solid",
      });
    }

    // --- Secondary nudge: hold type ---
    const sendsByHoldAndGrade: Record<string, Record<string, number>> = {
      jug: {}, crimp: {}, sloper: {},
    };
    for (const c of short3Climbs) {
      const ht = c.holdType.toLowerCase();
      if (c.completed && ht in sendsByHoldAndGrade) {
        sendsByHoldAndGrade[ht][c.grade] = (sendsByHoldAndGrade[ht][c.grade] || 0) + 1;
      }
    }
    const holdGradeLevels = Object.entries(sendsByHoldAndGrade).map(([type, grades]) => {
      let levelIdx = -1;
      let level = "—";
      for (const [grade, count] of Object.entries(grades)) {
        const idx = gradeIdx(grade);
        if (count >= 2 && idx > levelIdx) {
          levelIdx = idx;
          level = grade;
        }
      }
      return { type, level, levelIdx };
    });
    const weakestHold = holdGradeLevels.reduce((a, b) => (a.levelIdx < b.levelIdx ? a : b));

    if (weakestHold.level === "—") {
      nudges.push({
        message: `Get 3+ ${weakestHold.type} sends to establish a baseline`,
        type: "holds",
      });
    } else {
      nudges.push({
        message: `${weakestHold.type}s at ${weakestHold.level} — try a ${weakestHold.level} ${weakestHold.type} send`,
        type: "holds",
      });
    }

    return { nudges: nudges.slice(0, 2) };
  },
});
