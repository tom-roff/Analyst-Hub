<template>
  <div class="homepage">
    <header class="header">
      <h1>Consult Assistance Tool (CAT)</h1>
    </header>
        <p>Analyst Handle: {{ handle }}</p>
        <p>Name: {{ name }}</p>
        <p>Pronouns: {{ pronouns }}</p>
  </div>
</template>

<script setup lang="ts">
    import {ref} from 'vue';
    import { onMounted } from 'vue'
    import { socket } from '../socket'

    const handle = ref('');
    const name = ref('');
    const pronouns = ref('');
    const deskX = ref<number | null>(null)
    const deskY = ref<number | null>(null)  

    if (localStorage.getItem('analystInfo')) {
        const analystInfo = JSON.parse(localStorage.getItem('analystInfo')!);
        handle.value = analystInfo.handle || '';
        name.value = analystInfo.name || '';
        pronouns.value = analystInfo.pronouns || '';
        deskX.value = analystInfo.deskLocation?.x || null;
        deskY.value = analystInfo.deskLocation?.y || null;
    }

    onMounted(() => {
      socket.on('connect', () => {
      console.log('Connected to backend:', socket.id)


      socket.emit('register-analyst', {
          handle: handle.value,
          name: name.value,
          pronouns: pronouns.value,
          deskLocation: {
            x: deskX.value,
            y: deskY.value
          },
          priority: 2, // Default priority
        })
      })
    })

</script>

<style scoped>
.homepage {
  width: 100%;
  min-height: 20vh;
}

.header {
  --border-color: #919191;
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
</style>
