<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AnalystInfo from './components/AnalystInfo.vue'
import Homepage from './components/Homepage.vue'
import { socket } from './socket'
import type { AnalystInfo as AnalystInfoType } from '../../shared/types'

const analyst = ref<AnalystInfoType | null>(null)

const handle = ref('');
const name = ref('');
const pronouns = ref('');
const deskX = ref<number | null>(null)
const deskY = ref<number | null>(null)  
const priority = ref(2)
const incomingConsultRequest = ref(null)
const consultRequestStatus = ref({ status: 'idle' })

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


onMounted(() => {
  socket.on('connect', () => {
    console.log('Connected to backend:', socket.id)

    if(handle.value !== null){
      registerAnalystOnServer()
    }

    socket.on('consult-requested', (request) => {
      incomingConsultRequest.value = request
    })

    socket.on('consult-request-status', (status) => {
      consultRequestStatus.value = status
    })
  
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
  socket.emit('request-consult', {
    requesterName: name.value,
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
      @priorityChanged="handlePriorityChanged"
      @openSettings="openSettings"
      @requestPing="handlePingRequest"
      @consultResponse="handleConsultResponse"
    />
  </div>
</template>


<style>
.center-container {
  display: flex;
  justify-content: center;
}

</style>
