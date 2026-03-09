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

    type PyramidRow = { label: string; sends: number; color: string };
    const rows: PyramidRow[] = [];

    for (let i = 0; i <= goalIdx; i++) {
      rows.push({
        label: GRADES[i],
        sends: sendsByGrade[GRADES[i]] || 0,
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
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // For each hold type, count sends per grade
    const sendsByHoldAndGrade: Record<string, Record<string, number>> = {
      jug: {}, crimp: {}, sloper: {},
    };
    for (const c of climbs) {
      if (c.completed && c.holdType in sendsByHoldAndGrade) {
        const g = c.grade;
        sendsByHoldAndGrade[c.holdType][g] = (sendsByHoldAndGrade[c.holdType][g] || 0) + 1;
      }
    }

    // Highest grade with 3+ sends per hold type
    const types = Object.entries(sendsByHoldAndGrade).map(([type, grades]) => {
      let gradeLevel = "—";
      let gradeLevelIdx = -1;
      for (const [grade, count] of Object.entries(grades)) {
        const idx = gradeIdx(grade);
        if (count >= 3 && idx > gradeLevelIdx) {
          gradeLevelIdx = idx;
          gradeLevel = grade;
        }
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

// --- Coach Nudges ---

function computeRestDays(
  climbs: { grade: string; completed: boolean }[],
  buildMinIdx: number,
  buildMaxIdx: number,
  projectIdx: number,
): number {
  let buildSends = 0;
  let buildTotal = 0;
  let projectAttempts = 0;
  for (const c of climbs) {
    const gi = gradeIdx(c.grade);
    if (gi >= buildMinIdx && gi <= buildMaxIdx) {
      buildTotal++;
      if (c.completed) buildSends++;
    }
    if (gi === projectIdx) projectAttempts++;
  }
  const buildRate = buildTotal > 0 ? buildSends / buildTotal : 1;
  if (buildRate >= 0.7 && projectAttempts >= 6) return 3;
  if (buildRate >= 0.5 || projectAttempts >= 3) return 4;
  return 5;
}

function computeCyclePhase(
  anchorStr: string,
  transitionStr: string,
  restDays: number,
): { type: "rest"; day: number; total: number } | { type: "train"; week: number; totalWeeks: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const anchor = new Date(anchorStr + "T00:00:00");
  const transition = new Date(transitionStr + "T00:00:00");
  const DAY = 24 * 60 * 60 * 1000;

  let cursor = anchor.getTime();
  let phase: "rest" | "train" = "rest";

  for (let i = 0; i < 100; i++) {
    if (phase === "rest") {
      const endMs = cursor + restDays * DAY;
      if (todayMs < endMs) {
        return { type: "rest", day: Math.floor((todayMs - cursor) / DAY) + 1, total: restDays };
      }
      cursor = endMs;
      phase = "train";
    } else {
      const trainWeeks = cursor < transition.getTime() ? 3 : 2;
      const endMs = cursor + trainWeeks * 7 * DAY;
      if (todayMs < endMs) {
        return { type: "train", week: Math.floor((todayMs - cursor) / (7 * DAY)) + 1, totalWeeks: trainWeeks };
      }
      cursor = endMs;
      phase = "rest";
    }
  }

  return { type: "train", week: 1, totalWeeks: 2 };
}

export const coachNudges = query({
  args: {
    goalGrade: v.string(),
    cycleAnchor: v.string(),
    ratioTransitionDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const goalIdx = gradeIdx(args.goalGrade);
    if (goalIdx < 0) return { nudges: [], isRest: false };

    const projectIdx = goalIdx - 1;
    const buildMaxIdx = goalIdx - 2;
    const buildMinIdx = Math.max(0, goalIdx - 3);

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const recentClimbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("climbedAt", thirtyDaysAgo),
      )
      .collect();

    // Compute rest days and cycle phase
    const restDays = computeRestDays(recentClimbs, buildMinIdx, buildMaxIdx, projectIdx);
    const phase = computeCyclePhase(args.cycleAnchor, args.ratioTransitionDate, restDays);

    const nudges: { message: string; type: "balance" | "holds" | "positive" }[] = [];

    // During rest: show rest nudge + supplement suggestion
    if (phase.type === "rest") {
      nudges.push({
        message: `Rest day ${phase.day} of ${phase.total} — recover and come back strong`,
        type: "positive",
      });

      const restActivities = [
        "Try a hangboard session — 3 sets of 10s hangs on your weakest grip",
        "Antagonist training — push-ups, shoulder press, or tricep dips",
        "Stretch and foam roll — focus on forearms and shoulders",
        "Light finger boarding — repeaters at 50% effort",
        "Core work — planks, leg raises, and hollow holds",
      ];
      nudges.push({
        message: restActivities[(phase.day - 1) % restActivities.length],
        type: "holds",
      });

      return { nudges, isRest: true };
    }

    const isRest = false;

    // Training phase: show cycle context + training nudges
    nudges.push({
      message: `Training week ${phase.week} of ${phase.totalWeeks}`,
      type: "positive",
    });

    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const weekStart = getStartOfWeek(new Date());

    // Compute hold type grade levels (highest grade with 3+ sends)
    const sendsByHoldAndGrade: Record<string, Record<string, number>> = {
      jug: {}, crimp: {}, sloper: {},
    };
    for (const c of recentClimbs) {
      if (c.completed && c.holdType in sendsByHoldAndGrade) {
        const g = c.grade;
        sendsByHoldAndGrade[c.holdType][g] = (sendsByHoldAndGrade[c.holdType][g] || 0) + 1;
      }
    }
    const holdGradeLevels = Object.entries(sendsByHoldAndGrade).map(([type, grades]) => {
      let levelIdx = -1;
      let level = "—";
      for (const [grade, count] of Object.entries(grades)) {
        const idx = gradeIdx(grade);
        if (count >= 3 && idx > levelIdx) {
          levelIdx = idx;
          level = grade;
        }
      }
      return { type, level, levelIdx };
    });
    const weakestHold = holdGradeLevels.reduce((a, b) => (a.levelIdx < b.levelIdx ? a : b));

    // Primary nudge: pick the most important training focus
    const projectAttempts14d = recentClimbs.filter(
      (c) => c.climbedAt >= fourteenDaysAgo && gradeIdx(c.grade) === projectIdx,
    ).length;

    const weekClimbs = recentClimbs.filter((c) => c.climbedAt >= weekStart.getTime());
    const warmupCount = weekClimbs.filter((c) => gradeIdx(c.grade) < buildMinIdx).length;

    let buildSends = 0;
    let buildTotal = 0;
    for (const c of recentClimbs) {
      const gi = gradeIdx(c.grade);
      if (gi >= buildMinIdx && gi <= buildMaxIdx) {
        buildTotal++;
        if (c.completed) buildSends++;
      }
    }
    const buildRate = buildTotal > 0 ? Math.round((buildSends / buildTotal) * 100) : 100;

    const buildGrades = buildMinIdx === buildMaxIdx
      ? GRADES[buildMinIdx]
      : `${GRADES[buildMinIdx]}-${GRADES[buildMaxIdx]}`;

    if (projectAttempts14d < 2) {
      nudges.push({
        message: `Get more ${GRADES[projectIdx]} attempts in — only ${projectAttempts14d} in 2 weeks`,
        type: "balance",
      });
    } else if (weekClimbs.length >= 3 && warmupCount / weekClimbs.length > 0.6) {
      nudges.push({
        message: `Heavy on warm-ups — try more ${buildGrades}`,
        type: "balance",
      });
    } else if (buildRate < 50) {
      nudges.push({
        message: `Focus on sending ${buildGrades} — only ${buildRate}% send rate`,
        type: "balance",
      });
    } else {
      nudges.push({
        message: `Solid session — keep pushing ${buildGrades}`,
        type: "positive",
      });
    }

    // Secondary nudge: grade-aware hold type suggestion
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

    return { nudges: nudges.slice(0, 2), isRest };
  },
});
