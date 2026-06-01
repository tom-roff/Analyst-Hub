<template>
  <div class="homepage">
    <header class="header">
      <h1>Consult Assistance Tool (CAT)</h1>
      <button class="settings-button" type="button" @click="emit('openSettings')">
        Settings
      </button>
    </header>
    <h2>{{ greeting }}, {{ name }}</h2>
    <label class="priority-select">
      <span>Analyst Consult Priority</span>
      <select :value="priority" @change="handlePriorityChange">
        <option
          v-for="option in priorityOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>
    <button @click="isRequestDialogOpen? isRequestDialogOpen = false : isRequestDialogOpen = true">Request Consult</button>
    <div v-if="isRequestDialogOpen">
      <select v-model="selectedTopic">
        <option v-for="topic in consultTopics" :key="topic" :value="topic">
          {{ topic }}
        </option>
      </select>
      <button @click="submitRequestPing">Submit Consult Request</button>
    </div>
    <section v-if="incomingConsultRequest">
      <p>
        {{ incomingConsultRequest.requesterName }} has requested a consult on {{ incomingConsultRequest.topic }}.
      </p>
      <button @click="emit('consultResponse', incomingConsultRequest.id, true)">Accept</button>
      <button @click="emit('consultResponse', incomingConsultRequest.id, false)">Decline</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { type ConsultRequest } from '../../../shared/types'

defineProps<{
  name: string
  handle: string
  priority: number
  incomingConsultRequest: ConsultRequest
}>()

const emit = defineEmits<{
  priorityChanged: [priority: number]
  openSettings: []
  requestPing: [topic: string]
  consultResponse:[]
}>()

const priorityOptions = [
  { label: 'Designated Consulter', value: 0 },
  { label: 'High', value: 1 },
  { label: 'Normal', value: 2 },
  { label: 'Low', value: 3 },
  { label: 'Do Not Disturb', value: 4 },
]

const consultTopics = ['Left Main', 'Bucket', 'Stent', 'Red ROU', 'Other']
const selectedTopic = ref(consultTopics[0])
const isRequestDialogOpen = ref(false)

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

function submitRequestPing() {
  emit('requestPing', selectedTopic.value)
  isRequestDialogOpen.value = false
}


function handlePriorityChange(event: Event) {
  const select = event.target as HTMLSelectElement

  emit('priorityChanged', Number(select.value))
}

</script>

<style scoped>
.homepage {
  width: 100%;
  min-height: 20vh;
}

.header {
  --border-color: #919191;
  position: relative;
  background-color: #353535;
  padding: 2rem;
  border-bottom: 5px solid var(--border-color);
  border-top: 5px solid var(--border-color);
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  justify-content: center;
  display: flex;
  color: #ffffff;
  font-weight: bold;
}

.settings-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.625rem 1rem;
  border: 1px solid #fff;
  border-radius: 4px;
  background-color: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
}

.settings-button:hover {
  background-color: #ffffff;
  color: #353535;
}

.priority-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 320px;
}

.priority-select span {
  font-weight: 600;
}

.priority-select select {
  padding: 0.625rem;
  border: 1px solid #bbb;
  border-radius: 4px;
  font-size: 1rem;
}
</style>
