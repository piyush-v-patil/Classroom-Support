const ADMIN_PASSWORD = "espresso"; // ← change this

    // ── State ──────────────────────────────────────────────────────────────────
    let isAdmin = false;
    let issues = [];
    let editingId = null;
    let deleteId = null;
    const TAGS = ['All', 'Display', 'Audio', 'Input', 'Control', 'Signal', 'Network', 'System'];
    const TIERS = [
      { label: 'Tier 1 — Primary Response', color: '#6FA3C8', bg: 'rgba(74,127,165,0.12)', desc: 'Resolve without rack access' },
      { label: 'Tier 2 — Rack Level', color: '#2471A3', bg: 'rgba(36,113,163,0.12)', desc: 'Requires rack inspection' },
      { label: 'Tier 3 — Configuration', color: '#C0392B', bg: 'rgba(192,57,43,0.12)', desc: 'Needs software or network access' },
    ];
    let activeFilter = 'All';

    const TAGCOLORS = {
      Display: { c: '#6FA3C8', bg: 'rgba(74,127,165,0.12)' },
      Audio: { c: '#B8860B', bg: 'rgba(184,134,11,0.12)' },
      Input: { c: '#27934F', bg: 'rgba(39,147,79,0.12)' },
      Control: { c: '#2471A3', bg: 'rgba(36,113,163,0.12)' },
      Signal: { c: '#7D3C98', bg: 'rgba(125,60,152,0.12)' },
      Network: { c: '#0E7F6E', bg: 'rgba(14,127,110,0.12)' },
      System: { c: '#C0392B', bg: 'rgba(192,57,43,0.12)' },
    };

    // ── AUTH ────────────────────────────────────────────────────────────────────
    window.openLogin = () => { document.getElementById('login-modal').classList.add('open'); setTimeout(() => document.getElementById('pw-input').focus(), 100); };
    window.closeLogin = () => { document.getElementById('login-modal').classList.remove('open'); document.getElementById('login-err').textContent = ''; document.getElementById('pw-input').value = ''; };
    window.doLogin = () => {
      const pw = document.getElementById('pw-input').value;
      if (pw === ADMIN_PASSWORD) {
        isAdmin = true;
        document.getElementById('login-modal').classList.remove('open');
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = '';
        document.getElementById('admin-badge').style.display = '';
        document.getElementById('add-issue-btn').style.display = '';
        renderIssues();
        toast('Admin mode enabled', '#27934F');
      } else {
        document.getElementById('login-err').textContent = 'Incorrect password. Try again.';
        document.getElementById('pw-input').value = '';
        document.getElementById('pw-input').focus();
      }
    };
    window.doLogout = () => {
      isAdmin = false;
      document.getElementById('login-btn').style.display = '';
      document.getElementById('logout-btn').style.display = 'none';
      document.getElementById('admin-badge').style.display = 'none';
      document.getElementById('add-issue-btn').style.display = 'none';
      renderIssues();
      toast('Signed out', '#4A5A68');
    };

    // ── ISSUE CRUD (LOCAL IN-MEMORY) ────────────────────────────────────────────
    window.openAdd = () => {
      editingId = null;
      document.getElementById('edit-modal-title').textContent = 'Add New Issue';
      document.getElementById('edit-modal-sub').textContent = 'Fill in the issue details and checks below';
      document.getElementById('f-title').value = '';
      document.getElementById('f-time').value = '';
      document.getElementById('f-tag').value = 'Display';
      document.getElementById('f-tier').value = '0';
      clearStepEditors();
      document.getElementById('edit-modal').classList.add('open');
    };

    window.openEdit = (id) => {
      const iss = issues.find(x => x.id === id);
      if (!iss) return;
      editingId = id;
      document.getElementById('edit-modal-title').textContent = 'Edit Issue';
      document.getElementById('edit-modal-sub').textContent = iss.title;
      document.getElementById('f-title').value = iss.title || '';
      document.getElementById('f-time').value = iss.time || '';
      document.getElementById('f-tag').value = iss.tag || 'Display';
      document.getElementById('f-tier').value = String(iss.tier ?? 0);
      clearStepEditors();
      (iss.primary || []).forEach(s => addStepRow('primary-editor', s));
      (iss.power || []).forEach(s => addStepRow('power-editor', s));
      (iss.real || []).forEach(s => addStepRow('real-editor', s));
      document.getElementById('edit-modal').classList.add('open');
    };

    window.closeEdit = () => { document.getElementById('edit-modal').classList.remove('open'); editingId = null; };

    window.saveIssue = () => {
      const title = document.getElementById('f-title').value.trim();
      if (!title) { alert('Please enter a title.'); return; }

      const data = {
        title,
        time: document.getElementById('f-time').value.trim(),
        tag: document.getElementById('f-tag').value,
        tier: parseInt(document.getElementById('f-tier').value),
        primary: collectSteps('primary-editor'),
        power: collectSteps('power-editor'),
        real: collectSteps('real-editor'),
        order: editingId ? (issues.find(x => x.id === editingId)?.order ?? Date.now()) : Date.now(),
      };

      if (editingId) {
        const index = issues.findIndex(x => x.id === editingId);
        if (index !== -1) {
          data.id = editingId;
          issues[index] = data;
          toast('Issue updated locally', '#27934F');
        }
      } else {
        data.id = 'loc_' + Date.now();
        issues.push(data);
        issues.sort((a, b) => a.order - b.order);
        toast('Issue added locally', '#27934F');
      }

      renderIssues();
      closeEdit();
    };

    window.openDeleteConfirm = (id) => {
      deleteId = id;
      const iss = issues.find(x => x.id === id);
      document.getElementById('confirm-msg').textContent = `"${iss?.title || 'This issue'}" will be permanently removed.`;
      document.getElementById('confirm-modal').classList.add('open');
    };

    window.closeConfirm = () => { document.getElementById('confirm-modal').classList.remove('open'); deleteId = null; };

    window.confirmDelete = () => {
      if (!deleteId) return;
      issues = issues.filter(x => x.id !== deleteId);
      renderIssues();
      toast('Issue deleted locally', '#C0392B');
      closeConfirm();
    };

    // ── DELETE SINGLE STEP (LOCAL IN-MEMORY) ─────────────────────────────────────
    window.deleteStep = (issueId, section, stepIdx) => {
      const iss = issues.find(x => x.id === issueId);
      if (!iss) return;
      if (iss[section]) {
        iss[section].splice(stepIdx, 1);
        renderIssues();
        toast('Step removed locally', '#C0392B');
      }
    };

    // ── STEP EDITOR HELPERS ──────────────────────────────────────────────────────
    function clearStepEditors() {
      ['primary-editor', 'power-editor', 'real-editor'].forEach(id => document.getElementById(id).innerHTML = '');
    }
    window.addStepRow = (editorId, step) => {
      const ed = document.getElementById(editorId);
      const row = document.createElement('div');
      row.className = 'step-edit-row';
      row.innerHTML = `
    <select class="step-edit-type">
      <option value="primary" ${step?.type === 'primary' ? 'selected' : ''}>Primary</option>
      <option value="power"   ${step?.type === 'power' ? 'selected' : ''}>Power</option>
      <option value="real"    ${step?.type === 'real' ? 'selected' : ''}>Diagnostic</option>
    </select>
    <input class="step-edit-icon" type="text" placeholder="🔧" value="${step?.i || ''}">
    <textarea class="step-edit-text" placeholder="Describe the check or step…">${step?.t || ''}</textarea>
    <button class="step-rm" onclick="this.closest('.step-edit-row').remove()">×</button>`;
      ed.appendChild(row);
    };
    function collectSteps(editorId) {
      return Array.from(document.getElementById(editorId).querySelectorAll('.step-edit-row')).map(row => ({
        type: row.querySelector('.step-edit-type').value,
        i: row.querySelector('.step-edit-icon').value.trim() || '🔧',
        t: row.querySelector('.step-edit-text').value.trim(),
      })).filter(s => s.t);
    }

    // ── RENDER ───────────────────────────────────────────────────────────────────
    window.setFilter = (f) => { activeFilter = f; renderFilters(); renderIssues(); };
    function renderFilters() {
      document.getElementById('filter-pills').innerHTML = TAGS.map(t =>
        `<button class="pill ${activeFilter === t ? 'on' : ''}" onclick="setFilter('${t}')">${t}</button>`
      ).join('');
    }

    window.togCard = (id) => { const c = document.getElementById('ic' + id); if (c) c.classList.toggle('open'); };

    window.renderIssues = () => {
      const q = (document.getElementById('srch')?.value || '').toLowerCase();
      let html = '';
      [0, 1, 2].forEach(ti => {
        const t = TIERS[ti];
        const items = issues.filter(iss =>
          iss.tier === ti &&
          (activeFilter === 'All' || iss.tag === activeFilter) &&
          (!q || (iss.title || '').toLowerCase().includes(q))
        );
        if (!items.length) return;
        html += `<div class="tier-block">
      <div class="tier-label">
        <span class="tier-badge" style="background:${t.bg};color:${t.color}">${t.label}</span>
        <span class="tier-desc">${t.desc}</span>
      </div>`;
        items.forEach((iss, idx) => {
          const tc = TAGCOLORS[iss.tag] || { c: '#888', bg: 'rgba(136,136,136,0.1)' };
          const stepSections = [
            { key: 'primary', label: 'Primary Checks', note: 'Verify before touching hardware', pill: 'rgba(74,127,165,0.15)', pillC: '#6FA3C8', cls: 'step-primary' },
            { key: 'power', label: 'Power Cycle', note: 'In order — wait for each to stabilize', pill: 'rgba(39,147,79,0.12)', pillC: '#27934F', cls: 'step-power' },
            { key: 'real', label: 'Deep Diagnostics', note: 'If above steps did not resolve', pill: 'rgba(192,57,43,0.10)', pillC: '#C0392B', cls: 'step-real' },
          ];
          let bodyHtml = '';
          if (isAdmin) {
            bodyHtml += `<div class="card-admin-bar">
          <button class="cta cta-edit" onclick="event.stopPropagation();openEdit('${iss.id}')">EDIT ISSUE</button>
          <button class="cta cta-del"  onclick="event.stopPropagation();openDeleteConfirm('${iss.id}')">DELETE</button>
        </div>`;
          }
          stepSections.forEach(sec => {
            const steps = iss[sec.key] || [];
            if (!steps.length) return;
            bodyHtml += `<div class="step-group">
          <div class="sg-head">
            <span class="sg-pill" style="background:${sec.pill};color:${sec.pillC}">${sec.label}</span>
            <span class="sg-note">${sec.note}</span>
          </div>
          <div class="steps">`;
            steps.forEach((s, si) => {
              bodyHtml += `<div class="step ${sec.cls}">
            <span class="step-ico">${s.i || '🔧'}</span>
            <span>${s.t || ''}</span>
            ${isAdmin ? `<button class="step-del-btn" onclick="event.stopPropagation();deleteStep('${iss.id}','${sec.key}',${si})" title="Remove this step">×</button>` : ''}
          </div>`;
            });
            bodyHtml += `</div></div>`;
          });
          html += `<div class="icard" id="ic${iss.id}" style="border-left:3px solid ${tc.c}">
        <div class="icard-top" onclick="togCard('${iss.id}')">
          <span class="icard-num">${String(idx + 1).padStart(2, '0')}</span>
          <span class="icard-title">${iss.title || 'Untitled'}</span>
          <span class="icard-tag" style="background:${tc.bg};color:${tc.c}">${iss.tag || ''}</span>
          <span class="icard-time">${iss.time || ''}</span>
          <span class="ichev">&#9654;</span>
        </div>
        <div class="icard-body">${bodyHtml}</div>
      </div>`;
        });
        html += '</div>';
      });
      document.getElementById('issue-list').innerHTML = html ||
        '<div class="empty"><div class="empty-ico">🔍</div>No issues match this filter.</div>';
    };

    // ── DEVICES ──────────────────────────────────────────────────────────────────
    const DEVICES = [
      { img: 'images/Extron IN1606.jpg', ico: '🔀', name: 'IN1608 xi IPCP Q MA 70', model: 'Extron', role: 'Core 8-input HDMI/DTP scaling switcher with built-in control processor and 70V amplifier. Routes all video sources to outputs.', pill: 'Core Switcher', pillC: '#6FA3C8', pillBg: 'rgba(74,127,165,0.15)' },
      { img: 'images/Extron ipcppro360Qxi.jpg', ico: '🧠', name: 'IPCP Pro 360xi', model: 'Extron', role: 'Standalone IP control processor. Runs Global Configurator logic; controls switcher, displays, and cameras via RS-232 and IP.', pill: 'Control Processor', pillC: '#2471A3', pillBg: 'rgba(36,113,163,0.15)' },
      { img: 'images/CISCO-C9200CX-12P-2X2G-A.jpg', ico: '🌐', name: 'C9200X-12P-2X2G-E', model: 'Cisco', role: 'Managed 12-port PoE+ switch. Provides network and PoE power to TLP, intercom, cable cubby, and WattBox. SFP uplink to building WAN.', pill: 'PoE+ Switch', pillC: '#27934F', pillBg: 'rgba(39,147,79,0.15)' },
      { img: 'images/WattBox WB-300-IP-3.jpg', ico: '⚡', name: 'WB-300-IP-3', model: 'WattBox', role: 'IP-controlled 8-outlet power conditioner. All rack devices plug into this. Enables remote power cycling via web interface.', pill: 'IP Power Control', pillC: '#7D3C98', pillBg: 'rgba(125,60,152,0.15)' },
      { img: 'images/DTP HDMI 4K 230 Tx.jpg', ico: '📡', name: 'DTP HDMI 4K 230 Tx', model: 'Extron', role: 'Rack-mount DTP transmitter. Sends HDMI signal over a single shielded Cat6 to the display location, up to 230ft.', pill: 'Signal Tx', pillC: '#2471A3', pillBg: 'rgba(36,113,163,0.15)' },
      { img: 'images/DTP HDMI 4K 230 Rx.jpg', ico: '🖥️', name: 'DTP HDMI 4K 230 Rx', model: 'Extron', role: 'DTP receiver at the display end. Converts Cat6 DTP signal back to HDMI. Self-powered over the DTP cable.', pill: 'Signal Rx', pillC: '#2471A3', pillBg: 'rgba(36,113,163,0.15)' },
      { img: 'images/Extron TLP Pro 725T.jpg', ico: '🖱️', name: 'TLP 725T', model: 'Extron', role: '7-inch PoE-powered touch panel. Professor\'s only interface. Connects to IPCP by IP over the Cisco switch.', pill: 'Touch Panel', pillC: '#0E7F6E', pillBg: 'rgba(14,127,110,0.15)' },
      { img: 'images/Extron MPA 601-70V.jpg', ico: '🔊', name: 'MPA 601-70V', model: 'Extron', role: '100W mono 70V amplifier. Receives audio from IN1608 and drives JBL LCT-81-CT ceiling speakers at 70V line level.', pill: 'Amplifier', pillC: '#B8860B', pillBg: 'rgba(184,134,11,0.15)' },
      { img: 'images/Extron USB-C HD 101.jpg', ico: '💻', name: 'USB-C HD 101', model: 'Extron', role: 'USB-C to HDMI interface for modern laptops. Plugs into Cable Cubby USB-C slot; outputs HDMI to IN1608 Input 4.', pill: 'USB-C Interface', pillC: '#2471A3', pillBg: 'rgba(36,113,163,0.15)' },
    ];
    function renderDevices() {
      document.getElementById('dev-grid').innerHTML = DEVICES.map(d => {
        const visual = d.img 
          ? `<img src="${d.img}" class="dcard-img" alt="${d.name}">` 
          : `<div class="dcard-ico">${d.ico}</div>`;

        return `<div class="dcard" ${d.img ? `onclick="openZoom('${d.img}')" style="cursor:pointer" title="Click to zoom image"` : ''}>
      ${visual}
      <div>
        <div class="dcard-name">${d.name}</div>
        <div class="dcard-model">${d.model}</div>
        <div class="dcard-role">${d.role}</div>
        <div class="dcard-pill" style="background:${d.pillBg};color:${d.pillC}">${d.pill}</div>
      </div>
    </div>`;
      }).join('');
    }

    // ── ZOOM & EMERGENCY MODAL ────────────────────────────────────────────────────
    window.openEmergency = () => {
      document.getElementById('emergency-modal').classList.add('open');
    };
    window.closeEmergency = () => {
      document.getElementById('emergency-modal').classList.remove('open');
    };

    window.openZoom = (src) => {
      document.getElementById('zoom-img-target').src = src;
      document.getElementById('zoom-modal').classList.add('open');
    };
    window.closeZoom = () => {
      document.getElementById('zoom-modal').classList.remove('open');
    };

    // ── TOAST ─────────────────────────────────────────────────────────────────────
    function toast(msg, color) {
      const t = document.getElementById('toast');
      document.getElementById('toast-msg').textContent = msg;
      document.getElementById('toast-dot').style.background = color || 'var(--ac)';
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2800);
    }

    // ── EXPORT PDF ────────────────────────────────────────────────────────────────
    window.exportPDF = () => {
      const origTitle = document.title;
      document.title = "UNCC_Classroom_Support_Guide";
      
      const cards = document.querySelectorAll('.icard');
      const alreadyOpen = Array.from(cards).filter(c => c.classList.contains('open'));
      
      cards.forEach(c => c.classList.add('open'));
      
      setTimeout(() => {
        window.print();
        document.title = origTitle;
        cards.forEach(c => {
          if (!alreadyOpen.includes(c)) c.classList.remove('open');
        });
      }, 50);
    };

    // ── NAV ───────────────────────────────────────────────────────────────────────
    window.navTo = (id) => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('.tnav').forEach((b, i) => b.classList.toggle('active', ['issues', 'devices'][i] === id));
    };
    function updateNav() {
      const ids = ['issues', 'devices'];
      let best = 0;
      ids.forEach((id, i) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < 130) best = i; });
      document.querySelectorAll('.tnav').forEach((b, i) => b.classList.toggle('active', i === best));
    }
    window.addEventListener('scroll', updateNav);

    // ── REVEAL ────────────────────────────────────────────────────────────────────
    function checkReveal() {
      let delay = 0;
      document.querySelectorAll('.reveal:not(.vis)').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight - 50) {
          el.style.transitionDelay = `${delay}ms`;
          el.classList.add('vis');
          delay += 120;
        }
      });
    }
    window.addEventListener('scroll', checkReveal);
    window.addEventListener('load', checkReveal);
    checkReveal();

    // ── DEMO DATA ─────────────────────────────────────────────────────────────────
    function loadDemoData() {
      issues = [
        {
          id: 'd01', tier: 0, order: 1, title: 'No image on the projector or display', tag: 'Display', time: '~5 min',
          primary: [
            { i: '📺', t: '<b>Is the projector/display powered on?</b> Look at the power indicator LED. Projectors show green/blue when active, red when in standby. Press the power button on the display or remote if off.' },
            { i: '📽️', t: '<b>Is the projector screen physically lowered?</b> Motorized screens must fully descend before projection is visible. Check the screen controller near the podium.' },
            { i: '🔢', t: '<b>Is the Samsung/display on the correct input?</b> Should be HDMI 1. Press Input on the display remote and switch to HDMI 1 — a previous user may have changed it.' },
            { i: '🖱️', t: '<b>Did they press System On on the TLP?</b> The AV chain does not power up until System On is tapped. The PC being on is independent — it is on a separate WattBox outlet.' },
            { i: '🗂️', t: '<b>Is the correct source selected on the TLP?</b> System may be on but displaying the wrong source. Confirm PC, Laptop, or the expected input is actively selected.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle IN1608 switcher</b> (WattBox Outlet 4, wait 15s). Resets every HDMI handshake and EDID negotiation in the system. Resolves "no signal" in the majority of cases.' },
            { i: '🔄', t: '<b>Power cycle DTP Rx</b> at the display end — unplug and replug Cat6. Amber Link LED within 10s confirms the DTP path is restored.' },
          ],
          real: [{ i: '🔧', t: 'If display is confirmed on and correct input selected but still no signal: reseat every HDMI lock-it cable. Check DTP Cat6 at both the Leviton keystone and the Rx port — a 90% seated RJ45 kills the signal entirely.' }]
        },
        {
          id: 'd02', tier: 0, order: 2, title: 'Touch panel is black or unresponsive', tag: 'Control', time: '~3 min',
          primary: [
            { i: '👆', t: '<b>Did they tap the screen?</b> TLP dims to black after 30s of inactivity. A single tap anywhere wakes it. This accounts for the majority of "panel is dead" calls.' },
            { i: '🧹', t: '<b>Is the glass clean?</b> Heavy dust or dry-erase marker spray on the capacitive screen causes missed touches. Wipe with a dry microfiber cloth.' },
            { i: '🔌', t: '<b>Is the Cat6 cable seated at both ends?</b> TLP has no battery and no power brick. It runs exclusively on PoE over Cat6 from Cisco Port 3. A loose clip at either end = fully dead panel.' },
          ],
          power: [
            { i: '🔄', t: '<b>Unplug Cat6 from Cisco Port 3, wait 10s, re-plug.</b> TLP reboots over PoE and shows the home screen within 30s.' },
            { i: '🔄', t: '<b>Power cycle IPCP Pro 360xi</b> if panel illuminates but shows "Disconnected". TLP reconnects automatically once IPCP finishes booting.' },
          ],
          real: [{ i: '🔧', t: 'Panel responds but room does not react: IPCP IP may have changed via DHCP. Use Extron Toolbelt on a laptop on the same switch to find IPCP current IP, then update the TLP target address.' }]
        },
        {
          id: 'd03', tier: 0, order: 3, title: 'Laptop not showing on screen', tag: 'Input', time: '~3 min',
          primary: [
            { i: '🖱️', t: '<b>Is "Laptop" selected on the TLP?</b> System always defaults to PC on startup. Plugging in a cable does not auto-switch — the source must be manually selected on TLP.' },
            { i: '💻', t: '<b>Is the laptop outputting to an external display?</b> Windows: press Win+P then Duplicate or Extend. Mac: System Preferences then Displays. The laptop may be set to internal screen only.' },
            { i: '😴', t: '<b>Is the laptop asleep or screen-locked?</b> A locked laptop transmits a black frame even when the cable is active. Unlock and wake the laptop first.' },
            { i: '🔗', t: '<b>Is the HDMI cable fully seated at the Cable Cubby?</b> This cable is yanked loose by bags and chairs daily. Push firmly into the cubby port and the laptop until the locking collar engages.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle IN1608</b> if cable is seated and source is selected but no signal. Resets HDMI negotiation on that input only.' },
          ],
          real: [{ i: '🔧', t: 'Hot-unplug and re-plug the HDMI after selecting the source — some laptops only detect external output on a physical reconnect event. Test with a known-good laptop to isolate a device-specific issue.' }]
        },
        {
          id: 'd04', tier: 0, order: 4, title: 'No audio from the room speakers', tag: 'Audio', time: '~4 min',
          primary: [
            { i: '🔈', t: '<b>Is the TLP volume slider above zero?</b> The most common audio call. Volume gets dragged to zero by previous occupants. Slide it up on TLP before touching any hardware.' },
            { i: '🔇', t: '<b>Is the PC or laptop itself muted?</b> Windows system tray speaker icon may show a red X — this is separate from TLP volume. Click the icon and unmute.' },
            { i: '💻', t: '<b>Is the laptop audio routing to the room?</b> Windows Sound Settings output device must be set to the HDMI or Extron output, not "Speakers (Laptop)". Right-click speaker icon to verify.' },
            { i: '📺', t: '<b>Does the selected source produce audio?</b> The document camera has no microphone. If Doc Camera is active there will be no audio. Switch to PC or Laptop to test speakers.' },
            { i: '🎧', t: '<b>Does the laptop have Bluetooth audio paired?</b> If AirPods or a Bluetooth speaker is paired and within range, audio silently routes there. Disable Bluetooth on the laptop.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle MPA 601 amplifier</b> (WattBox Outlet 6, wait 15s). Amplifier can enter a clipped or muted state after power fluctuations.' },
            { i: '🔄', t: '<b>Power cycle IN1608</b> if amp reboot did not help. Audio routing is handled internally and can become misconfigured after repeated source switches.' },
          ],
          real: [{ i: '🔧', t: 'Reseat the 3.5mm right-angle cable from IN1608 Audio Out to MPA 601 input — vibration works these loose over time. Also verify MPA 601 front-panel gain knob is not at minimum.' }]
        },
        {
          id: 'd05', tier: 0, order: 5, title: 'USB-C laptop not working', tag: 'Input', time: '~4 min',
          primary: [
            { i: '🖱️', t: '<b>Is "USB-C" selected on TLP?</b> It is a completely separate button from the regular "Laptop" HDMI input. The cable being plugged in does not switch the source automatically.' },
            { i: '🔗', t: '<b>Is the cable in the USB-C slot specifically?</b> Cable Cubby has adjacent HDMI and USB-C slots. Confirm the cable is in the USB-C port, not the HDMI port next to it.' },
            { i: '💻', t: '<b>Does this laptop support DisplayPort Alt Mode over USB-C?</b> MacBook, Surface Pro, and recent ThinkPads do. Many Dell and HP laptops have USB-C for charging only. Quickest diagnostic: hand them the HDMI cable.' },
            { i: '🔋', t: '<b>Is the laptop battery critically low?</b> Some laptops disable DisplayPort Alt Mode below ~10% battery. Have them plug in the charger and retry.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle USB-C HD101</b> (WattBox outlet, wait 15s). Interface can lock up after an incompatible device was connected — reboot resets USB-C Alt Mode negotiation.' },
          ],
          real: [{ i: '🔧', t: 'Check the short HDMI patch cable inside the rack from USB-C HD101 HDMI Out to IN1608 HDMI In 4. This cable is easy to dislodge during rack work and is often overlooked.' }]
        },
        {
          id: 'd06', tier: 0, order: 6, title: 'Document camera not showing', tag: 'Input', time: '~3 min',
          primary: [
            { i: '🖱️', t: '<b>Is "Doc Camera" selected on TLP?</b> Must be manually selected — same as every source.' },
            { i: '💡', t: '<b>Is the camera physically powered on?</b> QOMO QD3900H2 has a dedicated power button on the camera body. The LED ring around the lens glows white or blue when active. No glow = camera is off.' },
            { i: '📷', t: '<b>Is the arm unfolded and aimed at the desk?</b> Camera ships and is often stored folded flat. It must be physically opened and the head rotated to point downward at the document surface.' },
            { i: '🙈', t: '<b>Is the lens cap removed?</b> Some QOMO units have a sliding lens cap. A capped lens produces a uniformly black image — identical in appearance to a signal fault.' },
            { i: '📄', t: '<b>Is there something visually distinct under the camera?</b> A blank white desk under bright overhead lights can be indistinguishable from a frozen frame. Place a document with clear text under the lens as a test.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle the doc camera</b> (WattBox Outlet 7, wait 15s). QOMO cameras can lose HDMI handshake after prolonged idle — a reboot re-establishes it.' },
          ],
          real: [{ i: '🔧', t: 'Image visible but presets and zoom control unresponsive: RS-232 cable from IPCP COM 2 to camera is loose. Camera outputs HDMI video independently; serial control is a separate path.' }]
        },
        {
          id: 'd07', tier: 1, order: 7, title: 'Image is blurry, wrong resolution, or flickering', tag: 'Signal', time: '~8 min',
          primary: [
            { i: '⏳', t: '<b>Is the display still warming up?</b> Projectors need 30-60s to reach full brightness. Samsung panels take 15-20s to stabilize sharpness and resolution negotiation after power-on.' },
            { i: '📺', t: '<b>Is the display in a stretched or zoomed picture mode?</b> Samsung and projectors have Aspect Ratio / Picture Size settings. Press Menu on the display remote then Picture then Picture Size then Auto or 16:9.' },
            { i: '🔗', t: '<b>Are HDMI lock-it cables fully seated?</b> A cable 90% inserted produces exactly this — blurry image, shifted colors, or flickering. Push each cable firmly and twist the locking collar clockwise until resistance is felt.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle IN1608 switcher</b> (WattBox Outlet 4). EDID Minder re-reads every connected display native resolution on reboot. Resolves wrong-resolution output in almost every case.' },
            { i: '🔄', t: '<b>Power cycle the display or projector</b> too. Boot order matters — switcher should stabilize before the display negotiates resolution. Power IN1608 first, display second.' },
          ],
          real: [{ i: '🔧', t: 'Flickering only on DTP-connected display but instructor monitor is clean: bad punch-down at the Leviton keystone. One mis-seated wire pair causes intermittent flicker under load. Re-terminate both ends T568B with shield grounded.' }]
        },
        {
          id: 'd08', tier: 1, order: 8, title: 'Only one of the two displays is working', tag: 'Display', time: '~6 min',
          primary: [
            { i: '📺', t: '<b>Is the non-working display on the correct input?</b> Samsung should be HDMI 1. A user with the remote may have changed it — press Input on the Samsung remote, select HDMI 1.' },
            { i: '💡', t: '<b>Is the non-working display powered on?</b> Instructor monitor and Samsung are on separate WattBox outlets. If one outlet is off, one display is dead while the other works fine.' },
            { i: '🔗', t: '<b>Is the HDMI cable seated at the back of the dead display?</b> Wall-mounted Samsungs vibrate over time — check the physical HDMI connection directly at the display panel.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle DTP Rx</b> if the Samsung/projector chain is the dead one. These are fully independent outputs — Rx reboot does not affect the instructor monitor path at all.' },
            { i: '🔄', t: '<b>Power cycle IN1608</b> to reset both outputs simultaneously if both are partially affected.' },
          ],
          real: [{ i: '🔧', t: 'The two display paths are architecturally independent: IN1608 HDMI Out 1 goes to instructor monitor (direct HDMI); IN1608 DTP Out goes to Cat6 then DTP Rx then Samsung (DTP chain). Debug each path in isolation.' }]
        },
        {
          id: 'd09', tier: 1, order: 9, title: 'Audio and video are out of sync', tag: 'Audio', time: '~10 min',
          primary: [
            { i: '▶️', t: '<b>Try pausing and resuming the video.</b> Browser players accumulate AV sync drift on external displays, especially with hardware acceleration enabled. A pause/resume resyncs the decoder buffer immediately.' },
            { i: '🌐', t: '<b>Is the content streamed or local?</b> Slow network connection causes video buffering to diverge from audio. Download the file and play it locally to eliminate network as a variable.' },
            { i: '🎧', t: '<b>Is Bluetooth audio partially active?</b> A nearby paired speaker can partially intercept audio and create an audible echo with a distinct delay. Disable Bluetooth on the source laptop.' },
            { i: '📺', t: '<b>Is the display internal audio processing on?</b> Samsung TVs and projectors have audio post-processing (SRS TruSurround, Dolby, DTS) that add latency. These must be disabled on classroom displays — check Menu then Sound then Sound Mode then Standard.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle IN1608.</b> Audio delay compensation settings reload from GC configuration on reboot. A corrupted delay state can cause drift that compounds over a full class period.' },
          ],
          real: [{ i: '🔧', t: 'Persistent sync after reboot: the DTP video chain adds ~1 frame of latency but the audio path (direct 3.5mm to amp) has zero processing delay. This offset needs a few milliseconds of audio delay added in Extron PCS software — a one-time per-room fix.' }]
        },
        {
          id: 'd10', tier: 1, order: 10, title: 'System does not fully shut down', tag: 'Control', time: '~5 min',
          primary: [
            { i: '🖱️', t: '<b>Was System Off held long enough?</b> TLP requires a press-and-hold of 2-3 seconds, followed by a confirmation tap to prevent accidental shutdown. A brief tap is intentionally ignored by GC logic.' },
            { i: '🟠', t: '<b>The orange standby LED on the Samsung is normal.</b> Standby mode (orange LED) is not "on" — it is the correct resting state. The display simply mutes and enters standby. This is expected behavior.' },
            { i: '🖥️', t: '<b>Is the PC staying on intentionally?</b> Room PC may be configured to remain active for scheduled updates or remote management. This is an intentional IT policy, not a malfunction.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle IPCP Pro 360xi</b> if System Off had no effect on the display at all. IPCP may have crashed mid-macro execution. After reboot, retry System Off from TLP.' },
          ],
          real: [{ i: '🔧', t: 'Display never responds to power-off commands: RS-232 cable from IPCP COM 3 to display may be loose. IPCP sends the command; the display never receives it. Re-seat the cable and test again.' }]
        },
        {
          id: 'd11', tier: 1, order: 11, title: 'Room PC has no internet', tag: 'Network', time: '~5 min',
          primary: [
            { i: '🌐', t: '<b>Is it one site or all internet?</b> Test google.com and youtube.com independently. If those resolve, it is a specific site outage or DNS issue — not a network fault.' },
            { i: '🔌', t: '<b>Is the ethernet cable behind the PC connected?</b> Cat6 from Cisco switch to PC gets kicked loose under the desk regularly. Check the PC rear ethernet port for a blinking amber/green LED — no light = no physical link.' },
            { i: '🔁', t: '<b>Does Windows show "Connected, no internet"?</b> Right-click the network icon in the taskbar. This state means DHCP or DNS failed — the hardware link is fine. A full reboot resolves it in seconds.' },
            { i: '🌍', t: '<b>Is the outage room-specific or building-wide?</b> Test a device on the same floor. If building-wide, it is a campus IT WAN issue — escalate to networking, not AV support.' },
          ],
          power: [
            { i: '🔄', t: '<b>Full restart on the PC</b> (not sleep/wake — a real restart). Forces a fresh DHCP lease from the Cisco switch.' },
            { i: '🔄', t: '<b>Power cycle the Cisco switch</b> only if multiple devices in the room lost network simultaneously. Switch reboot triggers DHCP renewal for all connected devices.' },
          ],
          real: [{ i: '🔧', t: 'Room-only outage with Cisco switch healthy: check SFP Uplink 1 cable to building wall jack. A dislodged uplink cable cuts all internet for that room while the switch itself remains operational and PoE continues.' }]
        },
        {
          id: 'd12', tier: 1, order: 12, title: 'Intercom is offline', tag: 'Audio', time: '~4 min',
          primary: [
            { i: '🔌', t: '<b>Is the Cat6 cable to IP7 fully seated at both ends?</b> The intercom is PoE-powered from Cisco Port 6. A loose cable = no power AND no network simultaneously. The unit will be completely dark.' },
            { i: '💡', t: '<b>What do the IP7 LEDs show?</b> Completely dark = no power (cable issue). Slow blink = booting. Steady light = ready. Use the LED state to determine where in the problem the unit is.' },
          ],
          power: [
            { i: '🔄', t: '<b>Unplug and replug Cat6 from Cisco Port 6.</b> IP7 boots in ~30 seconds. An audible tone confirms it is ready to use.' },
          ],
          real: [{ i: '🔧', t: 'Powers on but unreachable from front desk: DHCP assigned a new IP address. Pull the current IP from the Cisco ARP table and update it in the intercom management system.' }]
        },
        {
          id: 'd13', tier: 1, order: 13, title: 'Wireless presentation device not pairing', tag: 'Input', time: '~8 min',
          primary: [
            { i: '📶', t: '<b>Is the wireless presenter device powered on?</b> These devices have their own power LED. Confirm it is active before anything else.' },
            { i: '🖱️', t: '<b>Is the wireless source selected on TLP?</b> Wireless presentation is a separate input — it must be selected on TLP just like any other source.' },
            { i: '💻', t: '<b>Does the laptop have the Solstice/ClickShare client installed?</b> These systems require a host app or a USB dongle. Without it, the laptop cannot initiate pairing.' },
            { i: '📡', t: '<b>Is the laptop on the same Wi-Fi network as the presenter device?</b> Mersive Solstice requires both devices on the same SSID. VPN or a different network segment will cause discovery to fail.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle the wireless presenter device.</b> These units can get stuck in a pairing handshake state — a reboot clears all active sessions and starts fresh.' },
          ],
          real: [{ i: '🔧', t: 'Device on network and app installed but still fails: check if the presenter device firmware is current. Older firmware versions have known pairing bugs with current macOS/Windows versions. Update via the admin web interface.' }]
        },
        {
          id: 'd14', tier: 1, order: 14, title: 'Zoom or Teams echo / feedback loop', tag: 'Audio', time: '~5 min',
          primary: [
            { i: '🔊', t: '<b>Are the room speakers active during the call?</b> When the room PC hosts a Zoom/Teams call, the room microphone picks up the room speakers and sends it back to remote participants as echo.' },
            { i: '🎙️', t: '<b>Which microphone is Zoom using?</b> Open Zoom audio settings during the call. If it is set to the room mic, it will pick up the speakers. Switch to a headset or the built-in laptop mic.' },
            { i: '🔇', t: '<b>Can the room speakers be muted for the call duration?</b> Drag TLP volume to zero for the call. This immediately eliminates the echo loop.' },
          ],
          power: [],
          real: [{ i: '🔧', t: 'Long-term fix: use a USB conference bar (Jabra, Poly, Yealink) with built-in echo cancellation and acoustic separation between its mic and speaker. This solves the problem at the hardware level regardless of room speaker volume.' }]
        },
        {
          id: 'd15', tier: 1, order: 15, title: 'Laptop only works when lid is open', tag: 'Input', time: '~3 min',
          primary: [
            { i: '💻', t: '<b>Is the laptop set to disable external display when lid is closed?</b> Windows: Control Panel then Power Options then "Choose what closing the lid does" then set to "Do nothing" on battery and plugged in.' },
            { i: '🍎', t: '<b>On Mac: is clamshell mode properly configured?</b> Mac requires the charger to be connected AND an external display active before it enters clamshell mode. Without charger plugged in, closing the lid always sleeps the laptop.' },
            { i: '🖱️', t: '<b>Did they close the lid before the HDMI was connected?</b> Some laptops must detect the external display while the lid is open first. Have them open the lid, reconnect HDMI, wait for the display to appear, then close the lid.' },
          ],
          power: [],
          real: [{ i: '🔧', t: 'If a specific laptop model consistently fails in closed-lid mode despite correct settings, it may have a BIOS/firmware power management bug. Check the manufacturer support site for a BIOS update addressing display output in clamshell states.' }]
        },
        {
          id: 'd16', tier: 2, order: 16, title: 'Touch panel says Disconnected', tag: 'Control', time: '~10 min',
          primary: [
            { i: '⏳', t: '<b>Did they just power the system on?</b> IPCP takes 45-60 seconds to fully load its GC configuration. TLP shows "Disconnected" for the entire boot window — this is normal. Wait a full 60 seconds before intervening.' },
            { i: '📶', t: '<b>Are both TLP and IPCP on the same network segment?</b> Both connect through the Cisco switch. If the switch lost and regained power and DHCP assigned new IPs, TLP and IPCP may be trying to reach each other at stale addresses.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle IPCP Pro 360xi first.</b> TLP automatically retries connection — no manual steps on the panel. Allow a full 60 seconds before judging the result.' },
            { i: '🔄', t: '<b>Power cycle the Cisco switch</b> if IPCP reboot did not resolve it. Forces both devices to renew DHCP and re-register on the network simultaneously.' },
          ],
          real: [{ i: '🔧', t: 'Still disconnected after both reboots: IPCP IP has changed. Use Extron Toolbelt on a laptop connected to the Cisco switch — identify IPCP new IP address, then push the corrected address into the TLP configuration via Toolbelt.' }]
        },
        {
          id: 'd17', tier: 2, order: 17, title: 'HDCP error — secure content shows black screen', tag: 'Signal', time: '~12 min',
          primary: [
            { i: '🖥️', t: '<b>Does content play on the laptop screen but go black on the room display?</b> Classic HDCP symptom. An element somewhere in the downstream display chain is not HDCP-compliant and is blocking decryption.' },
            { i: '🔗', t: '<b>Is there any non-Extron HDMI adapter, splitter, or dongle in the chain?</b> Even a single non-compliant passive adapter breaks HDCP for everything downstream. Remove all third-party adapters without exception.' },
            { i: '🌐', t: '<b>Is the content DRM-protected?</b> Netflix, Disney+, Canvas video, and Kaltura all require HDCP compliance end-to-end. Workaround: download to desktop and play in VLC — DRM is bypassed for local playback.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle the source device (PC or laptop) first.</b> HDCP authentication keys are fully refreshed on reboot — do this before touching AV hardware.' },
            { i: '🔄', t: '<b>Power cycle IN1608 switcher.</b> Key Minder resets and re-authenticates HDCP across all connected devices simultaneously on reboot.' },
          ],
          real: [{ i: '🔧', t: 'One specific display consistently fails HDCP while the other works: that display or the DTP Rx does not support HDCP 2.2. IN1608 and DTP Tx/Rx both support it — the failing link is the display panel itself. Verify spec sheet and replace if confirmed non-compliant.' }]
        },
        {
          id: 'd18', tier: 2, order: 18, title: 'Wrong source appears when input is selected', tag: 'Control', time: '~15 min',
          primary: [
            { i: '🖱️', t: '<b>Did the technician select the correct TLP button?</b> PC = room desktop, Laptop = HDMI at Cable Cubby, USB-C = USB-C port. Verify which physical device is being used and match it to the correct button.' },
            { i: '🔗', t: '<b>Is the cable plugged into the correct IN1608 input?</b> Laptop HDMI must be on IN1608 HDMI In 2. If plugged into In 1, 3, or 4 by accident, the correct TLP button will never display it.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle IN1608.</b> Reboot rescans all active inputs and clears any stuck or frozen input state from a previous session.' },
          ],
          real: [{ i: '🔧', t: 'Consistently incorrect across reboots: GC Professional configuration on IPCP needs correction. Each TLP source button sends a specific SIS command (e.g., "2!" = switch to Input 2). Open GC Pro, locate the IN1608 driver, verify each button SIS command matches the physical wiring.' }]
        },
        {
          id: 'd19', tier: 2, order: 19, title: 'DTP signal drops intermittently during class', tag: 'Signal', time: '~20 min',
          primary: [
            { i: '🔗', t: '<b>Is the Cat6 patch cord still seated at the DTP Rx end?</b> If the Rx is ceiling-mounted or near a wall-mounted display, check whether the short Cat6 patch from the Leviton keystone is still physically inserted.' },
            { i: '💡', t: '<b>What do the DTP Rx LEDs indicate?</b> Link LED off = no DTP signal arriving at the Rx — break is in the Cat6 run or at the Tx. Link LED amber but Signal LED off = DTP link healthy but no video content — source issue.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle DTP Rx first</b> — unplug and replug Cat6. Amber Link LED within 10s = link restored.' },
            { i: '🔄', t: '<b>Power cycle IN1608 / DTP Tx</b> if the Rx reboot did not restore the link. Tx resets its transmission; Rx re-locks to it.' },
          ],
          real: [{ i: '🔧', t: 'Recurring drops with no physical cause: re-terminate the Cat6 at both the Leviton keystone and the Tx/Rx RJ45 using T568B standard with the shield connected to the keystone ground tab. Also verify run length — DTP 230 has a hard 230ft limit. Exceeding it causes exactly this pattern of intermittent drops.' }]
        },
        {
          id: 'd20', tier: 2, order: 20, title: 'IN1608 or IPCP unreachable from network', tag: 'Network', time: '~20 min',
          primary: [
            { i: '📶', t: '<b>Is the device powered on?</b> Verify the WattBox outlet for both IN1608 and IPCP is active. Check front-panel LEDs — both devices show solid status LEDs when operational.' },
            { i: '🌐', t: '<b>Is a laptop on the same Cisco switch able to reach other devices?</b> If basic network connectivity is confirmed, the issue is device-specific IP configuration, not a switch or uplink problem.' },
          ],
          power: [
            { i: '🔄', t: '<b>Power cycle the specific device.</b> Both IN1608 and IPCP broadcast their IP via mDNS on boot — Extron Toolbelt will discover them automatically after reboot if they are on the same subnet.' },
          ],
          real: [{ i: '🔧', t: 'Default IPs: IN1608 = 192.168.254.254, IPCP = 192.168.254.254 (different units). If DHCP changed them, connect a laptop directly to the Cisco switch and run Toolbelt to discover current IPs. For IN1608 specifically, front-panel USB mini-B port allows direct configuration access bypassing the network entirely.' }]
        },
        {
          id: 'd21', tier: 2, order: 21, title: 'Full system dead — nothing responds at all', tag: 'System', time: '~10 min',
          primary: [
            { i: '🔌', t: '<b>Is the wall outlet live?</b> Test the outlet the WattBox IEC cord is in with a phone charger. The outlet may be switched off at a wall switch, GFCI-tripped, or on a building circuit breaker that has tripped. This is the single most common cause of a complete room blackout.' },
            { i: '⚡', t: '<b>Has the WattBox 15A breaker tripped?</b> Look at the physical WattBox unit — the breaker button will be slightly raised if it has tripped. Press it firmly back in. Trips after power surges or brief overload conditions.' },
            { i: '🖱️', t: '<b>Is this a fresh start that just needs System On?</b> If WattBox is confirmed powered and outlets are active, the room may simply need System On pressed on TLP. But if TLP is also dark, WattBox lost power — go back to the outlet.' },
            { i: '🌙', t: '<b>Is there a scheduled overnight power-off active?</b> Some IPCP configurations automatically shut all WattBox outlets off at midnight and restore them at a scheduled morning time. Early classes starting before the restore window find everything dead. Check WattBox outlet schedules via the web interface.' },
          ],
          power: [
            { i: '🔄', t: '<b>Press the physical button on WattBox</b> to manually force all outlets on (hold 3 seconds). All devices begin booting within 30s — Cisco switch LEDs sequence first, then other devices follow.' },
            { i: '🔄', t: '<b>If outlets are confirmed on but devices are unresponsive:</b> power cycle Cisco switch first (everything PoE-dependent stops without it), wait 60s for switch to fully come up, then assess remaining devices.' },
          ],
          real: [{ i: '🔧', t: 'WattBox itself will not power on and outlet is confirmed live: internal fuse may have blown. This requires a replacement unit. As a temporary bypass, connect individual devices directly to wall outlets using spare power strips — this restores partial function while awaiting a replacement.' }]
        },
      ];
      renderIssues();
    }

    // ── INIT ──────────────────────────────────────────────────────────────────────
    renderFilters();
    renderDevices();
    loadDemoData(); // Load local data immediately
