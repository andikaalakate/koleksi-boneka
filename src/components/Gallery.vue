<template>
  <div class="w-full max-w-6xl">
    <!-- controls -->
    <div class="flex max-md:flex-col items-center justify-between mb-4 gap-2">
      <div class="flex items-center gap-6 max-md:w-full">
        <label class="text-sm text-gray-600">Per halaman</label>
        <select v-model.number="limit" @change="resetAndFetch" class="px-2 py-1 border rounded w-full">
          <option v-for="l in [20, 40, 60, 100]" :key="l" :value="l">{{ l }}</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <input v-model="filter" @input="onFilter" placeholder="Cari nama file..." class="px-3 w-full py-1 border rounded" />
        <button @click="refresh" class="px-3 py-1 bg-gray-200 rounded">Refresh</button>
      </div>
    </div>

    <!-- grid -->
    <div ref="gridRoot" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div v-for="(img, idx) in pageImages" :key="img" class="relative group rounded overflow-hidden bg-white shadow">
        <button @click="openModal(idx)" class="block w-full text-left">
          <!-- use native lazy loading + placeholder technique -->
          <img :data-src="img" :alt="img" class="w-full h-40 object-cover gallery-img lazy" loading="lazy"
            :src="placeholder" />
        </button>
      </div>
    </div>

    <!-- pagination / infinite -->
    <div class="flex justify-center items-center gap-3 mt-6">
      <button @click="prevPage" :disabled="page === 1" class="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">←
        Prev</button>
      <div class="text-sm text-gray-700">Halaman {{ page }} / {{ totalPages }}</div>
      <button @click="nextPage" :disabled="page === totalPages"
        class="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Next →</button>
    </div>

    <!-- modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 bg-black/50 bg-opacity-80 flex items-center justify-center p-4"
      @click.self="closeModal">
      <div class="relative max-w-4xl w-full">
        <img :src="pageImages[modalIndex]" class="w-full max-h-[85vh] object-contain rounded" />
        <button @click="closeModal"
          class="absolute top-3 right-3 text-white bg-black bg-opacity-50 rounded-full px-2 py-1">✕</button>
        <button v-if="modalIndex > 0" @click="modalPrev"
          class="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-40 rounded-full px-4 py-2">‹
        </button>

        <button v-if="modalIndex < pageImages.length - 1" @click="modalNext"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-40 rounded-full px-4 py-2">›</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import axios from 'axios'
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue'

const IMAGES_JSON = import.meta.env.VITE_IMAGES_JSON_URL
const placeholder = '/placeholder.webp' // keep small image in public/

function getThumbUrl(url) {
  try {
    // Jika Cloudflare R2 punya fitur Image Resizing aktif
    // Maka cukup tambahkan query param untuk ubah resolusi & kualitas
    const u = new URL(url)
    u.searchParams.set('width', 400)
    u.searchParams.set('quality', 70)
    return u.toString()
  } catch {
    // fallback: kalau bukan URL lengkap
    return url
  }
}

const images = ref([])
const filtered = ref([])
const page = ref(1)
const limit = ref(40)
const totalPages = ref(1)
const filter = ref('')
const showModal = ref(false)
const modalIndex = ref(0)
const gridRoot = ref(null)

// IntersectionObserver for lazy swap
let io = null

function setupObserver() {
  if (io) io.disconnect()
  io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target
        const data = img.getAttribute('data-src')
        if (data) {
          img.src = data
          img.removeAttribute('data-src')
          io.unobserve(img)
        }
      }
    })
  }, { rootMargin: '200px' })

  // observe visible images
  nextTick(() => {
    if (!gridRoot.value) return
    const imgs = gridRoot.value.querySelectorAll('img.lazy')
    imgs.forEach(i => {
      if (i.getAttribute('data-src')) io.observe(i)
    })
  })
}

async function loadJson() {
  try {
    const res = await axios.get(IMAGES_JSON)
    // res.data expected to be array of URLs or filenames
    images.value = Array.isArray(res.data) ? res.data : []
    applyFilterAndPaging()
    // prefetch next page images' low-priority
    prefetchNextPage()
  } catch (err) {
    console.error('Gagal fetch images.json', err)
    images.value = []
  }
}

function applyFilterAndPaging() {
  const q = filter.value.trim().toLowerCase()
  filtered.value = q ? images.value.filter(u => u.toLowerCase().includes(q)) : images.value
  totalPages.value = Math.max(1, Math.ceil(filtered.value.length / limit.value))
  if (page.value > totalPages.value) page.value = totalPages.value
  setupObserver()
}

const pageImages = computed(() => {
  const start = (page.value - 1) * limit.value
  return filtered.value.slice(start, start + limit.value)
})

function resetAndFetch() {
  page.value = 1
  applyFilterAndPaging()
  prefetchNextPage()
}

function onFilter() {
  page.value = 1
  applyFilterAndPaging()
}

function prevPage() {
  if (page.value > 1) {
    page.value--
    setupObserver()
    prefetchNextPage()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
function nextPage() {
  if (page.value < totalPages.value) {
    page.value++
    setupObserver()
    prefetchNextPage()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function refresh() {
  loadJson()
}

// modal controls
function openModal(idx) {
  modalIndex.value = idx
  showModal.value = true
  document.body.style.overflow = 'hidden'
}
function closeModal() {
  showModal.value = false
  document.body.style.overflow = ''
}
function modalPrev() { if (modalIndex.value > 0) modalIndex.value-- }
function modalNext() { if (modalIndex.value < pageImages.value.length - 1) modalIndex.value++ }

// prefetch low-priority images for next page (create Image objects)
function prefetchNextPage() {
  const next = page.value + 1
  if (next > totalPages.value) return
  const start = (next - 1) * limit.value
  const items = filtered.value.slice(start, start + limit.value)
  for (let u of items.slice(0, 10)) { // just prefetch some
    const i = new Image()
    i.src = u
  }
}

onMounted(() => {
  loadJson()
  // re-setup observer if page changes
  watch([page, limit], () => nextTick(setupObserver))
})
</script>

<style scoped>
/* small adjustments */
</style>
