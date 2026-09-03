export function mountAgentPageTemplate(root: HTMLElement): void {
  root.innerHTML = `
    <main class="agent-shell">
      <header class="agent-header">
        <a class="wordmark" href="/" aria-label="Return to Beaver Krieg">
          <span class="wordmark__mark" aria-hidden="true">BW</span>
          <span><strong>Beaver Krieg</strong><small>Browser agent console</small></span>
        </a>
        <div class="platform-badges" aria-label="Browser agent support">
          <span id="webMcpSupportBadge" class="status-badge status-badge--checking">Checking WebMCP</span>
          <span id="siteToolsBadge" class="status-badge">Site tools offline</span>
        </div>
      </header>

      <section class="agent-hero" aria-labelledby="agentPageTitle">
        <p class="eyebrow">Page-bound tactical control</p>
        <h1 id="agentPageTitle">One page. One agent seat.</h1>
        <p>Keep this page open while your browser agent plays. Match tools exist only in this tab and disappear when it closes.</p>
      </section>

      <div class="agent-layout">
        <section class="console-card console-card--status" aria-labelledby="connectionHeading" aria-live="polite">
          <div class="card-heading"><div><p class="eyebrow">Connection</p><h2 id="connectionHeading">Preparing agent console</h2></div><span id="connectionDot" class="connection-dot" aria-hidden="true"></span></div>
          <p id="connectionMessage" class="status-message">Checking browser support and release configuration.</p>
          <p id="invitationStatus" class="invitation-status">No invitation supplied.</p>
          <div id="expiryWrap" class="expiry" hidden><span>Invitation link expires in</span><strong id="expiryCountdown">—</strong></div>
        </section>

        <section class="console-card" aria-labelledby="matchHeading">
          <div class="card-heading"><div><p class="eyebrow">Last observed state</p><h2 id="matchHeading">Match summary</h2></div></div>
          <dl class="metric-grid">
            <div><dt>Round</dt><dd id="matchRound">—</dd></div>
            <div><dt>Seat / team</dt><dd id="matchSeat">—</dd></div>
            <div><dt>Can act</dt><dd id="matchCanAct">—</dd></div>
            <div><dt>Round clock</dt><dd id="matchClock">—</dd></div>
            <div><dt>Units</dt><dd id="matchUnits">—</dd></div>
            <div><dt>Lodges</dt><dd id="matchLodges">—</dd></div>
          </dl>
        </section>

        <section class="console-card" aria-labelledby="activityHeading">
          <div class="card-heading"><div><p class="eyebrow">Reviewable activity</p><h2 id="activityHeading">Latest tool result</h2></div></div>
          <dl class="activity-list">
            <div><dt>Tool</dt><dd id="lastTool">None</dd></div>
            <div><dt>Execution</dt><dd id="lastExecution">Waiting</dd></div>
            <div><dt>Action</dt><dd id="lastAction">None</dd></div>
            <div><dt>Recovery</dt><dd id="recoveryStatus">Not needed</dd></div>
          </dl>
        </section>

        <section class="console-card console-card--controls" aria-labelledby="controlsHeading">
          <div class="card-heading"><div><p class="eyebrow">Human controls</p><h2 id="controlsHeading">Seat controls</h2></div></div>
          <div class="control-grid">
            <button id="reconnectButton" type="button" disabled>Reconnect</button>
            <button id="disconnectButton" type="button" disabled>Disconnect</button>
            <button id="forgetButton" class="danger-button" type="button" disabled>Forget this seat</button>
            <button id="copyDiagnosticsButton" type="button">Copy redacted diagnostics</button>
          </div>
          <p id="controlStatus" class="control-status" aria-live="polite"></p>
        </section>
      </div>

      <footer class="agent-footer"><a href="/">Return to Beaver Krieg</a><a href="/mcp/#browser-agent">Agent setup documentation</a></footer>
    </main>`;
}
