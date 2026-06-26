"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const crypto_1 = require("crypto");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const consultRequests = new Map();
const consultLogPath = path_1.default.join(__dirname, 'consults.csv');
const app = (0, express_1.default)();
const configuredClientOrigins = (process.env.CLIENT_ORIGINS
    ?? process.env.CLIENT_ORIGIN
    ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
app.use((0, cors_1.default)({
    origin: configuredClientOrigins,
}));
app.use(express_1.default.json());
const priorityTierLabels = [
    'Designated Consulter',
    'High',
    'Normal',
    'Low',
    'Do Not Disturb',
];
function escapeCsvValue(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
function ensureConsultLogExists() {
    if (!fs_1.default.existsSync(consultLogPath)) {
        fs_1.default.writeFileSync(consultLogPath, 'id,state,requester socket id,requester handle,requester location x,requester location y,giver socket id,giver handle,topic,start time,end time,attempted analyst count,attempted socket ids\n', 'utf8');
    }
}
function logCompletedConsult(request) {
    ensureConsultLogExists();
    const row = [
        request.id,
        request.state,
        request.requesterSocketId,
        request.requesterHandle,
        request.requesterLocX === null ? null : String(request.requesterLocX),
        request.requesterLocY === null ? null : String(request.requesterLocY),
        request.requesterWfhSelected,
        request.giverSocketId,
        request.giverHandle,
        request.topic,
        request.startedAt,
        request.completedAt,
        String(request.attemptedSocketIds.size),
        Array.from(request.attemptedSocketIds).join(';'),
    ].map(escapeCsvValue).join(',');
    fs_1.default.appendFileSync(consultLogPath, `${row}\n`, 'utf8');
}
function getDashboardStatus() {
    const allAnalysts = onlineAnalysts.flat();
    const busyAnalysts = allAnalysts.filter((analyst) => analyst.busy).length;
    const consults = Array.from(consultRequests.values());
    return {
        summary: {
            totalAnalysts: allAnalysts.length,
            availableAnalysts: allAnalysts.length - busyAnalysts,
            busyAnalysts,
            activeConsults: consults.length,
            requestedConsults: consults.filter((request) => request.state === 'requested').length,
            ongoingConsults: consults.filter((request) => request.state === 'ongoing').length,
        },
        analystsByTier: onlineAnalysts.map((analysts, index) => ({
            tier: index,
            label: priorityTierLabels[index],
            analysts: analysts.map((analyst) => ({
                socketId: analyst.socketId,
                handle: analyst.handle,
                name: analyst.name,
                pronouns: analyst.pronouns,
                priority: analyst.priority,
                busy: analyst.busy,
                deskLocation: analyst.deskLocation,
            })),
        })),
        consults: consults.map((request) => ({
            id: request.id,
            state: request.state,
            requesterSocketId: request.requesterSocketId,
            requesterHandle: request.requesterHandle,
            requesterName: request.requesterName,
            requesterPronouns: request.requesterPronouns,
            requesterLocation: {
                x: request.requesterLocX,
                y: request.requesterLocY,
            },
            requesterWfhSelected: request.requesterWfhSelected,
            topic: request.topic,
            currentCandidateSocketId: request.currentCandidateSocketId,
            giverSocketId: request.giverSocketId,
            giverHandle: request.giverHandle,
            startedAt: request.startedAt,
            completedAt: request.completedAt,
            attemptedCount: request.attemptedSocketIds.size,
        })),
    };
}
app.get('/api/status', (_req, res) => {
    res.json(getDashboardStatus());
});
app.get('/', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Consult Tool Dashboard</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Roboto, Arial, sans-serif;
        background: #202020;
        color: #f7f7f7;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgb(139 30 30 / 20%), transparent 32rem),
          linear-gradient(180deg, #2f2f2f 0%, #202020 100%);
      }

      header {
        padding: 1.5rem 2rem;
        border-bottom: 1px solid rgb(255 255 255 / 12%);
        background-color: rgb(24 24 24 / 88%);
        position: sticky;
        top: 0;
        z-index: 2;
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      h1 {
        font-size: 1.75rem;
      }

      main {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 420px;
        gap: 1rem;
        padding: 1rem;
        align-items: start;
      }

      section {
        border: 1px solid rgb(255 255 255 / 10%);
        border-radius: 6px;
        background-color: rgb(255 255 255 / 7%);
        padding: 1rem;
      }

      .tiers {
        display: grid;
        grid-template-columns: repeat(5, minmax(220px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
        overflow-x: auto;
        padding-bottom: 0.25rem;
      }

      .tier,
      .consult {
        border: 1px solid rgb(255 255 255 / 10%);
        border-radius: 6px;
        background: rgb(0 0 0 / 18%);
        padding: 0.875rem;
      }

      .tier {
        max-height: calc(100vh - 260px);
        min-height: 220px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .tier h3 {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.75rem;
        font-size: 1rem;
        position: sticky;
        top: 0;
        background: #252525;
        z-index: 1;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgb(255 255 255 / 10%);
      }

      .analyst-list {
        overflow-y: auto;
        padding-right: 0.25rem;
      }

      .analyst {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 0.25rem 0.5rem;
        align-items: center;
        padding: 0.5rem 0;
        border-top: 1px solid rgb(255 255 255 / 10%);
        font-size: 0.9rem;
      }

      .analyst strong,
      .analyst .muted {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .muted {
        color: #bdbdbd;
        font-size: 0.875rem;
      }

      .pill {
        display: inline-flex;
        width: fit-content;
        padding: 0.2rem 0.5rem;
        border-radius: 999px;
        background: rgb(255 255 255 / 12%);
        font-size: 0.8rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .summary {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1rem;
      }

      .summary-card {
        display: grid;
        gap: 0.15rem;
        min-width: 120px;
        padding: 0.75rem;
        border: 1px solid rgb(255 255 255 / 10%);
        border-radius: 6px;
        background: rgb(255 255 255 / 7%);
      }

      .summary-card strong {
        font-size: 1.35rem;
      }

      .busy {
        background: #8b1e1e;
      }

      .available {
        background: #2f855a;
      }

      .consults {
        display: grid;
        gap: 0.75rem;
        margin-top: 1rem;
        max-height: calc(100vh - 220px);
        overflow-y: auto;
        padding-right: 0.25rem;
      }

      @media (max-width: 1200px) {
        main {
          grid-template-columns: 1fr;
        }

        .tier {
          max-height: 420px;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Consult Tool Dashboard</h1>
      <p class="muted">Updates every 2 seconds</p>
      <div id="summary" class="summary"></div>
    </header>
    <main>
      <section>
        <h2>Online Analysts</h2>
        <div id="tiers" class="tiers"></div>
      </section>
      <section>
        <h2>Active Consults</h2>
        <div id="consults" class="consults"></div>
      </section>
    </main>
    <script>
      const tiersEl = document.getElementById('tiers')
      const consultsEl = document.getElementById('consults')
      const summaryEl = document.getElementById('summary')

      function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        })[char])
      }

      function renderAnalyst(analyst) {
        const statusClass = analyst.busy ? 'busy' : 'available'
        const statusText = analyst.busy ? 'Busy' : 'Available'

        return \`
          <div class="analyst">
            <strong title="\${escapeHtml(analyst.name || analyst.handle)}">\${escapeHtml(analyst.name || analyst.handle)}</strong>
            <span class="pill \${statusClass}">\${statusText}</span>
            <span class="muted" title="@\${escapeHtml(analyst.handle)} \${escapeHtml(analyst.pronouns)}">@\${escapeHtml(analyst.handle)} \${escapeHtml(analyst.pronouns)}</span>
          </div>
        \`
      }

      function renderConsult(consult) {
        return \`
          <div class="consult">
            <strong>\${escapeHtml(consult.topic)}</strong>
            <p class="muted">State: \${escapeHtml(consult.state)}</p>
            <p class="muted">Requester: \${escapeHtml(consult.requesterName)}</p>
            <p class="muted">Candidate socket: \${escapeHtml(consult.currentCandidateSocketId ?? 'none')}</p>
            <p class="muted">Giver socket: \${escapeHtml(consult.giverSocketId ?? 'none')}</p>
            <p class="muted">Attempted analysts: \${escapeHtml(consult.attemptedCount)}</p>
            <p class="muted">Started: \${consult.startedAt ? new Date(consult.startedAt).toLocaleTimeString() : 'not started'}</p>
          </div>
        \`
      }

      async function refresh() {
        const response = await fetch('/api/status')
        const status = await response.json()

        summaryEl.innerHTML = \`
          <div class="summary-card"><strong>\${status.summary.totalAnalysts}</strong><span class="muted">Analysts</span></div>
          <div class="summary-card"><strong>\${status.summary.availableAnalysts}</strong><span class="muted">Available</span></div>
          <div class="summary-card"><strong>\${status.summary.busyAnalysts}</strong><span class="muted">Busy</span></div>
          <div class="summary-card"><strong>\${status.summary.activeConsults}</strong><span class="muted">Active consults</span></div>
          <div class="summary-card"><strong>\${status.summary.requestedConsults}</strong><span class="muted">Requested</span></div>
          <div class="summary-card"><strong>\${status.summary.ongoingConsults}</strong><span class="muted">Ongoing</span></div>
        \`

        tiersEl.innerHTML = status.analystsByTier.map((tier) => \`
          <article class="tier">
            <h3>
              <span>\${escapeHtml(tier.label)}</span>
              <span class="muted">\${tier.analysts.length}</span>
            </h3>
            <div class="analyst-list">
              \${tier.analysts.length ? tier.analysts.map(renderAnalyst).join('') : '<p class="muted">No analysts</p>'}
            </div>
          </article>
        \`).join('')

        consultsEl.innerHTML = status.consults.length
          ? status.consults.map(renderConsult).join('')
          : '<p class="muted">No active consults</p>'
      }

      refresh()
      setInterval(refresh, 2000)
    </script>
  </body>
</html>`);
});
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: configuredClientOrigins,
        methods: ['GET', 'POST'],
    },
});
const onlineAnalysts = [[], [], [], [], []];
const CONSULT_COOLDOWN_ENABLED = false;
const CONSULT_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_CONSULT_DURATION_MS = 30 * 60 * 1000;
const RECONNECT_GRACE_MS = 5000;
const MAX_CONSECUTIVE_MISSED_CONSULTS = 3;
const pendingDisconnects = new Map();
const missedConsultCounts = new Map();
function getPriorityTier(priority) {
    return priority >= 0 && priority <= 4 ? priority : 2;
}
function removeAnalyst(socketId) {
    for (const priorityTier of onlineAnalysts) {
        const analystIndex = priorityTier.findIndex((analyst) => analyst.socketId === socketId);
        if (analystIndex !== -1) {
            return priorityTier.splice(analystIndex, 1)[0];
        }
    }
    return null;
}
function addAnalyst(analyst) {
    const priorityTier = getPriorityTier(analyst.priority);
    onlineAnalysts[priorityTier].push({
        ...analyst,
        priority: priorityTier,
    });
}
function forceAnalystDoNotDisturb(analyst) {
    removeAnalyst(analyst.socketId);
    addAnalyst({
        ...analyst,
        priority: 4,
        busy: false,
    });
    io.to(analyst.socketId).emit('analyst-priority-forced', {
        priority: 4,
        reason: 'missed-consults',
        missedConsultCount: MAX_CONSECUTIVE_MISSED_CONSULTS,
    });
}
function setAnalystBusy(socketId, busy) {
    const analyst = findAnalyst(socketId);
    if (analyst) {
        analyst.busy = busy;
    }
}
function startAnalystCooldown(socketId) {
    const analyst = findAnalyst(socketId);
    if (!analyst) {
        return;
    }
    if (!CONSULT_COOLDOWN_ENABLED) {
        analyst.busy = false;
        return;
    }
    analyst.busy = true;
    if (analyst.cooldownTimeout) {
        clearTimeout(analyst.cooldownTimeout);
    }
    analyst.cooldownTimeout = setTimeout(() => {
        const cooledAnalyst = findAnalyst(socketId);
        if (cooledAnalyst) {
            cooledAnalyst.busy = false;
            cooledAnalyst.cooldownTimeout = null;
        }
        console.log('Online analysts:', onlineAnalysts);
    }, CONSULT_COOLDOWN_MS);
}
function findAnalyst(socketId) {
    for (const priorityTier of onlineAnalysts) {
        const analyst = priorityTier.find((onlineAnalyst) => onlineAnalyst.socketId === socketId);
        if (analyst) {
            return analyst;
        }
    }
    return null;
}
function findAnalystByHandle(handle) {
    for (const priorityTier of onlineAnalysts) {
        const analyst = priorityTier.find((onlineAnalyst) => onlineAnalyst.handle === handle);
        if (analyst) {
            return analyst;
        }
    }
    return null;
}
function removeAnalystByHandle(handle) {
    for (const priorityTier of onlineAnalysts) {
        const analystIndex = priorityTier.findIndex((analyst) => analyst.handle === handle);
        if (analystIndex !== -1) {
            return priorityTier.splice(analystIndex, 1)[0];
        }
    }
    return null;
}
function restoreConsultState(handle, previousSocketId, newSocketId) {
    for (const request of consultRequests.values()) {
        if (request.requesterHandle === handle) {
            request.requesterSocketId = newSocketId;
            if (request.state === 'requested') {
                io.to(newSocketId).emit('consult-request-status', {
                    status: 'requested',
                    requestId: request.id,
                });
            }
            if (request.state === 'ongoing' && request.startedAt) {
                const giver = request.giverHandle ? findAnalystByHandle(request.giverHandle) : null;
                if (giver) {
                    io.to(newSocketId).emit('consult-request-status', {
                        status: 'ongoing',
                        requestId: request.id,
                        topic: request.topic,
                        startedAt: request.startedAt,
                        analyst: giver,
                    });
                }
            }
        }
        if (request.giverHandle === handle && request.state === 'ongoing' && request.startedAt) {
            request.giverSocketId = newSocketId;
            request.currentCandidateSocketId = newSocketId;
            io.to(newSocketId).emit('consult-giver-state', {
                status: 'ongoing',
                requestId: request.id,
                requesterName: request.requesterName,
                requesterPronouns: request.requesterPronouns,
                requesterLocX: request.requesterLocX,
                requesterLocY: request.requesterLocY,
                requesterWfhSelected: request.requesterWfhSelected,
                topic: request.topic,
                startedAt: request.startedAt,
            });
        }
        else if (request.currentCandidateSocketId === previousSocketId && request.state === 'requested') {
            request.currentCandidateSocketId = newSocketId;
        }
    }
}
function stopConsultRequest(request) {
    if (request.timeout) {
        clearTimeout(request.timeout);
    }
    if (request.consultTimeout) {
        clearTimeout(request.consultTimeout);
    }
    setAnalystBusy(request.requesterSocketId, false);
    if (request.state === 'requested' && request.currentCandidateSocketId) {
        setAnalystBusy(request.currentCandidateSocketId, false);
    }
    consultRequests.delete(request.id);
}
function completeConsult(request) {
    if (request.state === 'completed') {
        return;
    }
    request.state = 'completed';
    request.completedAt = new Date().toISOString();
    logCompletedConsult(request);
    if (request.timeout) {
        clearTimeout(request.timeout);
        request.timeout = null;
    }
    if (request.consultTimeout) {
        clearTimeout(request.consultTimeout);
        request.consultTimeout = null;
    }
    if (request.giverSocketId) {
        startAnalystCooldown(request.giverSocketId);
        io.to(request.giverSocketId).emit('consult-giver-state', {
            status: 'completed',
            requestId: request.id,
        });
    }
    setAnalystBusy(request.requesterSocketId, false);
    io.to(request.requesterSocketId).emit('consult-request-status', {
        status: 'completed',
        requestId: request.id,
        completedAt: request.completedAt,
    });
    consultRequests.delete(request.id);
}
// Consult Ping Functions
function selectNextAnalyst(request) {
    for (const tier of onlineAnalysts.slice(0, 4)) {
        const available = tier.filter((analyst) => {
            return analyst.socketId !== request.requesterSocketId
                && !analyst.busy
                && !request.attemptedSocketIds.has(analyst.socketId);
        });
        if (available.length > 0) {
            const index = Math.floor(Math.random() * available.length);
            return available[index];
        }
    }
    return null;
}
function offerConsultRequest(request) {
    request.state = 'requested';
    const selected = selectNextAnalyst(request);
    if (!selected) {
        io.to(request.requesterSocketId).emit('consult-request-status', { status: 'no-available' });
        stopConsultRequest(request);
        return;
    }
    request.currentCandidateSocketId = selected.socketId;
    request.attemptedSocketIds.add(selected.socketId);
    setAnalystBusy(selected.socketId, true);
    io.to(selected.socketId).emit('consult-requested', {
        requestId: request.id,
        requesterName: request.requesterName,
        requesterPronouns: request.requesterPronouns,
        requesterLocX: request.requesterLocX,
        requesterLocY: request.requesterLocY,
        requesterWfhSelected: request.requesterWfhSelected,
        topic: request.topic
    });
    request.timeout = setTimeout(() => {
        const missedCount = (missedConsultCounts.get(selected.handle) ?? 0) + 1;
        missedConsultCounts.set(selected.handle, missedCount);
        if (missedCount >= MAX_CONSECUTIVE_MISSED_CONSULTS) {
            forceAnalystDoNotDisturb(selected);
        }
        else {
            setAnalystBusy(selected.socketId, false);
        }
        io.to(selected.socketId).emit('consult-request-expired', {
            requestId: request.id
        });
        offerConsultRequest(request);
    }, 20000);
}
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.on('register-analyst', (analystInfo) => {
        const existingAnalyst = removeAnalyst(socket.id);
        const existingAnalystByHandle = removeAnalystByHandle(analystInfo.handle);
        const pendingDisconnect = pendingDisconnects.get(analystInfo.handle);
        if (pendingDisconnect) {
            clearTimeout(pendingDisconnect.timeout);
            pendingDisconnects.delete(analystInfo.handle);
        }
        const previousAnalyst = existingAnalyst ?? existingAnalystByHandle ?? pendingDisconnect?.analyst;
        addAnalyst({
            socketId: socket.id,
            busy: previousAnalyst?.busy ?? false,
            cooldownTimeout: previousAnalyst?.cooldownTimeout ?? null,
            ...analystInfo,
        });
        if (previousAnalyst && previousAnalyst.socketId !== socket.id) {
            restoreConsultState(analystInfo.handle, previousAnalyst.socketId, socket.id);
        }
        console.log('Online analysts:', onlineAnalysts);
    });
    socket.on('update-analyst-priority', ({ handle, priority }) => {
        const analyst = removeAnalyst(socket.id);
        if (analyst) {
            missedConsultCounts.set(handle, 0);
            addAnalyst({
                ...analyst,
                handle,
                priority,
            });
        }
        console.log('Online analysts:', onlineAnalysts);
    });
    socket.on('disconnect', () => {
        const disconnectedAnalyst = removeAnalyst(socket.id);
        if (!disconnectedAnalyst) {
            return;
        }
        const existingPendingDisconnect = pendingDisconnects.get(disconnectedAnalyst.handle);
        if (existingPendingDisconnect) {
            clearTimeout(existingPendingDisconnect.timeout);
        }
        const timeout = setTimeout(() => {
            pendingDisconnects.delete(disconnectedAnalyst.handle);
            if (disconnectedAnalyst.cooldownTimeout) {
                clearTimeout(disconnectedAnalyst.cooldownTimeout);
            }
            for (const request of Array.from(consultRequests.values())) {
                if (request.requesterSocketId === socket.id) {
                    if (request.state === 'ongoing') {
                        completeConsult(request);
                    }
                    else {
                        stopConsultRequest(request);
                    }
                }
                else if (request.currentCandidateSocketId === socket.id) {
                    if (request.timeout) {
                        clearTimeout(request.timeout);
                        request.timeout = null;
                    }
                    if (request.state === 'requested') {
                        offerConsultRequest(request);
                    }
                    else {
                        completeConsult(request);
                    }
                }
            }
            console.log(`User disconnected: ${socket.id}`);
            console.log('Online analysts:', onlineAnalysts);
        }, RECONNECT_GRACE_MS);
        pendingDisconnects.set(disconnectedAnalyst.handle, {
            analyst: disconnectedAnalyst,
            timeout,
        });
    });
    socket.on('request-consult', ({ requesterName, requesterHandle, requesterPronouns, requesterLocX, requesterLocY, requesterWfhSelected, topic }) => {
        //When the client calls a consult request, create the consult object and begin searching for the consult giver.
        const request = {
            id: (0, crypto_1.randomUUID)(),
            state: 'requested',
            requesterSocketId: socket.id,
            requesterHandle,
            requesterName,
            requesterPronouns,
            requesterLocX,
            requesterLocY,
            requesterWfhSelected,
            topic,
            attemptedSocketIds: new Set(),
            currentCandidateSocketId: null,
            giverSocketId: null,
            giverHandle: null,
            startedAt: null,
            completedAt: null,
            timeout: null,
            consultTimeout: null
        };
        consultRequests.set(request.id, request);
        setAnalystBusy(socket.id, true);
        io.to(socket.id).emit('consult-request-status', {
            status: 'requested',
            requestId: request.id,
        });
        offerConsultRequest(request);
    });
    socket.on('respond-to-consult-request', ({ requestId, accepted }) => {
        const request = consultRequests.get(requestId);
        const respondingAnalyst = findAnalyst(socket.id);
        if (!request || request.currentCandidateSocketId !== socket.id) {
            return;
        }
        if (respondingAnalyst) {
            missedConsultCounts.set(respondingAnalyst.handle, 0);
        }
        if (request.timeout) {
            clearTimeout(request.timeout);
            request.timeout = null;
        }
        if (!accepted) {
            setAnalystBusy(socket.id, false);
            offerConsultRequest(request);
            return;
        }
        const analyst = findAnalyst(socket.id);
        if (!analyst) {
            offerConsultRequest(request);
            return;
        }
        request.state = 'ongoing';
        request.giverSocketId = socket.id;
        request.giverHandle = analyst.handle;
        request.startedAt = new Date().toISOString();
        request.consultTimeout = setTimeout(() => {
            completeConsult(request);
        }, MAX_CONSULT_DURATION_MS);
        io.to(request.requesterSocketId).emit('consult-request-status', {
            status: 'ongoing',
            requestId: request.id,
            topic: request.topic,
            startedAt: request.startedAt,
            analyst,
        });
        io.to(socket.id).emit('consult-giver-state', {
            status: 'ongoing',
            requestId: request.id,
            requesterName: request.requesterName,
            requesterPronouns: request.requesterPronouns,
            requesterLocX: request.requesterLocX,
            requesterLocY: request.requesterLocY,
            requesterWfhSelected: request.requesterWfhSelected,
            topic: request.topic,
            startedAt: request.startedAt,
        });
    });
    socket.on('complete-consult', ({ requestId }) => {
        const request = consultRequests.get(requestId);
        if (!request || request.state !== 'ongoing') {
            return;
        }
        if (request.requesterSocketId !== socket.id && request.giverSocketId !== socket.id) {
            return;
        }
        completeConsult(request);
    });
});
const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Allowed client origins: ${configuredClientOrigins.join(', ')}`);
});
