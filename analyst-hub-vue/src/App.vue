<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AnalystInfo from './components/AnalystInfo.vue'
import Homepage from './components/Homepage.vue'

const analystExists = ref(false)

onMounted(() => {
  const analyst = localStorage.getItem('analystInfo')
  if (analyst) {
    analystExists.value = true
  }
})

function handleInfoSaved() {
  analystExists.value = true
}

</script>

<template>
  <div class="center-container">
    <AnalystInfo v-if="!analystExists" @infoSaved="handleInfoSaved" />
    <Homepage v-else />
  </div>
</template>


<style>
.center-container {
  display: flex;
  justify-content: center;
}

</style>