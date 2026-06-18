<template>
  <div class="homepage">
    <header class="header">
      <h1>Consult Assistance Tool (CAT)</h1>
      <button class="settings-button" type="button" @click="emit('openSettings')">
        Settings
      </button>
      <button class="map-button" type="button" @click="isMapDialogOpen = true">
        Floor Map
      </button>
    </header>

    <section class="greeting-panel">
      <h2>{{ greeting }}, {{ name }}</h2>
      <p v-if="!isServerConnected" class="server-error">
        Error Connecting to Consult Tool Server
      </p>
      <p>{{ readinessMessage }}</p>
    </section>

    <main class="home-actions">
      <button
        v-if="givenConsultStatus.status !== 'ongoing'"
        class="request-ping-button"
        type="button"
        @click="openRequestDialog"
      >
        Request Consult
      </button>

      <p v-if="consultRequestStatus.status === 'requested'" class="request-status">
        Searching for an available consulter...
      </p>
      <p v-else-if="consultRequestStatus.status === 'no-available'" class="request-status">
        No available consulters
      </p>
      <div v-else-if="consultRequestStatus.status === 'ongoing'" class="consult-state-panel">
        <p>
          {{ consultRequestStatus.analyst.name }} has accepted your consult request, consult started at {{ formatTime(consultRequestStatus.startedAt) }}.
        </p>
        <button type="button" @click="emit('completeConsult', consultRequestStatus.requestId)">
          Complete Consult
        </button>
      </div>
      <p v-else-if="consultRequestStatus.status === 'completed'" class="request-status">
        Consult Complete at {{ formatTime(consultRequestStatus.completedAt) }}.
      </p>

      <section v-if="givenConsultStatus.status === 'ongoing'" class="consult-state-panel">
        <h2>Current Giving Consult:</h2>
        <h3>{{ givenConsultStatus.requesterName }} <span v-if="givenConsultStatus.requesterPronouns">({{ givenConsultStatus.requesterPronouns }})</span></h3>
        <h3>{{ givenConsultStatus.topic }} Consult</h3>
        <div
          v-if="givenConsultStatus.requesterLocX != null && givenConsultStatus.requesterLocY != null"
          class="giver-map-wrapper"
        >
          <img
            src="../assets/MapPlaceholder.png"
            alt="Requester floor location"
            class="giver-map"
          />
          <div
            class="giver-map-marker"
            :style="{
              left: `${givenConsultStatus.requesterLocX * 100}%`,
              top: `${givenConsultStatus.requesterLocY * 100}%`,
            }"
          >
            &#127919;
          </div>
        </div>
        <p v-else>Requester location unavailable.</p>
        <button type="button" @click="emit('completeConsult', givenConsultStatus.requestId)">
          Mark Consult as Completed
        </button>
      </section>
    </main>

    <section class="controls-panel">
      <label class="priority-select">
        <span>Analyst Consult Priority</span>
        <span id="flavor-text">The higher priority, the earlier the algorithm will select you for a consult request.</span>
        <select :value="priority" @change="handlePriorityChange">
          <option
            v-for="option in priorityOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <span v-if="priorityNotice" class="priority-notice">{{ priorityNotice }}</span>
      </label>
    </section>

    <div v-if="isRequestDialogOpen" class="modal-backdrop">
      <section class="request-dialog" aria-modal="true" role="dialog">
        <h2>Request Ping</h2>
        <label>
          <span>Consult Topic</span>
          <input
            v-model="selectedTopic"
            type="text"
            placeholder="Enter consult topic"
          />
        </label>
        <div class="dialog-actions">
          <button type="button" @click="isRequestDialogOpen = false">Cancel</button>
          <button type="button" @click="submitRequestPing">Submit Consult Request</button>
        </div>
      </section>
    </div>

    <div v-if="isMapDialogOpen" class="modal-backdrop">
      <section class="map-dialog" aria-modal="true" role="dialog">
        <div class="map-dialog-header">
          <h2>Floor Map</h2>
          <button type="button" @click="isMapDialogOpen = false">Close</button>
        </div>
        <img
          src="../assets/MapPlaceholder.png"
          alt="Consult floor map"
          class="consult-map"
        />
      </section>
    </div>

    <section v-if="incomingConsultRequest" class="consult-notification">
      <div class="notification-copy">
        <p>
          {{ incomingConsultRequest.requesterName }} has requested a consult on {{ incomingConsultRequest.topic }}.
        </p>
        <p>Request Expires in {{ requestExpiresIn }} seconds.</p>
      </div>

      <div class="notification-actions">
        <button @click="emit('consultResponse', incomingConsultRequest.requestId, true)">Accept</button>
        <button @click="emit('consultResponse', incomingConsultRequest.requestId, false)">Decline</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  name: string
  handle: string
  priority: number
  priorityNotice: string
  isServerConnected: boolean
  incomingConsultRequest: {
    requestId: string
    requesterName: string
    requesterLocX?: number | null
    requesterLocY?: number | null
    topic: string
  } | null
  consultRequestStatus:
    | { status: 'idle' }
    | { status: 'requested'; requestId?: string }
    | { status: 'no-available' }
    | {
      status: 'ongoing'
      requestId: string
      topic: string
      startedAt: string
      analyst: {
        name: string
      }
    }
    | { status: 'completed'; requestId: string; completedAt: string }
  givenConsultStatus:
    | { status: 'idle' }
    | {
      status: 'ongoing'
      requestId: string
      requesterName: string
      requesterPronouns: string
      requesterLocX?: number | null
      requesterLocY?: number | null
      topic: string
      startedAt: string
    }
    | { status: 'completed'; requestId: string }
}>()

