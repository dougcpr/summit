export const GRADES = ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"];

export function gradeIdx(grade: string): number {
  return GRADES.indexOf(grade);
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export type ClimbDoc = {
  grade: string;
  completed: boolean;
  holdType: string;
  climbedAt: number;
};

export function computePyramid(climbs: ClimbDoc[], goalGrade: string) {
  const goalIdx = gradeIdx(goalGrade);
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

  let weeksRemaining = 52;
  if (climbs.length > 0) {
    const firstClimb = climbs.reduce((a, b) => (a.climbedAt < b.climbedAt ? a : b));
    const elapsed = Date.now() - firstClimb.climbedAt;
    const weeksElapsed = Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000));
    weeksRemaining = Math.max(0, 52 - weeksElapsed);
  }

  return { rows: rows.reverse(), weeksRemaining };
}

export function computeHeatmapData(climbs: ClimbDoc[]) {
  const byDay: Record<string, { weightedSum: number; totalWeight: number }> = {};
  for (const c of climbs) {
    const d = new Date(c.climbedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const num = gradeIdx(c.grade);
    if (num >= 0) {
      if (!byDay[key]) byDay[key] = { weightedSum: 0, totalWeight: 0 };
      const weight = num + 1;
      byDay[key].weightedSum += num * weight;
      byDay[key].totalWeight += weight;
    }
  }

  return Object.entries(byDay).map(([date, { weightedSum, totalWeight }]) => ({
    date,
    count: Math.round(weightedSum / totalWeight) + 1,
  }));
}

export function computeHoldTypeBreakdown(recentClimbs: ClimbDoc[], goalGrade: string) {
  const goalIdx = gradeIdx(goalGrade);
  const suggestedStartGrade = GRADES[Math.max(0, goalIdx - 3)] || "V0";

  const sendsByHoldAndGrade: Record<string, Record<string, number>> = {
    jug: {}, crimp: {}, sloper: {},
  };
  for (const c of recentClimbs) {
    const ht = c.holdType.toLowerCase();
    if (c.completed && ht in sendsByHoldAndGrade) {
      sendsByHoldAndGrade[ht][c.grade] = (sendsByHoldAndGrade[ht][c.grade] || 0) + 1;
    }
  }

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
    if (gradeLevelIdx < 0) {
      gradeLevel = suggestedStartGrade;
      gradeLevelIdx = gradeIdx(suggestedStartGrade);
    }
    return { type, gradeLevel, gradeLevelIdx };
  });

  const weakest = types.reduce((a, b) => (a.gradeLevelIdx < b.gradeLevelIdx ? a : b));
  return { types, weakest: weakest.type };
}

export function computeTimelineMilestones(climbs: ClimbDoc[], goalGrade: string) {
  if (climbs.length === 0) return null;

  const sorted = [...climbs].sort((a, b) => a.climbedAt - b.climbedAt);
  const startDate = sorted[0].climbedAt;
  const endDate = startDate + 52 * 7 * 24 * 60 * 60 * 1000;
  const goalGi = gradeIdx(goalGrade);

  const firstSends: { grade: string; date: number }[] = [];
  const sendCounts: Record<string, number> = {};
  const recorded = new Set<string>();
  for (const c of sorted) {
    if (c.completed && !recorded.has(c.grade)) {
      sendCounts[c.grade] = (sendCounts[c.grade] || 0) + 1;
      if (sendCounts[c.grade] >= 3) {
        recorded.add(c.grade);
        const gi = gradeIdx(c.grade);
        if (gi >= 0 && gi <= goalGi) {
          firstSends.push({ grade: c.grade, date: c.climbedAt });
        }
      }
    }
  }

  const gaps: { start: number; end: number }[] = [];
  const GAP_THRESHOLD = 14 * 24 * 60 * 60 * 1000;
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].climbedAt - sorted[i - 1].climbedAt;
    if (diff >= GAP_THRESHOLD) {
      gaps.push({ start: sorted[i - 1].climbedAt, end: sorted[i].climbedAt });
    }
  }

  // NOTE: `now` is NOT cached — the query layer adds it at read time.
  return { startDate, endDate, firstSends, gaps };
}

export function computeHoldTypeTimelines(climbs: ClimbDoc[], goalGrade: string) {
  if (climbs.length === 0) return null;

  const sorted = [...climbs].sort((a, b) => a.climbedAt - b.climbedAt);
  const startDate = sorted[0].climbedAt;
  const endDate = startDate + 52 * 7 * 24 * 60 * 60 * 1000;
  const goalGi = gradeIdx(goalGrade);

  const holdTypes = ["jug", "crimp", "sloper"] as const;
  const timelines = holdTypes.map((ht) => {
    const milestones: { grade: string; date: number }[] = [];
    const sendCounts: Record<string, number> = {};
    const recorded = new Set<string>();

    for (const c of sorted) {
      if (c.completed && c.holdType.toLowerCase() === ht && !recorded.has(c.grade)) {
        sendCounts[c.grade] = (sendCounts[c.grade] || 0) + 1;
        if (sendCounts[c.grade] >= 3) {
          recorded.add(c.grade);
          const gi = gradeIdx(c.grade);
          if (gi >= 0 && gi <= goalGi) {
            milestones.push({ grade: c.grade, date: c.climbedAt });
          }
        }
      }
    }

    return { holdType: ht, milestones };
  });

  // NOTE: `now` is NOT cached — the query layer adds it at read time.
  return { startDate, endDate, timelines };
}

