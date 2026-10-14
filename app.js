(() => {
  "use strict";
  const START_BALANCE = 650668250123;
  const KEYS = { balance: "ticohDemoBalanceV1", history: "ticohDemoHistoryV1" };
  const $ = (id) => document.getElementById(id);
  const state = { balance: START_BALANCE, history: [], profile: null, processing: false, seenLiveEvents: new Set() };

  const fmt = (n) => Number(n).toLocaleString("en-US");
  const normaliseUsername = (raw) => raw.trim().replace(/^@+/, "").replace(/\s/g, "");
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));

  function loadState() {
    try {
      const balance = localStorage.getItem(KEYS.balance);
      const history = localStorage.getItem(KEYS.history);
      if (balance !== null && Number.isSafeInteger(Number(balance)) && Number(balance) >= 0) state.balance = Number(balance);
      if (history) {
        const parsed = JSON.parse(history);
        if (Array.isArray(parsed)) state.history = parsed.slice(0, 100);
      }
    } catch (e) { console.warn("Local demo data could not be read.", e); }
  }
  function persist() {
    try {
      localStorage.setItem(KEYS.balance, String(state.balance));
      localStorage.setItem(KEYS.history, JSON.stringify(state.history.slice(0, 100)));
    } catch (e) { showError("Your browser could not save demo data. Check browser storage settings."); }
  }
  function renderBalance() { $("balance").textContent = fmt(state.balance); }
  function renderHistory() {
    const host = $("history-list");
    if (!state.history.length) { host.innerHTML = '<div class="empty-state">No demo transactions yet.</div>'; return; }
    host.innerHTML = state.history.map(item => `
      <div class="history-item">
        <div class="history-symbol">✓</div>
        <div class="history-main">
          <div class="history-user">@${escapeHtml(item.username)}</div>
          <div class="history-time">${escapeHtml(new Date(item.timestamp).toLocaleString())}</div>
        </div>
        <div>
          <div class="history-amount">−${fmt(item.amount)}</div>
          <div class="history-label">DEMO POINTS</div>
        </div>
      </div>`).join("");
  }
  function showError(message) { $("form-error").textContent = message; $("form-error").classList.remove("hidden"); }
  function clearError() { $("form-error").textContent = ""; $("form-error").classList.add("hidden"); }
  function showModal(id) { $(id).classList.remove("hidden"); }
  function hideModal(id) { $(id).classList.add("hidden"); }

  // Profile lookup is intentionally opt-in. Configure /api/profile with an authorized
  // data provider. The frontend never invents a profile or scrapes TikTok pages.
  let lookupTimer;
  async function lookupProfile() {
    clearTimeout(lookupTimer);
    const username = normaliseUsername($("username-search").value);
    state.profile = null;
    $("profile-card").classList.add("hidden");
    $("profile-verified").classList.add("hidden");
    if (!username) {
      $("profile-status").textContent = "Enter a username. Profile details appear only when a configured lookup provider returns them.";
      return;
    }
    $("profile-status").textContent = "Looking up @" + username + "…";
    lookupTimer = setTimeout(async () => {
      try {
        const response = await fetch("/api/profile?username=" + encodeURIComponent(username), { headers: { "Accept": "application/json" } });
        if (!response.ok) throw new Error("Profile lookup is not configured.");
        const data = await response.json();
        if (!data || !data.username || !data.displayName) throw new Error(data?.message || "No profile details were returned.");
        state.profile = data;
        $("profile-name").textContent = data.displayName;
        $("profile-handle").textContent = "@" + String(data.username).replace(/^@+/, "");
        const avatar = $("profile-avatar");
        avatar.innerHTML = "";
        if (data.avatarUrl && /^https:\/\/[^ ]+$/i.test(data.avatarUrl)) {
          const img = document.createElement("img");
          img.src = data.avatarUrl;
          img.alt = "";
          img.referrerPolicy = "no-referrer";
          img.onerror = () => { avatar.textContent = (data.displayName || "?").slice(0,1).toUpperCase(); };
          avatar.appendChild(img);
        } else {
          avatar.textContent = (data.displayName || "?").slice(0,1).toUpperCase();
        }
        $("profile-card").classList.remove("hidden");
        $("profile-verified").classList.remove("hidden");
        $("profile-status").textContent = "Profile details returned by the configured provider.";
      } catch (err) {
        $("profile-status").textContent = "Profile not loaded: " + (err.message || "configure an authorized profile lookup provider.");
      }
    }, 450);
  }

  function setAmount(value) {
    $("amount").value = String(value).replace(/\D/g, "").slice(0, 15);
    clearError();
  }
  function amountFromKey(key) {
    const input = $("amount");
    let value = input.value;
    if (key === "clear") value = "";
    else if (key === "back") value = value.slice(0, -1);
    else value = (value === "0" ? "" : value) + key;
    setAmount(value);
  }

  async function sendDemo() {
    if (state.processing) return;
    clearError();
    const username = normaliseUsername($("username-search").value);
    const amountText = $("amount").value.trim();
    const amount = Number(amountText);
    if (!username || !/^[a-zA-Z0-9._]{2,24}$/.test(username)) return showError("Enter a valid username (2–24 letters, numbers, periods or underscores).");
    if (!/^\d+$/.test(amountText) || !Number.isSafeInteger(amount) || amount <= 0) return showError("Enter a positive whole-number amount.");
    if (amount > state.balance) return showError("The amount exceeds your available demo balance.");
    state.processing = true;
    $("send-button").disabled = true;
    $("processing-copy").textContent = "Validating @" + username + " and " + fmt(amount) + " demo points…";
    showModal("processing-modal");

    // This delay is a visual demo only; it is not a real account lookup or transfer.
    await new Promise(resolve => setTimeout(resolve, 1550));
    state.balance -= amount;
    const item = { id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()), username, amount, timestamp: new Date().toISOString(), type: "demo" };
    state.history.unshift(item);
    state.history = state.history.slice(0, 100);
    persist();
    renderBalance();
    renderHistory();
    hideModal("processing-modal");
    $("done-copy").textContent = fmt(amount) + " demo coins simulated for @" + username;
    showModal("done-modal");
    state.processing = false;
    $("send-button").disabled = false;
  }

  $("username-search").addEventListener("input", () => { $("clear-search").classList.toggle("hidden", !$("username-search").value); lookupProfile(); });
  // Poll the optional backend for LIVE events. This remains disconnected until configured.
  async function pollLiveEvents() {
    try {
      const response = await fetch("/api/live-events", { headers: { "Accept": "application/json" } });
      if (!response.ok) throw new Error("not configured");
      const data = await response.json();
      const status = $("live-connection-status");
      if (data.connected) {
        status.textContent = "Connected · checking recent gift events";
        status.classList.add("connected");
        for (const event of [...(data.events || [])].reverse()) {
          if (!event.event_id || state.seenLiveEvents.has(event.event_id)) continue;
          state.seenLiveEvents.add(event.event_id);
          if (state.seenLiveEvents.size > 500) state.seenLiveEvents.clear();
          $("username-search").value = String(event.sender_username || "").replace(/^@+/, "");
          $("clear-search").classList.remove("hidden");
          lookupProfile();
          $("live-last-event").textContent = `Detected: @${event.sender_username} · ${event.gift_name} ×${event.gift_count}`;
          // Auto-sending is deliberately not triggered: a LIVE gift event cannot authorize
          // an external transfer, and demo rewards should be user-confirmed.
        }
      } else {
        status.textContent = data.message || "Not connected";
        status.classList.remove("connected");
      }
    } catch (_) {
      const status = $("live-connection-status");
      if (status) { status.textContent = "Not connected · configure the LIVE worker and storage"; status.classList.remove("connected"); }
    }
  }
  pollLiveEvents();
  setInterval(pollLiveEvents, 5000);
  $("clear-search").addEventListener("click", () => { $("username-search").value = ""; $("clear-search").classList.add("hidden"); lookupProfile(); $("username-search").focus(); });
  $("amount").addEventListener("input", () => { $("amount").value = $("amount").value.replace(/\D/g, "").slice(0, 15); clearError(); });
  document.querySelectorAll("[data-key]").forEach(button => button.addEventListener("click", () => amountFromKey(button.dataset.key)));
  document.querySelectorAll("[data-amount]").forEach(button => button.addEventListener("click", () => setAmount(button.dataset.amount)));
  $("send-button").addEventListener("click", sendDemo);
  $("done-close").addEventListener("click", () => hideModal("done-modal"));
  $("settings-open").addEventListener("click", () => { $("starting-balance").value = String(state.balance); showModal("settings-modal"); });
  $("settings-close").addEventListener("click", () => hideModal("settings-modal"));
  $("reset-balance").addEventListener("click", () => {
    const value = $("starting-balance").value.trim();
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 0) return alert("Enter a valid non-negative whole-number balance.");
    state.balance = Number(value); persist(); renderBalance(); hideModal("settings-modal");
  });
  const clearHistory = () => { if (confirm("Clear all demo transaction history from this browser?")) { state.history = []; persist(); renderHistory(); } };
  $("clear-history").addEventListener("click", clearHistory);
  $("settings-clear-history").addEventListener("click", () => { state.history = []; persist(); renderHistory(); });
  document.querySelectorAll(".modal").forEach(modal => modal.addEventListener("click", e => { if (e.target === modal && modal.id !== "processing-modal") hideModal(modal.id); }));

  loadState();
  renderBalance();
  renderHistory();
  $("clear-search").classList.add("hidden");
})();
