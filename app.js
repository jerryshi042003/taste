(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const state = { taste: null, catalog: [], connections: null, deepcuts: null, music: [], musicIndex: 0, worlds: [], worldIndex: 0, musicMode: "worlds", medium: "all", kafkaFilter: "all", nextFilter: "all" };
  const progressKey = "jerry-taste-home-v1";
  const musicKey = "jerry-taste-music-v1";
  const worldKey = "jerry-taste-music-worlds-v1";

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function progress() {
    try { return JSON.parse(localStorage.getItem(progressKey) || "{}"); } catch (_) { return {}; }
  }
  function saveProgress(next) {
    try { localStorage.setItem(progressKey, JSON.stringify(next)); } catch (_) {}
  }
  function musicRatings() {
    try { return JSON.parse(localStorage.getItem(musicKey) || "{}"); } catch (_) { return {}; }
  }
  function saveMusicRatings(next) {
    try { localStorage.setItem(musicKey, JSON.stringify(next)); } catch (_) {}
  }
  function worldRatings() {
    try { return JSON.parse(localStorage.getItem(worldKey) || "{}"); } catch (_) { return {}; }
  }
  function saveWorldRatings(next) {
    try { localStorage.setItem(worldKey, JSON.stringify(next)); } catch (_) {}
  }
  function linkHtml(link, className = "") {
    if (!link?.url) return "";
    const target = link.external ? ' target="_blank" rel="noopener"' : "";
    return `<a class="${className}" href="${escapeHtml(link.url)}"${target}>${escapeHtml(link.label)}</a>`;
  }
  function editorialCard(item) {
    const label = escapeHtml(item.media_type || item.medium || item.kind || "work").toUpperCase();
    const title = escapeHtml(item.title || "Untitled");
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#24333b"/><stop offset="1" stop-color="#8a4b3b"/></linearGradient></defs><rect width="300" height="420" rx="22" fill="url(#g)"/><text x="24" y="45" fill="#fff" opacity=".7" font-family="sans-serif" font-size="14" letter-spacing="2">${label}</text><foreignObject x="24" y="105" width="252" height="220"><div xmlns="http://www.w3.org/1999/xhtml" style="color:white;font:700 28px/1.12 Georgia,serif;overflow-wrap:anywhere">${title}</div></foreignObject><text x="24" y="390" fill="#fff" opacity=".58" font-family="sans-serif" font-size="11" letter-spacing="1.5">EDITORIAL CARD</text></svg>`)}`;
  }
  function imageHtml(item, className = "") {
    const verified = item.image || "";
    const fallback = editorialCard(item);
    return `<img class="${className}" src="${escapeHtml(verified || fallback)}" data-fallback="${escapeHtml(fallback)}" alt="${escapeHtml(item.title)} ${verified ? "artwork" : "editorial title card"}" loading="lazy">`;
  }
  function allDeepcuts() {
    return (state.deepcuts?.people || []).flatMap(group => group.items.map(item => ({ ...item, person: group.name })));
  }
  function consumeLane(item) {
    return ["film", "documentary"].includes(item.medium) ? "watch" : "read";
  }
  function orderedDeepcuts() {
    const featured = new Set(state.deepcuts?.featuredIds || []);
    const items = allDeepcuts();
    return [...items.filter(item => featured.has(item.id)), ...items.filter(item => !featured.has(item.id))];
  }
  function humanize(value = "") {
    return String(value).replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
  function sourceLink(label, url) {
    if (!url) return "";
    return linkHtml({ label, url, external: /^https?:\/\//.test(url) }, "source-link");
  }
  function insightHtml(insight) {
    return `<article class="insight-note"><p class="insight-label">${escapeHtml(insight.label)}</p>
      <p>${escapeHtml(insight.text)}</p>${sourceLink(insight.sourceLabel, insight.sourceUrl)}</article>`;
  }
  function nextTrailHtml(trail) {
    if (!trail?.url) return "";
    return `<article class="next-trail"><p class="insight-label">OPEN NEXT</p><h4>${escapeHtml(trail.title)}</h4>
      <p>${escapeHtml(trail.reason)}</p>${sourceLink(trail.linkLabel || `Open ${trail.title}`, trail.url)}</article>`;
  }
  function workDossierHtml(item) {
    const dossier = item.dossier || {};
    const sections = [
      ["AT THE TIME", dossier.atTheTime],
      ["HOW IT WAS BUILT", dossier.howItWasBuilt],
      ["WHAT TO NOTICE", dossier.whatToNotice],
    ];
    return `<div class="work-dossier">
      <article class="dossier-lead"><p class="insight-label">WHY JERRY KEPT IT</p>
        <p>${escapeHtml(dossier.thesis || item.insight)}</p></article>
      <div class="dossier-grid">${sections.map(([label, text]) => `<article class="dossier-section">
        <p class="insight-label">${label}</p><p>${escapeHtml(text)}</p></article>`).join("")}</div>
      <article class="dossier-next"><p class="insight-label">FOLLOW THIS THREAD</p>
        <h4>${escapeHtml(dossier.next?.title)}</h4><p>${escapeHtml(dossier.next?.reason)}</p>
        ${sourceLink(dossier.next?.actionLabel || "Open the working source", dossier.next?.url)}</article>
      <footer class="dossier-evidence"><p class="insight-label">EVIDENCE USED · LINKS ARE CITATIONS, NOT THE EXPERIENCE</p>
        <div class="evidence-grid">${(dossier.sources || []).map(source => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">
          <strong>${escapeHtml(source.label)}</strong><span>${escapeHtml(source.note)}</span></a>`).join("")}</div>
      </footer></div>`;
  }
  function cardHtml(item) {
    return `<article class="work-card">
      ${imageHtml(item)}
      <div><p class="work-kind">${escapeHtml(item.medium)} · ${escapeHtml(item.relation)}</p><h3>${escapeHtml(item.title)}</h3>
      <p class="creator">${escapeHtml(item.creator)}</p>
      <p class="reason-label">WHY THIS IS WORTH YOUR TIME</p>
      <p class="reason">${escapeHtml(item.whyNow)}</p>
      <p class="signal">From ${escapeHtml(item.person)} · ${escapeHtml(item.confidence)} · ${escapeHtml(item.status)}</p>
      <div class="card-actions">${(item.links || []).map(x => linkHtml(x)).join("")}</div></div>
    </article>`;
  }
  function renderHome() {
    const done = Boolean(progress().kafkaFinished);
    const item = state.taste.continue;
    $("#continue-card").innerHTML = `<div class="continue-art"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)} artwork"></div>
      <div class="continue-copy"><p class="eyebrow">${done ? "FINISHED" : "CONTINUE NOW"}</p>
      <h2>${escapeHtml(done ? item.finishedTitle : item.title)}</h2>
      <p>${escapeHtml(done ? item.finishedReason : item.reason)}</p>
      ${done ? "" : '<div class="progress-line" aria-label="Almost finished"><span></span></div><small>Almost finished · exact position stays in Wisdom</small>'}
      <div class="continue-actions">${linkHtml(item.primary, "primary-link")}${linkHtml(item.secondary)}
      <button id="kafka-finished" type="button">${done ? "Undo finished" : "I finished it"}</button></div></div>`;
    $("#kafka-finished").onclick = () => {
      const next = progress(); next.kafkaFinished = !done; saveProgress(next); renderHome();
      $("#status").textContent = next.kafkaFinished ? "Kafka on the Shore marked finished." : "Kafka on the Shore returned to Continue.";
    };
    const index = new Map(allDeepcuts().map(item => [item.id, item]));
    $("#next-grid").innerHTML = state.deepcuts.featuredIds.map(id => cardHtml(index.get(id))).join("");
  }
  function renderDeepcuts() {
    const all = orderedDeepcuts();
    const watchCount = all.filter(item => consumeLane(item) === "watch").length;
    const readCount = all.length - watchCount;
    const visible = all.filter(item => state.nextFilter === "all" || consumeLane(item) === state.nextFilter);
    const filters = [
      ["all", `All ${all.length}`],
      ["watch", `Watch ${watchCount}`],
      ["read", `Read ${readCount}`],
    ];
    $("#next-filters").innerHTML = filters.map(([value, label]) =>
      `<button type="button" data-next="${value}" aria-pressed="${value === state.nextFilter}">${label}</button>`
    ).join("");
    $("#next-count").textContent = `${visible.length} ${visible.length === 1 ? "option" : "options"} shown · strongest starting points first, then grouped by your people`;
    $("#deepcut-groups").innerHTML = `<div class="consume-grid">${visible.map(cardHtml).join("")}</div>`;
    $$("#next-filters button").forEach(button => button.onclick = () => {
      state.nextFilter = button.dataset.next;
      renderDeepcuts();
    });
  }
  function renderPeople() {
    $("#people-groups").innerHTML = state.taste.peopleGroups.map(group => `
      <section class="people-section"><p class="eyebrow">${escapeHtml(group.label)}</p><h2>${escapeHtml(group.title)}</h2>
      <div class="people-grid">${group.people.map(person => `<details class="person-card">
        <summary>${imageHtml({ ...person, title: person.name, medium: "person" })}
        <div><span class="badge">${escapeHtml(person.status)}</span><h3>${escapeHtml(person.name)}</h3>
        <p class="works">${escapeHtml(person.anchors.join(" · "))}</p><p class="reason">${escapeHtml(person.reason)}</p>
        <span class="learn-cue">Learn how they build <span aria-hidden="true">↘</span></span></div></summary>
        <div class="insight-drawer">${(person.insights || []).map(insightHtml).join("")}${nextTrailHtml(person.nextTrail)}</div>
      </details>`).join("")}</div></section>`).join("");
  }
  function renderShelves() {
    $("#core-shelves").innerHTML = state.taste.shelves.map(shelf => `<section class="shelf">
      <div class="shelf-head"><h2>${escapeHtml(shelf.title)}</h2><p>${escapeHtml(shelf.description)}</p></div>
      <div class="shelf-row">${shelf.items.map(item => `<details class="mini-work">
        <summary>${imageHtml({ ...item, medium: "work" })}
        <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.note)}</p><span class="learn-cue">Go behind it <span aria-hidden="true">↘</span></span></div></summary>
        ${workDossierHtml(item)}
      </details>`).join("")}</div>
      </section>`).join("");
  }
  function knownAnchor(item) {
    const media = {
      "Fire Punch": "manga", "Real": "manga", "City of God": "film", "The Stranger": "book",
      "Porco Rosso": "film", "Akira": "anime", "Goodnight Punpun": "manga", "Ping Pong the Animation": "anime",
      "Oldboy": "film", "Mother": "film", "Drive My Car": "film", "I'm No Longer Here": "film",
    };
    return state.taste.shelves.flatMap(shelf => shelf.items).find(anchor =>
      anchor.title.toLowerCase() === item.title.toLowerCase() && media[anchor.title] === item.media_type
    );
  }
  function catalogCreators(item) {
    const direct = item.features?.creator || [];
    if (direct.length) return direct;
    return [...new Set((item.source_links || []).filter(link => /^creator-credit:/.test(link.relation || "") && link.source_person).map(link => link.source_person))].slice(0, 4);
  }
  function catalogWhy(item) {
    const anchor = knownAnchor(item);
    if (anchor) return `Known anchor in Jerry’s current Taste map. ${anchor.dossier?.thesis || anchor.insight} The current map overrides any older archive status shown in the original import.`;
    if (item.curation?.editorial) return item.curation.editorial;
    if (item.trusted_connections?.length) return item.trusted_connections[0].why_it_mattered;
    if (item.source_people?.length) return `This entered through ${item.source_people.join(" and ")}. Open the source trail before treating that connection as a recommendation.`;
    if (item.discovery_trace?.length) return item.discovery_trace[0].note || item.discovery_trace[0].claim;
    if (item.reaction?.length) return `Your review records: ${item.reaction.join(" · ")}. This row preserves the reaction; it does not assume the work still matters now.`;
    return "Archive record only—not a Taste recommendation. It stays searchable so Jerry can identify it, inspect the source, and decide whether it deserves a researched path.";
  }
  function catalogSources(item) {
    const curated = (item.curation?.review_sources || []).map(source => ({ label: source.label, url: source.url }));
    const evidence = (item.source_links || []).filter(source => source.url && source.relation !== "catalogued")
      .map(source => ({ label: source.source_person ? `${source.source_person} · ${humanize(source.relation)}` : source.title, url: source.url }));
    const all = [...curated, ...evidence, { label: "Open catalog record", url: item.canonical_url }];
    const seen = new Set();
    return all.filter(source => source.url && !seen.has(source.url) && seen.add(source.url)).slice(0, 3);
  }
  function catalogDetailHtml(item) {
    const anchor = knownAnchor(item);
    const creators = catalogCreators(item);
    const relations = (item.relations || []).slice(0, 2).map(x => `${humanize(x.relation)}: ${x.related_title}`);
    const facts = [
      `${anchor ? "Known anchor" : humanize(item.status)}${item.year ? ` · ${item.year}` : ""}`,
      anchor?.note || "",
      creators.length ? `Made by ${creators.join(" · ")}` : "",
      item.rating != null ? `Your recorded rating: ${item.rating}` : "",
      item.duration_minutes ? `${item.duration_minutes} minutes` : "",
      relations.length ? relations.join(" · ") : "",
    ].filter(Boolean);
    const sources = catalogSources(item);
    return `<div class="insight-drawer library-drawer"><article class="insight-note">
      <p class="insight-label">${anchor ? "KNOWN ANCHOR CONTEXT" : item.curation ? "CURATED REASON" : "WHY THIS RECORD IS HERE"}</p>
      <p>${escapeHtml(catalogWhy(item))}</p><p class="fact-line">${escapeHtml(facts.join(" · "))}</p></article>
      ${item.trusted_connections?.length ? `<article class="insight-note"><p class="insight-label">DIRECT CONNECTION</p>
        <p>${escapeHtml(item.trusted_connections[0].qualification)}</p></article>` : ""}
      <article class="next-trail"><p class="insight-label">CHECK THE RECORD</p><div class="source-actions">
        ${sources.map(source => sourceLink(source.label, source.url)).join("")}
        ${item.image_source ? sourceLink("Image source", item.image_source) : ""}</div></article></div>`;
  }
  function renderLibrary() {
    const query = $("#library-search").value.trim().toLowerCase();
    const browsing = Boolean(query) || state.medium !== "all";
    const rows = browsing ? state.catalog.filter(item => {
      if (state.medium !== "all" && item.media_type !== state.medium) return false;
      const creators = (item.features?.creator || []).join(" ");
      return !query || `${item.title} ${creators} ${item.media_type}`.toLowerCase().includes(query);
    }) : [];
    $("#library-count").textContent = browsing
      ? `${rows.length.toLocaleString()} matches · showing first ${Math.min(80, rows.length)}`
      : "Search by a title or person, or choose a medium. The archive stays closed until you ask.";
    $("#library-results").innerHTML = rows.slice(0, 80).map(item => {
      const creators = catalogCreators(item);
      return `<details class="library-item"><summary>${imageHtml(item)}
        <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(creators.join(" · ") || item.year || "Creator not resolved")}</p>
        <small>${item.image ? "Verified public image" : "Editorial card · cover unresolved"} · tap to learn why</small></div>
        <span>${escapeHtml(item.media_type)} <b aria-hidden="true">↘</b></span></summary>${catalogDetailHtml(item)}</details>`;
    }).join("");
  }
  function setupLibrary() {
    renderShelves();
    const media = ["all", "film", "manga", "book", "anime", "essay", "audio", "video"];
    $("#media-filters").innerHTML = media.map(x => `<button type="button" data-medium="${x}" aria-pressed="${x === state.medium}">${x === "all" ? "All" : x}</button>`).join("");
    $$("#media-filters button").forEach(button => button.onclick = () => {
      state.medium = button.dataset.medium;
      $$("#media-filters button").forEach(x => x.setAttribute("aria-pressed", String(x === button)));
      renderLibrary();
    });
    $("#library-search").oninput = renderLibrary;
    renderLibrary();
  }
  function renderKafka() {
    const collection = state.connections.collections[0];
    const featured = collection.nodes.find(x => x.id === collection.featuredNodeId);
    $("#kafka-feature").innerHTML = `<div class="record" aria-hidden="true"></div><div>
      <p class="eyebrow">START WITH THE MUSIC</p><h2>${escapeHtml(featured.title)}</h2>
      <p>${escapeHtml(featured.role)}</p>${linkHtml({ label: "Find the recording", url: featured.listenUrl, external: true })}</div>`;
    const groups = ["all", "music", "texts", "ideas", "in-world"];
    $("#kafka-filters").innerHTML = groups.map(x => `<button type="button" data-kafka="${x}" aria-pressed="${x === state.kafkaFilter}">${x}</button>`).join("");
    $$("#kafka-filters button").forEach(button => button.onclick = () => {
      state.kafkaFilter = button.dataset.kafka;
      renderKafkaList();
    });
    renderKafkaList();
  }
  function renderKafkaList() {
    const collection = state.connections.collections[0];
    const nodes = collection.nodes.filter(x => state.kafkaFilter === "all" || x.group === state.kafkaFilter);
    $("#kafka-count").textContent = `${nodes.length} checked connections`;
    $("#kafka-list").innerHTML = nodes.map(node => `<article class="connection-card">
      <span class="badge">${escapeHtml(node.group)}${node.chapter ? ` · chapter ${escapeHtml(node.chapter)}` : ""}</span>
      <h3>${escapeHtml(node.title)}</h3><p>${escapeHtml(node.creator || "")}</p><p>${escapeHtml(node.role)}</p>
      ${linkHtml({ label: node.listenUrl ? "Open" : "Source", url: node.listenUrl || node.sourceUrl, external: true })}
    </article>`).join("");
    $$("#kafka-filters button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.kafka === state.kafkaFilter)));
  }
  function musicPredictionLabel(value) {
    return value === "strong" ? "Strong like prediction" : value === "maybe" ? "Could go either way" : "Weak signal — useful test";
  }
  function musicRatingLabel(value) {
    return ({ love: "Love", like: "Like", "not-for-me": "Not for me", unsure: "Unsure" })[value] || "";
  }
  function worldRatingLabel(value) {
    return ({ core: "Core", "want-more": "Want more", phase: "Phase only", "not-me": "Not me" })[value] || "";
  }
  function renderWorlds() {
    if (!state.worlds.length) return;
    const ratings = worldRatings();
    const answered = state.worlds.filter(item => ratings[item.id]).length;
    const item = state.worlds[state.worldIndex];
    const current = ratings[item.id] || "";
    $("#world-progress-count").textContent = `${answered} of ${state.worlds.length} answered`;
    $("#world-progress-note").textContent = answered === state.worlds.length ? "World map complete. Share it back to make it authoritative." : `${state.worlds.length - answered} left · saved on this device`;
    $("#world-progress-fill").style.width = `${Math.round(answered / state.worlds.length * 100)}%`;
    $("#world-card").innerHTML = `<div class="music-card-index">${state.worldIndex + 1} / ${state.worlds.length}</div>
      <div class="music-card-copy"><p class="eyebrow">${escapeHtml(item.type)} · ${escapeHtml(item.bridge)}</p>
      <h2>${escapeHtml(item.title)}</h2><p class="music-artist">${escapeHtml(item.artist)}</p>
      <div class="music-why"><strong>Why this whole world</strong><p>${escapeHtml(item.reason)}</p></div>
      <p class="music-boundary">${escapeHtml(item.boundary)}</p>
      <a class="primary-link music-listen" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Open the album</a></div>`;
    $$('[data-world-rating]').forEach(button => {
      const active = button.dataset.worldRating === current;
      button.setAttribute("aria-pressed", String(active));
      button.textContent = `${worldRatingLabel(button.dataset.worldRating)}${active ? " ✓" : ""}`;
    });
    $("#world-back").disabled = state.worldIndex === 0;
    const groups = ["core", "want-more", "phase", "not-me"];
    $("#world-summary").innerHTML = `<p class="eyebrow">YOUR DURABLE MAP</p><div class="music-summary-grid">${groups.map(value => `<div><strong>${state.worlds.filter(item => ratings[item.id] === value).length}</strong><span>${worldRatingLabel(value)}</span></div>`).join("")}</div>`;
  }
  function moveToNextWorld() {
    const ratings = worldRatings();
    const next = state.worlds.findIndex((item, index) => index > state.worldIndex && !ratings[item.id]);
    state.worldIndex = next >= 0 ? next : Math.min(state.worldIndex + 1, state.worlds.length - 1);
    renderWorlds();
  }
  function worldResultsText() {
    const ratings = worldRatings();
    const lines = ["Jerry's Taste — albums & music worlds", "Songs are evidence; these larger containers are the durable map.", ""];
    ["core", "want-more", "phase", "not-me"].forEach(value => {
      lines.push(`${worldRatingLabel(value).toUpperCase()}:`);
      const items = state.worlds.filter(item => ratings[item.id] === value);
      lines.push(...(items.length ? items.map(item => `- ${item.title} — ${item.artist}`) : ["- None yet"]), "");
    });
    return lines.join("\n");
  }
  function setMusicMode(mode) {
    state.musicMode = mode;
    $("#music-worlds-panel").hidden = mode !== "worlds";
    $("#music-songs-panel").hidden = mode !== "songs";
    $$('[data-music-mode]').forEach(button => button.setAttribute("aria-pressed", String(button.dataset.musicMode === mode)));
  }
  function renderMusic() {
    if (!state.music.length) return;
    const ratings = musicRatings();
    const answered = Object.keys(ratings).filter(id => ratings[id]).length;
    const item = state.music[state.musicIndex];
    const current = ratings[item.id] || "";
    $("#music-progress-count").textContent = `${answered} of ${state.music.length} answered`;
    $("#music-progress-note").textContent = answered === state.music.length ? "Review complete. Copy the results and send them back to make these authoritative." : `${state.music.length - answered} left · answers stay on this device`;
    $("#music-progress-fill").style.width = `${Math.round(answered / state.music.length * 100)}%`;
    $("#music-card").innerHTML = `<div class="music-card-index">${state.musicIndex + 1} / ${state.music.length}</div>
      <div class="music-card-copy"><p class="eyebrow">${escapeHtml(item.lane)} · ${escapeHtml(musicPredictionLabel(item.prediction))}</p>
      <h2>${escapeHtml(item.title)}</h2><p class="music-artist">${escapeHtml(item.artist)}</p>
      <div class="music-why"><strong>Why it is here</strong><p>${escapeHtml(item.reason)}</p></div>
      <p class="music-boundary">${escapeHtml(item.boundary)}</p>
      <a class="primary-link music-listen" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Listen on Spotify</a></div>`;
    $$('[data-music-rating]').forEach(button => {
      const active = button.dataset.musicRating === current;
      button.setAttribute("aria-pressed", String(active));
      button.textContent = `${musicRatingLabel(button.dataset.musicRating)}${active ? " ✓" : ""}`;
    });
    $("#music-back").disabled = state.musicIndex === 0;
    renderMusicSummary(ratings);
  }
  function moveToNextUnanswered() {
    const ratings = musicRatings();
    const next = state.music.findIndex((item, index) => index > state.musicIndex && !ratings[item.id]);
    state.musicIndex = next >= 0 ? next : Math.min(state.musicIndex + 1, state.music.length - 1);
    renderMusic();
  }
  function renderMusicSummary(ratings) {
    const groups = ["love", "like", "not-for-me", "unsure"].map(value => [value, state.music.filter(item => ratings[item.id] === value)]);
    $("#music-summary").innerHTML = `<p class="eyebrow">YOUR ANSWERS</p><div class="music-summary-grid">${groups.map(([value, items]) => `<div><strong>${items.length}</strong><span>${musicRatingLabel(value)}</span></div>`).join("")}</div>`;
  }
  function musicResultsText() {
    const ratings = musicRatings();
    const lines = ["Jerry's Taste — music review", "Predictions are not ratings; only the choices below are authoritative.", ""];
    ["love", "like", "not-for-me", "unsure"].forEach(value => {
      lines.push(`${musicRatingLabel(value).toUpperCase()}:`);
      const items = state.music.filter(item => ratings[item.id] === value);
      lines.push(...(items.length ? items.map(item => `- ${item.title} — ${item.artist}`) : ["- None yet"]), "");
    });
    const unanswered = state.music.filter(item => !ratings[item.id]);
    lines.push("UNANSWERED:", ...(unanswered.length ? unanswered.map(item => `- ${item.title} — ${item.artist}`) : ["- None"]));
    return lines.join("\n");
  }
  function showView(name) {
    const allowed = ["home", "music", "deepcuts", "people", "library", "kafka", "sources"];
    if (!allowed.includes(name)) name = "home";
    $$(".view").forEach(view => { view.hidden = view.id !== `${name}-view`; });
    $$("[data-nav]").forEach(link => link.toggleAttribute("aria-current", link.dataset.nav === name));
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = name === "home" ? "Taste · Jerry" : name === "deepcuts" ? "What next · Taste" : `${name[0].toUpperCase() + name.slice(1)} · Taste`;
  }
  function route() { showView(location.hash.slice(1) || "home"); }
  async function start() {
    try {
      const [taste, recommendations, connections, deepcuts, music, worlds] = await Promise.all([
        fetch("data/actual-taste.json").then(r => { if (!r.ok) throw Error("Taste map unavailable"); return r.json(); }),
        fetch("data/recommendations.json").then(r => { if (!r.ok) throw Error("Library unavailable"); return r.json(); }),
        fetch("data/work-connections.json").then(r => { if (!r.ok) throw Error("Kafka map unavailable"); return r.json(); }),
        fetch("data/deepcuts.json").then(r => { if (!r.ok) throw Error("Deep cuts unavailable"); return r.json(); }),
        fetch("data/music-review.json").then(r => { if (!r.ok) throw Error("Music review unavailable"); return r.json(); }),
        fetch("data/music-worlds.json").then(r => { if (!r.ok) throw Error("Music worlds unavailable"); return r.json(); }),
      ]);
      state.taste = taste; state.catalog = recommendations.catalog || []; state.connections = connections; state.deepcuts = deepcuts; state.music = music.tracks || []; state.worlds = worlds.worlds || [];
      renderHome(); renderWorlds(); renderMusic(); renderDeepcuts(); renderPeople(); setupLibrary(); renderKafka(); route();
    } catch (error) {
      $("#status").classList.remove("sr-only");
      $("#status").textContent = `${error.message}. Reload when online.`;
    }
  }
  $("#open-sources").onclick = () => { location.hash = "sources"; };
  $("#back-home").onclick = () => { location.hash = "home"; };
  $$('[data-music-rating]').forEach(button => button.onclick = () => {
    const item = state.music[state.musicIndex]; if (!item) return;
    const ratings = musicRatings(); ratings[item.id] = button.dataset.musicRating; saveMusicRatings(ratings);
    $("#status").textContent = `${item.title} marked ${musicRatingLabel(button.dataset.musicRating)}.`;
    moveToNextUnanswered();
  });
  $$('[data-music-mode]').forEach(button => button.onclick = () => setMusicMode(button.dataset.musicMode));
  $$('[data-world-rating]').forEach(button => button.onclick = () => {
    const item = state.worlds[state.worldIndex]; if (!item) return;
    const ratings = worldRatings(); ratings[item.id] = button.dataset.worldRating; saveWorldRatings(ratings);
    $("#status").textContent = `${item.title} marked ${worldRatingLabel(button.dataset.worldRating)}.`;
    moveToNextWorld();
  });
  $("#world-back").onclick = () => { state.worldIndex = Math.max(0, state.worldIndex - 1); renderWorlds(); };
  $("#world-skip").onclick = () => { state.worldIndex = (state.worldIndex + 1) % state.worlds.length; renderWorlds(); };
  $("#world-share").onclick = async () => {
    const text = worldResultsText();
    if (navigator.share) { try { await navigator.share({ title: "My music worlds", text }); return; } catch (error) { if (error.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(text); $("#status").textContent = "World results copied. Paste them into chat."; }
    catch (_) { $("#status").textContent = "Share was blocked. Try again from the secure live site."; }
  };
  $("#music-back").onclick = () => { state.musicIndex = Math.max(0, state.musicIndex - 1); renderMusic(); };
  $("#music-skip").onclick = () => { state.musicIndex = (state.musicIndex + 1) % state.music.length; renderMusic(); };
  $("#music-copy").onclick = async () => {
    const result = musicResultsText();
    try { await navigator.clipboard.writeText(result); $("#status").textContent = "Music results copied. Paste them back into chat when ready."; }
    catch (_) {
      const field = document.createElement("textarea"); field.value = result; field.setAttribute("readonly", ""); field.style.position = "fixed"; field.style.opacity = "0";
      document.body.append(field); field.select(); const copied = document.execCommand("copy"); field.remove();
      $("#status").textContent = copied ? "Music results copied. Paste them back into chat when ready." : "Copy was blocked. Try again from the secure live site.";
    }
  };
  addEventListener("hashchange", route);
  document.addEventListener("error", event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.dataset.fallback || image.src === image.dataset.fallback) return;
    image.src = image.dataset.fallback;
    image.alt = `${image.alt.replace("artwork", "").trim()} editorial title card; verified image unavailable`;
  }, true);
  if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  start();
})();