const emit = defineEmits<{
  priorityChanged: [priority: number]
  openSettings: []
  requestPing: [topic: string]
  consultResponse: [requestId: string, accepted: boolean]
  clearConsultRequestStatus: []
  completeConsult: [requestId: string]
}>()

const priorityOptions = [
  { label: 'Designated Consulter', value: 0 },
  { label: 'High', value: 1 },
  { label: 'Normal', value: 2 },
  { label: 'Low', value: 3 },
  { label: 'Do Not Disturb', value: 4 },
]

const selectedTopic = ref('')
const isRequestDialogOpen = ref(false)
const isMapDialogOpen = ref(false)
const requestExpiresIn = ref(20)
let requestCountdown: ReturnType<typeof setInterval> | null = null

const greeting = computed(() => {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Good Morning'
  }

  if (hour < 18) {
    return 'Good Afternoon'
  }

  return 'Good Evening'
})

const readinessMessage = computed(() => {
  if (props.givenConsultStatus.status === 'ongoing') {
    return 'Currently giving consult'
  }

  if (props.consultRequestStatus.status === 'ongoing') {
    return 'Currently receiving consult'
  }

  if (props.priority === 4) {
    return 'Ready to request consult'
  }

  return 'Ready to give and receive consult'
})

function submitRequestPing() {
  const topic = selectedTopic.value.trim()

  if (!topic) {
    return
  }

  emit('requestPing', topic)
  isRequestDialogOpen.value = false
}

function openRequestDialog() {
  emit('clearConsultRequestStatus')
  selectedTopic.value = ''
  isRequestDialogOpen.value = true
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function stopRequestCountdown() {
  if (requestCountdown) {
    clearInterval(requestCountdown)
    requestCountdown = null
  }
}

watch(
  () => props.incomingConsultRequest?.requestId,
  (requestId) => {
    stopRequestCountdown()
    requestExpiresIn.value = 20

    if (!requestId) {
      return
    }

    requestCountdown = setInterval(() => {
      requestExpiresIn.value = Math.max(requestExpiresIn.value - 1, 0)

      if (requestExpiresIn.value === 0) {
        stopRequestCountdown()
      }
    }, 1000)
  },
)

onUnmounted(() => {
  stopRequestCountdown()
})


function handlePriorityChange(event: Event) {
  const select = event.target as HTMLSelectElement

  emit('priorityChanged', Number(select.value))
}

</script>

<style scoped>
.homepage {
  width: 100%;
  min-height: 100vh;
  font-family: Roboto, Arial, sans-serif;
  color: #f7f7f7;
  background:
    radial-gradient(circle at top left, rgb(139 30 30 / 20%), transparent 32rem),
    linear-gradient(180deg, #2f2f2f 0%, #202020 100%);
}

.header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 84px;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid rgb(255 255 255 / 12%);
  background-color: rgb(24 24 24 / 88%);
  box-shadow: 0 10px 30px rgb(0 0 0 / 20%);
}

.header h1 {
  margin: 0;
  font-size: 1.65rem;
  color: #ffffff;
  font-weight: 700;
}

.settings-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.625rem 1rem;
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 4px;
  background-color: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
}

.settings-button:hover {
  background-color: #ffffff;
  color: #353535;
}

.map-button {
  position: absolute;
  top: 4rem;
  right: 1rem;
  padding: 0.625rem 1rem;
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 4px;
  background-color: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
}

.map-button:hover {
  background-color: #ffffff;
  color: #353535;
}

.greeting-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem 1rem 1rem;
  text-align: center;
}

.greeting-panel h2 {
  margin-bottom: 50px;
  font-size: clamp(2rem, 6vw, 3.75rem);
  font-weight: 500;
}