export function computeCoachNudges(recentClimbs: ClimbDoc[], goalGrade: string) {
  const goalIdx = gradeIdx(goalGrade);
  if (goalIdx < 0) return { nudges: [] };

  const projectIdx = goalIdx - 1;
  const buildMaxIdx = goalIdx - 2;
  const buildMinIdx = Math.max(0, goalIdx - 3);

  // Group by session (distinct climbedAt dates)
  const sessionMap = new Map<number, ClimbDoc[]>();
  for (const c of recentClimbs) {
    const existing = sessionMap.get(c.climbedAt) || [];
    existing.push(c);
    sessionMap.set(c.climbedAt, existing);
  }
  const sessionDates = [...sessionMap.keys()].sort((a, b) => b - a);

  if (sessionDates.length === 0) return { nudges: [] };

  const short3Dates = sessionDates.slice(0, 3);
  const short3Climbs = short3Dates.flatMap((d) => sessionMap.get(d)!);
  const baselineDates = sessionDates.slice(3, 10);
  const baselineClimbs = baselineDates.flatMap((d) => sessionMap.get(d)!);

  function sendRateForRange(climbs: ClimbDoc[], minIdx: number, maxIdx: number) {
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

  function sendRateForGrade(climbs: ClimbDoc[], idx: number) {
    return sendRateForRange(climbs, idx, idx);
  }

  const nudges: { message: string; type: string }[] = [];

  // Rule 1: Fatigue
  const overallRecent = sendRateForRange(short3Climbs, 0, GRADES.length - 1);
  const overallBaseline = sendRateForRange(baselineClimbs, 0, GRADES.length - 1);
  if (overallBaseline.rate >= 0 && overallRecent.rate >= 0 && overallBaseline.rate - overallRecent.rate >= 15) {
    nudges.push({ message: `Send rates dropping across the board — consider a rest day or easy session`, type: "fatigue" });
  }

  // Rule 2: Overreach
  if (nudges.length === 0) {
    for (let i = buildMinIdx; i <= projectIdx; i++) {
      const stats = sendRateForGrade(short3Climbs, i);
      if (stats.total >= 3 && stats.rate < 50) {
        nudges.push({ message: `${GRADES[i]}s at ${stats.rate}% — focus on clean sends there before pushing up`, type: "overreach" });
        break;
      }
    }
  }

  // Rule 3: Regression
  if (nudges.length === 0 && baselineClimbs.length > 0) {
    for (let i = buildMinIdx; i <= projectIdx; i++) {
      const recent = sendRateForGrade(short3Climbs, i);
      const baseline = sendRateForGrade(baselineClimbs, i);
      if (baseline.total >= 3 && baseline.rate >= 70 && recent.total >= 3 && recent.rate < 50) {
        nudges.push({ message: `${GRADES[i]} send rate dropped from ${baseline.rate}% to ${recent.rate}% — something's off, revisit those`, type: "regression" });
        break;
      }
    }
  }

  // Rule 4: Ready to push
  if (nudges.length === 0) {
    let allSolid = true;
    for (let i = buildMinIdx; i <= buildMaxIdx; i++) {
      const stats = sendRateForGrade(short3Climbs, i);
      if (stats.total < 3 || stats.rate < 70) { allSolid = false; break; }
    }
    if (allSolid && buildMinIdx <= buildMaxIdx) {
      nudges.push({ message: `${GRADES[projectIdx]}s looking smooth — try a ${GRADES[goalIdx]} when it feels right`, type: "push" });
    }
  }

  // Rule 5: Solid fallback
  if (nudges.length === 0) {
    const buildGrades = buildMinIdx === buildMaxIdx ? GRADES[buildMinIdx] : `${GRADES[buildMinIdx]}-${GRADES[buildMaxIdx]}`;
    nudges.push({ message: `Base looks solid — keep building volume at ${buildGrades}`, type: "solid" });
  }

  // Secondary: hold type
  const sendsByHoldAndGrade: Record<string, Record<string, number>> = { jug: {}, crimp: {}, sloper: {} };
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
      if (count >= 2 && idx > levelIdx) { levelIdx = idx; level = grade; }
    }
    return { type, level, levelIdx };
  });
  const weakestHold = holdGradeLevels.reduce((a, b) => (a.levelIdx < b.levelIdx ? a : b));
  const suggestGrade = GRADES[buildMinIdx];
  if (weakestHold.level === "—") {
    nudges.push({ message: `No ${weakestHold.type} baseline yet — try ${suggestGrade} ${weakestHold.type}s`, type: "holds" });
  } else {
    const suggestIdx = Math.min(weakestHold.levelIdx + 1, buildMaxIdx);
    nudges.push({ message: `${weakestHold.type}s weakest at ${weakestHold.level} — work ${GRADES[suggestIdx]} ${weakestHold.type}s`, type: "holds" });
  }

  return { nudges: nudges.slice(0, 2) };
}

