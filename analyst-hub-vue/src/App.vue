<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AnalystInfo from './components/AnalystInfo.vue'
import Homepage from './components/Homepage.vue'
import { socket } from './socket'
import type { AnalystInfo as AnalystInfoType } from '../../shared/types'

type IncomingConsultRequest = {
  requestId: string
  requesterName: string
  requesterLocX?: number | null
  requesterLocY?: number | null
  topic: string
}

type ConsultRequestStatus =
  | { status: 'idle' }
  | { status: 'requested'; requestId?: string }
  | { status: 'no-available' }
  | {
    status: 'ongoing'
    requestId: string
    topic: string
    startedAt: string
    analyst: AnalystInfoType & { socketId: string }
  }
  | { status: 'completed'; requestId: string; completedAt: string }

type GivenConsultStatus =
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

const analyst = ref<AnalystInfoType | null>(null)

const handle = ref('');
const name = ref('');
const pronouns = ref('');
const deskX = ref<number | null>(null)
const deskY = ref<number | null>(null)  
const priority = ref(2)
const incomingConsultRequest = ref<IncomingConsultRequest | null>(null)
const consultRequestStatus = ref<ConsultRequestStatus>({ status: 'idle' })
const givenConsultStatus = ref<GivenConsultStatus>({ status: 'idle' })
const notifiedRequestIds = new Set<string>()
let consultCompletedTimeout: ReturnType<typeof setTimeout> | null = null

const analystExists = ref(false)

onMounted(() => {
  const savedAnalyst = localStorage.getItem('analystInfo')

  if (savedAnalyst) {
    analyst.value = JSON.parse(savedAnalyst) as AnalystInfoType
    handle.value = analyst.value.handle
    name.value = analyst.value.name
    pronouns.value = analyst.value.pronouns
    deskX.value = analyst.value.deskLocation.x
    deskY.value = analyst.value.deskLocation.y
    priority.value = analyst.value.priority ?? 2
    analystExists.value = true
  }
})

function handleInfoSaved() {
  const savedAnalyst = localStorage.getItem('analystInfo')

  if (savedAnalyst) {
    analyst.value = JSON.parse(savedAnalyst) as AnalystInfoType
    handle.value = analyst.value.handle
    name.value = analyst.value.name
    pronouns.value = analyst.value.pronouns
    deskX.value = analyst.value.deskLocation.x
    deskY.value = analyst.value.deskLocation.y
    priority.value = analyst.value.priority ?? 2
  }
  else{
    console.error('No analyst info found in localStorage after saving.')
  }

  analystExists.value = true

  if (socket.connected && handle.value) {
    registerAnalystOnServer()
  }
}

function handlePriorityChanged(newPriority: number) {
  priority.value = newPriority

  if (!analyst.value) {
    return
  }

  analyst.value = {
    ...analyst.value,
    priority: newPriority,
  }

  localStorage.setItem('analystInfo', JSON.stringify(analyst.value))
  socket.emit('update-analyst-priority', {
    handle: analyst.value.handle,
    priority: newPriority,
  })
}

function openSettings() {
  analystExists.value = false
}

function notifyConsultRequest(request: IncomingConsultRequest) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  if (notifiedRequestIds.has(request.requestId)) {
    return
  }

  notifiedRequestIds.add(request.requestId)

  const notification = new Notification('Consult Request', {
    body: `${request.requesterName} has requested a consult on ${request.topic}.`,
    tag: request.requestId
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
  }
}


onMounted(() => {
  socket.off('connect')
  socket.off('consult-requested')
  socket.off('consult-request-expired')
  socket.off('consult-request-status')
  socket.off('consult-giver-state')

  socket.on('connect', () => {
    console.log('Connected to backend:', socket.id)

    if(handle.value){
      registerAnalystOnServer()
    }
  })

  if (socket.connected && handle.value) {
    registerAnalystOnServer()
  }

  socket.on('consult-requested', (request: IncomingConsultRequest) => {
    incomingConsultRequest.value = request
    notifyConsultRequest(request)
  })

  socket.on('consult-request-expired', ({ requestId }) => {
    if (incomingConsultRequest.value?.requestId === requestId) {
      incomingConsultRequest.value = null
    }
  })

  socket.on('consult-request-status', (status: ConsultRequestStatus) => {
    if (consultCompletedTimeout) {
      clearTimeout(consultCompletedTimeout)
      consultCompletedTimeout = null
    }

    consultRequestStatus.value = status

    if (status.status === 'completed') {
      consultCompletedTimeout = setTimeout(() => {
        consultRequestStatus.value = { status: 'idle' }
        consultCompletedTimeout = null
      }, 5000)
    }
  })

  socket.on('consult-giver-state', (status: GivenConsultStatus) => {
    givenConsultStatus.value = status
  })
})

function registerAnalystOnServer() {
  socket.emit('register-analyst', {
    handle: handle.value,
    name: name.value,
    pronouns: pronouns.value,
    deskLocation: {
      x: deskX.value,
      y: deskY.value
    },
    priority: priority.value,
  })
}

function handlePingRequest(topic: string) {
  consultRequestStatus.value = { status: 'requested' }
  socket.emit('request-consult', {
    requesterName: name.value,
    requesterHandle: handle.value,
    requesterPronouns: pronouns.value,
    requesterLocX: deskX.value,
    requesterLocY: deskY.value,
    topic,
  })
}

function handleConsultResponse(requestId:string, accepted:boolean){
  socket.emit('respond-to-consult-request', {
    requestId,
    accepted
  })
  incomingConsultRequest.value = null
} 

function clearConsultRequestStatus() {
  consultRequestStatus.value = { status: 'idle' }
}

function handleCompleteConsult(requestId: string) {
  socket.emit('complete-consult', {
    requestId,
  })
}

</script>

<template>
  <div class="center-container">
    <AnalystInfo v-if="!analystExists" @infoSaved="handleInfoSaved" />
    <Homepage
      v-else
      :name="name"
      :handle="handle"
      :priority="priority"
      :incomingConsultRequest="incomingConsultRequest"
      :consultRequestStatus="consultRequestStatus"
      :givenConsultStatus="givenConsultStatus"
      @priorityChanged="handlePriorityChanged"
      @openSettings="openSettings"
      @requestPing="handlePingRequest"
      @consultResponse="handleConsultResponse"
      @clearConsultRequestStatus="clearConsultRequestStatus"
      @completeConsult="handleCompleteConsult"
    />
  </div>
</template>


<style>
.center-container {
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
}

</style>
