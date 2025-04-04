<script setup>
import { ref, onMounted } from 'vue'
import { Download, LucideWand2, ExternalLink, FileArchive, Info, Github, FileText } from 'lucide-vue-next'

import ErrorAlert from './components/ErrorAlert.vue'

import { downloadFromModrinthUrl, processMrpack, downloadZip } from './converter'

const modrinthUrl = ref('')
const isLoading = ref(false)
const progress = ref(0)
const activeTab = ref('url')
const error = ref(null)
const fileInput = ref(null)
const selectedFile = ref(null)

const handleDownload = async () => {
  const urlToDownload = modrinthUrl.value.trim()
  if (!urlToDownload) return
  
  isLoading.value = true
  progress.value = 0
  
  try {
    const { content, filename } = await downloadFromModrinthUrl(urlToDownload, (value) => {
      progress.value = value
    })
    downloadZip(content, filename)
  } catch (err) {
    error.value = err.message || 'Unknown error occurred'
    console.error("Download Error:", err)
  } finally {
    isLoading.value = false
  }
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) selectedFile.value = file
}

const handleFileDrop = (event) => {
  const file = event.dataTransfer.files[0]
  if (file?.name.endsWith('.mrpack')) selectedFile.value = file
}

const downloadLocal = async () => {
  if (!selectedFile.value) return
  
  try {
    isLoading.value = true
    progress.value = 0
    
    const { content, filename } = await processMrpack(selectedFile.value, (value) => {
      progress.value = value
    })
    downloadZip(content, filename)
  } catch (err) {
    error.value = err.message || 'Unknown error occurred'
    console.error("Processing Error:", err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const modrinthUrlParam = urlParams.get('url')
  if (modrinthUrlParam) {
    modrinthUrl.value = modrinthUrlParam
    handleDownload()
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <main class="container mx-auto px-6 py-8 max-w-2xl grow">
      <h1 class="text-4xl font-bold text-emerald-500 mb-8 text-center">Modrinth Pack to ZIP</h1>
      
      <div class="w-full bg-white rounded-lg">
        <div class="flex justify-center w-full h-48 mb-6">
          <figure class="w-full h-full">
            <img 
              src="/banner.webp" 
              alt="Modrinth Pack to ZIP Banner"
              class="w-full h-full object-cover"
              title="Image from https://modrinth.com/datapack/madoka-magica-mon/gallery"
            >
            <figcaption class="sr-only">Banner image by Modrinth</figcaption>
          </figure>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-6">
          <button 
            @click="activeTab = 'url'"
            :class="[
              'py-2 rounded-lg font-semibold transition-all',
              activeTab === 'url'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            ]"
          >
            Modpack URL
          </button>
          <button 
            @click="activeTab = 'upload'"
            :class="[
              'py-2 rounded-lg font-semibold transition-all',
              activeTab === 'upload'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            ]"
          >
            File Upload
          </button>
        </div>

        <div v-if="activeTab === 'url'" class="space-y-4">
          <div class="flex gap-2 items-end">
            <div class="grow">
              <label class="block text-gray-700 mb-1 text-sm font-semibold">Modpack URL</label>
              <input
                v-model="modrinthUrl"
                type="text"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="https://modrinth.com/modpack/example"
                @keyup.enter="handleDownload"
              >
            </div>
            <button 
              @click="handleDownload"
              :disabled="!modrinthUrl.trim()"
              :class="[
                'font-semibold px-8 py-2 rounded-lg flex items-center justify-center gap-2 text-white h-[42px] transition-all',
                !modrinthUrl.trim() ? 'bg-emerald-600/50 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600'
              ]"
            >
              <Download class="h-5 w-5" />
              Download
            </button>
          </div>

          <a 
            href="https://modrinth.com/modpacks"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full py-2 px-4 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 transition-all"
          >
            <ExternalLink class="h-4 w-4" />
            Browse Modpacks on Modrinth
          </a>
        </div>

        <div v-else>
          <div class="space-y-4">
            <div 
              class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-500 transition-colors cursor-pointer"
              @click="fileInput.click()"
              @dragover.prevent
              @drop.prevent="handleFileDrop"
            >
              <input
                type="file"
                accept=".mrpack"
                @change="handleFileUpload"
                class="hidden"
                ref="fileInput"
              >
              <div class="flex flex-col items-center gap-3">
                <div class="bg-gray-100 rounded-full p-3">
                  <FileArchive class="h-8 w-8 text-gray-400" />
                </div>
                <div class="space-y-1">
                  <h3 class="font-medium text-gray-900">Choose File</h3>
                  <p class="text-sm text-gray-500">
                    {{ selectedFile ? `Selected: ${selectedFile.name}` : 'or drag and drop a .mrpack file' }}
                  </p>
                </div>
                <button class="px-4 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Select File
                </button>
              </div>
            </div>

            <button 
              @click="downloadLocal"
              :disabled="!selectedFile"
              :class="[
                'w-full font-semibold px-8 py-2 rounded-lg flex items-center justify-center gap-2 text-white h-[42px] transition-all',
                !selectedFile ? 'bg-emerald-600/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
              ]"
            >
              <LucideWand2 class="h-5 w-5" />
              Convert
            </button>
          </div>
        </div>

        <div class="mt-10 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div class="flex gap-2">
            <Info class="h-5 w-5 text-gray-700 shrink-0" />
            <div>
              <h3 class="text-gray-700 font-semibold">Important Note</h3>
              <p class="text-gray-600 text-sm">
                If you receive both a ZIP file and JAR files, please move the JAR files to your mods folder manually.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="mt-auto py-6 border-t">
      <div class="container mx-auto px-4 max-w-xl">
        <div class="flex flex-col items-center gap-2 text-sm text-gray-500">
          <div class="flex items-center gap-4">
            <a 
              href="https://github.com/xurdejl/mrpack-to-zip"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-gray-700 flex items-center gap-1"
            >
              <Github class="h-4 w-4" />
              Source Code
            </a>
            <a 
              href="https://github.com/xurdejl/mrpack-to-zip/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-gray-700 flex items-center gap-1"
            >
              <FileText class="h-4 w-4" />
              License
            </a>
          </div>
          <p>
            Based on the work by 
            <a 
              href="https://github.com/Fabulously-Optimized/mrpack-to-zip"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-gray-700"
            >
              Fabulously Optimized
            </a>
          </p>
        </div>
      </div>
    </footer>

    <div v-if="isLoading" class="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">Downloading pack</h3>
        <p class="mb-4 text-gray-600">
          Files required for the modpack are currently being downloaded, please wait.
        </p>
        <div class="w-full bg-gray-100 rounded-full h-2">
          <div 
            class="bg-gray-900 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <p class="text-sm text-gray-500 mt-2">{{ progress }}%</p>
      </div>
    </div>
    <ErrorAlert :show="!!error" :message="error" @close="error = null" />
  </div>
</template>
