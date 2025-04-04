<script setup>
import { watch, onUnmounted } from 'vue'
import { AlertCircle, X } from 'lucide-vue-next'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

let timeoutId = null

const close = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  emit('close')
}

const startTimer = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  timeoutId = setTimeout(() => {
    emit('close')
  }, 2500)
}

watch(() => props.show, (newValue) => {
  if (newValue) {
    startTimer()
  } else if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
})

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
})
</script>

<template>
  <div 
    v-if="show" 
    class="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm shadow-lg flex items-start gap-3 animate-fade-in"
  >
    <AlertCircle class="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
    <div class="grow">
      <h3 class="text-sm font-semibold text-red-700 mb-1">Error</h3>
      <p class="text-sm text-red-600">{{ message }}</p>
    </div>
    <button 
      @click="close"
      class="text-red-400 hover:text-red-500"
    >
      <X class="h-4 w-4" />
    </button>
  </div>
</template>

<style>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 