.greeting-panel p {
  margin: 0;
  padding: 0.625rem 1rem;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 999px;
  background-color: rgb(255 255 255 / 8%);
  color: #ececec;
  font-size: 1.15rem;
  font-weight: 500;
}

.greeting-panel .server-error {
  border-color: rgb(255 120 120 / 45%);
  background-color: rgb(139 30 30 / 30%);
  color: #ffffff;
  font-weight: 700;
}

.home-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  margin: 3.5rem 0 2rem;
  padding: 0 1rem;
}

.request-ping-button {
  min-width: 280px;
  padding: 1.75rem 3.25rem;
  border: none;
  border-radius: 6px;
  background-color: #8b1e1e;
  color: #fff;
  cursor: pointer;
  font-size: 2.1rem;
  font-weight: 700;
  box-shadow: 0 14px 30px rgb(0 0 0 / 28%);
  transition: transform 140ms ease, background-color 140ms ease, box-shadow 140ms ease;
}

.request-ping-button:hover {
  background-color: #671616;
  box-shadow: 0 18px 36px rgb(0 0 0 / 34%);
  transform: translateY(-1px);
}

.request-status {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  background-color: rgb(255 255 255 / 10%);
  font-size: 1.125rem;
  font-weight: 600;
}

.consult-state-panel {
  width: min(760px, calc(100vw - 2rem));
  padding: 1.25rem;
  border-left: 6px solid #8b1e1e;
  border-radius: 6px;
  background-color: rgb(68 68 68 / 94%);
  box-shadow: 0 10px 32px rgb(0 0 0 / 20%);
}

.consult-state-panel p {
  margin: 0 0 0.75rem;
  font-size: 1.125rem;
}

.consult-state-panel button {
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #353535;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
}

.consult-state-panel button:hover {
  background-color: #1f1f1f;
}

.giver-map-wrapper {
  position: relative;
  margin: 1rem 0;
  width: 100%;
  overflow: hidden;
  border: 1px solid #777;
  border-radius: 4px;
  background-color: #fff;
}

.giver-map {
  display: block;
  width: 100%;
  height: auto;
}

.giver-map-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 2.5rem;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgb(0 0 0 / 65%));
  pointer-events: none;
}

.controls-panel {
  display: flex;
  justify-content: center;
  padding: 0 1rem 4rem;
}

.priority-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(360px, calc(100vw - 2rem));
  padding: 1rem;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 6px;
  background-color: rgb(255 255 255 / 7%);
}

#flavor-text{
  font-weight: lighter;
  font-size: smaller;
} 

.priority-select .priority-notice {
  padding: 0.625rem;
  border-left: 4px solid #8b1e1e;
  border-radius: 4px;
  background-color: rgb(139 30 30 / 18%);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.35;
}

.priority-select span {
  font-weight: 600;
  font-size: large;
  color: #f5f5f5;
}

.priority-select select {
  padding: 0.625rem;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 4px;
  background-color: #2f2f2f;
  color: #fff;
  font-size: 1rem;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(0 0 0 / 45%);
}

.request-dialog {
  width: min(360px, calc(100vw - 2rem));
  padding: 1.5rem;
  border-radius: 6px;
  background-color: #444444;
  box-shadow: 0 12px 40px rgb(0 0 0 / 25%);
}

.request-dialog h2 {
  margin-top: 0;
  color: #fff;
}

.request-dialog label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.request-dialog input {
  padding: 0.625rem;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 4px;
  background-color: #2f2f2f;
  color: #fff;
  font-size: 1rem;
}

.request-dialog input::placeholder {
  color: #bdbdbd;
}

.map-dialog {
  width: min(1000px, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  overflow: auto;
  padding: 1.5rem;
  border-radius: 6px;
  background-color: #444444;
  box-shadow: 0 12px 40px rgb(0 0 0 / 25%);
}

.map-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.map-dialog-header h2 {
  margin: 0;
  color: #fff;
}

.map-dialog-header button {
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #353535;
  color: #fff;
  cursor: pointer;
}

.map-dialog-header button:hover {
  background-color: #1f1f1f;
}

.consult-map {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid #777;
  border-radius: 4px;
  background-color: #fff;
}

.dialog-actions,
.notification-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.dialog-actions button,
.notification-actions button {
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #353535;
  color: #fff;
  cursor: pointer;
}

.dialog-actions button:hover,
.notification-actions button:hover {
  background-color: #1f1f1f;
}

.consult-notification {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 11;
  width: min(420px, calc(100vw - 2rem));
  padding: 1rem;
  border-left: 6px solid #8b1e1e;
  border-radius: 6px;
  background-color: #444444;
  box-shadow: 0 10px 32px rgb(0 0 0 / 20%);
}

.consult-notification p {
  margin: 0 0 0.5rem;
}

.notification-copy {
  font-size: 1.125rem;
}
</style>
