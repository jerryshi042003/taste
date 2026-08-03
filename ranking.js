(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TasteRanking = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STATUS = new Set(["saved", "started", "finished", "dropped"]);
  const TONES = new Set(["loved", "liked", "mixed", "disliked"]);
  // Only an explicit, Jerry-selected causal tag may affect a different work.
  // Sentiment and metadata proximity are not evidence of a shared reaction.
  const TAG_RULES = {
    "visually-singular": { feature: "visual_singularity", points: 3, kind: "positive" },
    grounded: { feature: "grounded_struggle", points: 3, kind: "positive" },
    "grounded-human": { feature: "grounded_struggle", points: 3, kind: "positive" },
    mastery: { feature: "grounded_struggle", points: 3, kind: "positive" },
    propulsive: { feature: "propulsion", points: 3, kind: "positive" },
    "too-flat": { feature: "flatness", points: -3, kind: "negative" },
    flat: { feature: "flatness", points: -3, kind: "negative" },
    "too-complex": { feature: "complexity", points: -3, kind: "negative" },
    "too-confusing": { feature: "complexity", points: -3, kind: "negative" },
    "too-violent": { feature: "violence", points: -4, kind: "negative" },
    sadistic: { feature: "violence", points: -5, kind: "negative" },
  };
  const STOP_WORDS = new Set([
    "a", "an", "and", "are", "for", "from", "in", "is", "it", "more",
    "not", "of", "or", "the", "to", "with", "without", "avoid", "break",
  ]);
  const known = (value) => value !== null && value !== undefined && value !== "";
  const tokens = (value) =>
    String(value || "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}-]+/u)
      .filter(Boolean);

  function sentiment(event) {
    const status = event.status || (STATUS.has(event.event_type) ? event.event_type : null);
    if (status && status !== "finished") return null;
    if (known(event.score)) {
      const score = Number(event.score);
      return score >= 5 ? "loved" : score >= 4 ? "liked" : score === 3 ? "mixed" : "disliked";
    }
    if (event.sentiment === "mixed-positive") return "mixed";
    if (TONES.has(event.sentiment)) return event.sentiment;
    return TONES.has(event.event_type) ? event.event_type : null;
  }

  function sortedEvents(events) {
    return [...events]
      .filter((event) => event && typeof event === "object")
      .sort(
        (a, b) =>
          String(a.created_at || "").localeCompare(String(b.created_at || "")) ||
          String(a.client_event_id || "").localeCompare(String(b.client_event_id || "")),
      );
  }

  function activeEvents(events) {
    const ordered = sortedEvents(events);
    const reverted = new Set(
      ordered.filter((event) => event.event_type === "reverted").map((event) => event.reverts_event_id),
    );
    return ordered.filter(
      (event) =>
        (event.event_type === "taste_update" || STATUS.has(event.event_type) || TONES.has(event.event_type)) &&
        !reverted.has(event.client_event_id),
    );
  }

  function projected(events) {
    const map = new Map();
    for (const event of activeEvents(events)) {
      if (!event.work_key) continue;
      const status = event.status || (STATUS.has(event.event_type) ? event.event_type : null);
      const projectedScore = status === "finished" && known(event.score)
        ? Number(event.score)
        : null;
      map.set(event.work_key, {
        status: status || null,
        sentiment: sentiment(event),
        score: projectedScore,
        event,
      });
    }
    return map;
  }

  function currentState(candidate, map) {
    const local = map.get(candidate.work_key);
    return {
      status: local?.status || candidate.status || "unwatched",
      sentiment: local?.sentiment || null,
      score: local ? local.score : candidate.rating ?? null,
      event: local?.event || null,
    };
  }

  function matches(candidate, filters, current) {
    const f = filters || {};
    const features = candidate.features || {};
    if (f.status) {
      const statusMatch =
        f.status === "watched"
          ? ["watched", "finished"].includes(current.status)
          : current.status === f.status;
      if (!statusMatch) return false;
    }
    if (
      f.reaction &&
      current.sentiment !== f.reaction &&
      !(candidate.reaction || []).includes(f.reaction)
    )
      return false;
    if (known(f.maxRuntime)) {
      if (!known(candidate.duration_minutes)) {
        if (!f.includeUnknown) return false;
      } else if (Number(candidate.duration_minutes) > Number(f.maxRuntime)) return false;
    }
    for (const key of [
      "mood", "country", "language", "creator", "genre", "audience", "availability", "era",
      "commitment", "manga_format", "publication_status", "author", "artist", "visual_style", "adaptation", "english_availability",
    ]) {
      if (f[key] && !(features[key] || []).includes(f[key])) return false;
    }
    for (const [key, operator] of [
      ["energy", "min"], ["propulsion", "min"], ["visual_singularity", "min"],
      ["grounded_struggle", "min"], ["legible_depth", "min"], ["violence", "max"],
      ["flatness", "max"], ["complexity", "max"],
    ]) {
      if (!known(f[key])) continue;
      if (!known(features[key])) {
        if (!f.includeUnknown) return false;
      } else if (
        (operator === "min" && features[key] < Number(f[key])) ||
        (operator === "max" && features[key] > Number(f[key]))
      )
        return false;
    }
    if (known(f.minConfidence) && candidate.confidence < Number(f.minConfidence)) return false;
    if (known(f.minEvidence) && candidate.evidence_count < Number(f.minEvidence)) return false;
    return true;
  }

  function affinity(candidate, events, byKey) {
    let value = 0;
    const adjustments = [];
    for (const { event } of projected(events).values()) {
      const reference = byKey.get(event.work_key);
      const status = event.status || (STATUS.has(event.event_type) ? event.event_type : null);
      if (!["finished", "dropped"].includes(status)) continue;
      if (event.work_key === candidate.work_key) continue;
      for (const tag of event.why_tags || []) {
        const rule = TAG_RULES[tag];
        if (!rule) continue;
        if (status === "dropped" && rule.kind !== "negative") continue;
        const level = candidate.features?.[rule.feature];
        if (!known(level)) continue;
        const delta = Number((rule.points * (Number(level) / 5)).toFixed(2));
        value += delta;
        const sourceMedia = event.media_type || reference?.media_type || null;
        adjustments.push({
          source_event_id: event.client_event_id,
          source_work_key: event.work_key,
          source_work_title: event.title || reference?.title || event.work_key,
          source_media_type: sourceMedia,
          tag,
          feature: rule.feature,
          candidate_level: Number(level),
          delta,
          cross_media: Boolean(sourceMedia && sourceMedia !== candidate.media_type),
        });
      }
    }
    return { value, adjustments };
  }

  function candidateHay(candidate) {
    const curation = candidate.curation || {};
    return [
      candidate.title,
      candidate.media_type,
      candidate.why_jerry,
      candidate.why_now,
      candidate.downside,
      curation.editorial,
      ...(curation.keywords || []),
      ...Object.values(candidate.features || {}).flat(),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function parseIntent(intent) {
    const text = String(intent || "").toLowerCase();
    const excluded = new Set();
    for (const match of text.matchAll(/\b(?:break\s+from|avoid|without|no\s+more|not)\s+([\p{L}\p{N}-]+)/gu))
      excluded.add(match[1]);
    const positive = [...new Set(tokens(text).filter((term) => term.length >= 2 && !STOP_WORDS.has(term) && !excluded.has(term)))];
    return { excluded: [...excluded], positive };
  }

  function intentFit(candidate, intent) {
    const model = parseIntent(intent);
    const hay = candidateHay(candidate);
    const rejected = model.excluded.some((term) => hay.includes(term));
    const value = model.positive.reduce((score, term) => score + (hay.includes(term) ? 2.5 : 0), 0);
    return { rejected, value, excluded: model.excluded };
  }

  function ruleMatches(features, rule) {
    const value = features?.[rule.feature];
    if (rule.operator === "contains") return Array.isArray(value) && value.includes(rule.value);
    if (rule.operator === "gte") return known(value) && Number(value) >= Number(rule.value);
    if (rule.operator === "lte") return known(value) && Number(value) <= Number(rule.value);
    return false;
  }

  function contextFit(candidate, context, filters, intent) {
    if (!context || context.status !== "active-provisional") return { value: 0, reasons: [] };
    if ((context.scope_media || []).length && !context.scope_media.includes(candidate.media_type))
      return { value: 0, reasons: [] };
    const parsed = parseIntent(intent);
    let value = 0;
    const reasons = [];
    for (const rule of context.ranking_rules || []) {
      const conditions = rule.all || [rule];
      const explicitlyRequested =
        conditions.some(
          (condition) =>
            filters?.[condition.feature] === condition.value ||
            parsed.positive.includes(String(condition.value).toLowerCase()),
        );
      if (
        explicitlyRequested ||
        !conditions.every((condition) => ruleMatches(candidate.features || {}, condition))
      )
        continue;
      value += Number(rule.points || 0);
      reasons.push(`${rule.reason || context.context_key} ${Number(rule.points || 0) > 0 ? "+" : ""}${Number(rule.points || 0)}`);
    }
    return { value, reasons };
  }

  function rank(candidates, events = [], filters = {}, intent = "", activeContext = null) {
    const byKey = new Map(candidates.map((candidate) => [candidate.work_key, candidate]));
    const map = projected(events);
    const rows = [];
    for (const candidate of candidates) {
      const current = currentState(candidate, map);
      const reviewed =
        ["watched", "finished", "dropped", "rejected"].includes(current.status) ||
        current.sentiment === "disliked";
      if (reviewed && !filters.includeRejected) continue;
      if (!matches(candidate, filters, current)) continue;
      const intentScore = intentFit(candidate, intent);
      if (intentScore.rejected) continue;
      const features = candidate.features || {};
      const feedback = affinity(candidate, events, byKey);
      const context = contextFit(candidate, activeContext, filters, intent);
      const parts = {
        evidence:
          Number(candidate.confidence || 0) * 60 +
          Math.min(18, Number(candidate.evidence_count || 0) * 6),
        thesis:
          (features.visual_singularity || 0) * 1.4 +
          (features.grounded_struggle || 0) * 1.4 +
          (features.legible_depth || 0) * 1.2 -
          (features.flatness || 0) * 0.8 -
          (features.complexity || 0) * 0.35 -
          (features.violence || 0) * 0.25,
        feedback: feedback.value,
        context: context.value,
        continue: current.status === "started" ? 35 : 0,
        saved: current.status === "saved" ? 4 : 0,
        intent: intentScore.value,
      };
      rows.push({
        ...candidate,
        score: Object.values(parts).reduce((sum, number) => sum + number, 0),
        parts,
        adjustments: feedback.adjustments,
        feedback_reasons: feedback.adjustments.map(
          (adjustment) =>
            `${adjustment.tag} ${adjustment.delta > 0 ? "+" : ""}${adjustment.delta.toFixed(1)}`,
        ),
        context_reasons: context.reasons,
        current,
      });
    }
    rows.sort(
      (a, b) => b.score - a.score || String(a.work_key).localeCompare(String(b.work_key)),
    );
    const seen = new Set();
    return rows.filter((row) => !seen.has(row.work_key) && seen.add(row.work_key));
  }

  function undoEvent(events) {
    const target = [...activeEvents(events)].reverse()[0];
    return target
      ? {
          client_event_id: `undo-${target.client_event_id}`,
          event_type: "reverted",
          reverts_event_id: target.client_event_id,
          work_key: target.work_key,
          created_at: new Date().toISOString(),
          origin: "jerry-local-ui",
          is_fixture: false,
        }
      : null;
  }

  return {
    activeEvents,
    projected,
    currentState,
    matches,
    parseIntent,
    intentFit,
    contextFit,
    rank,
    undoEvent,
  };
});
