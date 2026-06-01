<template>
  <section class="analyst-info">
    <h1 class="infoTitle">Analyst Information</h1>
    <div class="center">
      <button id="notifButton" type="button" @click="enableNotifications" 
      :disabled="notificationStatus === 'granted'"
      style="padding: 25px 70px; font-size: 24px; margin-bottom: 16px; background-color: darkred; color: white;">
        {{ notificationStatus === 'granted' ? 'Notifications Enabled' : 'Enable Notifications' }}
      </button>
    </div>

    <form id="analyst-form" @submit.prevent="saveInfo" class="fields">
      <label>
        <span>Handle</span>
        <input v-model="handle" type="text" placeholder="Handle" />
      </label>
      <label>
        <span>Name</span>
        <input v-model="name" type="text" placeholder="First and Last, as you'd like to be called" />
      </label>
      <label>
        <span>Pronouns</span>
        <input v-model="pronouns" type="text" placeholder="Pronouns" />
      </label>
    </form>
    <div class="center">
      <h2>Floor Location</h2>
      <h4 style="margin: 5px; font-weight: normal;">Double click on the map where you're seated so consult givers know where to find you.</h4>
    </div>

    <div class="map-wrapper">
      <img 
        src="../assets/MapPlaceholder.png" 
        alt="Floor Map" 
        class="floor-map"
        @dblclick="selectDeskLocation"
      />

    <div 
      v-if="deskX !== null && deskY !== null"
      class="desk-marker"
      :style="{
        left: `${deskX * 100}%`,
        top: `${deskY * 100}%`
        }"
    >🎯</div>
    </div>




    <div class="center" style="margin-top: 20px;">
      <p style="margin-bottom: 15px">You can change this information at any time by hitting the settings icon on the top right of the home page.</p>
      <button type="submit" form="analyst-form" style="padding: 15px 50px; font-size: 18px;">
        Save
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue';

const handle = ref('');
const name = ref('');
const pronouns = ref('');
const deskX = ref<number | null>(null)
const deskY = ref<number | null>(null)
const priority = ref(2)


const notificationStatus = ref('');

const emit = defineEmits(['infoSaved'])

function selectDeskLocation(event: MouseEvent) {
  const image = event.currentTarget as HTMLImageElement
  const rect = image.getBoundingClientRect()

  const clickX = event.clientX - rect.left
  const clickY = event.clientY - rect.top

  const xPercent = clickX / rect.width
  const yPercent = clickY / rect.height

  deskX.value = xPercent
  deskY.value = yPercent

  console.log('Desk location:', {
    x: xPercent,
    y: yPercent,
  })
}


async function enableNotifications() {
  if (!('Notification' in window)) {
    notificationStatus.value = 'denied'
    alert('This browser does not support desktop notifications.')
    return
  }

  const permission = await Notification.requestPermission()

  if (permission === 'granted') {
    notificationStatus.value = 'granted'
  } else {
    notificationStatus.value = 'denied'
    alert('Notifications have been denied. Please enable notifications to receive consult alerts.')
  }
}

onMounted(() => {
  if (Notification.permission === 'granted') {
    notificationStatus.value = 'granted'
  } else if (Notification.permission === 'denied') {
    notificationStatus.value = 'denied'
  } else {
    notificationStatus.value = ''
  }

  const savedAnalyst = localStorage.getItem('analystInfo')

  if (savedAnalyst) {
    const analyst = JSON.parse(savedAnalyst)

    handle.value = analyst.handle
    name.value = analyst.name
    pronouns.value = analyst.pronouns

    deskX.value = analyst.deskLocation?.x
    deskY.value = analyst.deskLocation?.y
    priority.value = analyst.priority ?? 2
  }
})


function saveInfo() {
  if (deskX.value === null || deskY.value === null) {
    alert('Please select your floor location on the map.')
  return
  }

  const analyst = {
  handle: handle.value,
  name: name.value,
  pronouns: pronouns.value,
  priority: priority.value,
  deskLocation: {
    x: deskX.value,
    y: deskY.value
    }
  }
  console.log('Analyst info to save:', analyst)
  localStorage.setItem('analystInfo', JSON.stringify(analyst))
  emit('infoSaved')
}
</script>

<style scoped>

button:disabled{
  opacity: .6;
  cursor: not-allowed;
}

.infoTitle {
  margin-bottom: 16px;
  justify-content: center;
  display: flex;
}

.analyst-info {
  max-width: 1000px;
  margin: 0;
}

.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.fields {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.fields label {
  flex: 1 1 100px;
  display: flex;
  flex-direction: column;
}

.fields span {
  margin-bottom: 6px;
  font-weight: 600;
}

input {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 10px 18px;
  border: none;
  border-radius: 4px;
  background-color: #4d4d4d;
  color: #fff;
  cursor: pointer;
}

button:hover {
  background-color: #272727;
}

.map-wrapper {
  position: relative;
  display: inline-block;
  margin-top: 20px;
  max-width: 100%;
}

.floor-map {
  display: block;
  max-width: 100%;
  height: auto;
  cursor: crosshair;
}

.desk-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 28px;
  color: #111;
  pointer-events: none;
}

.helper-text {
  margin: 5px;
  font-weight: normal;
}

</style>
