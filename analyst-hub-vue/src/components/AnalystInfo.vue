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
    <img src="../assets/MapPlaceholder.png" alt="Map Placeholder" style="margin-top: 20px; max-width: 100%; height: auto;" />

    <div class="center" style="margin-top: 20px;">
      <button type="submit" form="analyst-form" style="padding: 15px 50px; font-size: 18px;">
        Save
      </button>
      <p v-if="status">{{ status }}</p>
    </div>
  </section>
</template>

<script setup>
import {onMounted, ref} from 'vue';

const handle = ref('');
const name = ref('');
const pronouns = ref('');
const status = ref('');

const notificationStatus = ref('');

const emit = defineEmits(['infoSaved'])


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
})


function saveInfo() {
  // Save info locally and send to server (eventually when I code that)

  const user = {
  handle: handle.value,
  name: name.value,
  pronouns: pronouns.value
  }

  console.log('User info to save:', user)
  localStorage.setItem('analystInfo', JSON.stringify(user))
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
</style>
