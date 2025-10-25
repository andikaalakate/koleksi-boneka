<template>
  <div class="w-full mx-auto">
    <!-- controls -->
    <div class="flex items-center justify-between mb-4 gap-2 max-w-6xl mx-auto">
      <div class="flex items-center gap-2 w-full">
        <input v-model="filter" @input="onFilter" placeholder="Cari nama file..."
          class="px-3 w-full py-1 border rounded" />
        <button @click="refresh" class="px-3 py-1 bg-gray-200 rounded border">Refresh</button>
      </div>
    </div>

    <!-- grid -->
    <TransitionGroup ref="gridRoot" name="fade-grid" tag="div"
      class="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 [column-fill:balance] space-y-4">
      <div v-for="(img, idx) in displayedImages" :key="img"
        class="relative break-inside-avoid overflow-hidden rounded-lg bg-white shadow hover:scale-[1.02] transition-transform">
        <button @click="openModal(idx)" class="block w-full text-left">
          <img @contextmenu.prevent @dragstart.prevent  :data-src="getR2ThumbUrl(img)" :alt="img"
            class="w-full object-cover lazy" loading="lazy" :src="placeholder" />
        </button>
      </div>
    </TransitionGroup>

    <!-- jika tidak ada hasil -->
    <Transition name="fade">
      <div v-if="!loading && filter && filtered.length === 0" class="text-center text-gray-500 py-10">
        Tidak ada hasil yang cocok dengan "<span class="font-semibold">{{ filter }}</span>"
      </div>

      <div v-else-if="!loading && !filter && filtered.length === 0" class="text-center text-gray-500 py-10">
        Belum ada gambar tersedia.
      </div>
    </Transition>

    <!-- Loading spinner -->
    <Transition name="fade">
      <div v-if="loading" class="flex justify-center my-6">
        <div class="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-700"></div>
      </div>
    </Transition>

    <!-- Sentinel untuk infinite scroll -->
    <div ref="sentinel" class="h-10"></div>

    <!-- Tombol ke atas -->
    <Transition name="fade">
      <button v-if="showScrollTop" @click="scrollToTop"
        class="fixed bottom-6 right-1/2 z-50 bg-slate-100 text-black rounded-full px-3 py-2 border border-black/50 shadow-lg hover:bg-slate-800 hover:text-white transition duration-500 text-xl">
        ↑
      </button>
    </Transition>

    <!-- modal -->
    <Transition name="fade-zoom">
      <GalleryModal v-if="showModal" :show="showModal" :index="modalIndex" :total="displayedImages.length"
        :imageList="displayedImages" @close="closeModal" @prev="modalPrev" @next="modalNext" />
    </Transition>
  </div>
</template>

<script setup>
import axios from 'axios'
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import GalleryModal from './GalleryModal.vue'

const IMAGES_JSON = import.meta.env.VITE_IMAGES_JSON_URL
const placeholder = '/placeholder.webp'

const images = ref([])
const filtered = ref([])
const displayedImages = ref([])
const filter = ref('')
const loading = ref(false)
const showModal = ref(false)
const modalIndex = ref(0)
const gridRoot = ref(null)
const sentinel = ref(null)
const showScrollTop = ref(false)

let ioLazy = null
let ioScroll = null
const batchSize = 40
let currentBatch = 0

function getR2ThumbUrl(url) {
  if (!url) return ''
  return url.replace(/^(https?:\/\/[^/]+)/, '$1/cdn-cgi/image/fit=scale-down,width=400')
}

// observer untuk lazyload
function setupLazyObserver() {
  if (!ioLazy) {
    ioLazy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target
            const data = img.getAttribute('data-src')
            if (data) {
              img.src = data
              img.removeAttribute('data-src')
              ioLazy.unobserve(img)
            }
          }
        })
      },
      { rootMargin: '300px' }
    )
  }

  nextTick(() => {
    const rootEl = gridRoot.value?.$el || gridRoot.value
    if (!rootEl) return
    rootEl.querySelectorAll('img.lazy').forEach((img) => {
      if (img.getAttribute('data-src')) ioLazy.observe(img)
    })
  })
}

// acak array
const seed = ref(Date.now())
function randomWithSeed(seed) {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(randomWithSeed(seed.value) * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ambil data images.json
async function loadJson({ force = false } = {}) {
  loading.value = true
  try {
    if (!force && sessionStorage.getItem('galleryImages')) {
      images.value = JSON.parse(sessionStorage.getItem('galleryImages'))
      applyFilter()
      return true
    }

    const url = force
      ? `${IMAGES_JSON}${IMAGES_JSON.includes('?') ? '&' : '?'}t=${Date.now()}`
      : IMAGES_JSON

    const res = await axios.get(url, { headers: { 'Cache-Control': 'no-cache' } })
    const data = Array.isArray(res.data) ? shuffleArray(res.data) : []
    images.value = data
    sessionStorage.setItem('galleryImages', JSON.stringify(data))

    applyFilter()
    return true
  } catch (err) {
    console.error('Gagal fetch images.json', err)
    images.value = []
    applyFilter()
    return false
  } finally {
    loading.value = false
    nextTick(setupLazyObserver)
  }
}

async function refresh() {
  filter.value = ''
  images.value = []
  filtered.value = []
  displayedImages.value = []
  currentBatch = 0
  const ok = await loadJson({ force: true })
  if (ok) {
    applyFilter()
    setupLazyObserver()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function applyFilter() {
  const q = filter.value.trim().toLowerCase()
  filtered.value = q
    ? images.value.filter((u) => u.toLowerCase().includes(q))
    : images.value
  displayedImages.value = filtered.value.slice(0, batchSize)
  currentBatch = 1
  setupLazyObserver()
}

let filterTimeout
function onFilter() {
  clearTimeout(filterTimeout)
  filterTimeout = setTimeout(() => applyFilter(), 300)
}

// infinite scroll
function setupInfiniteScroll() {
  if (ioScroll) ioScroll.disconnect()
  ioScroll = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loading.value) loadMore()
    },
    { rootMargin: '400px' }
  )
  if (sentinel.value) ioScroll.observe(sentinel.value)
}

function loadMore() {
  const start = currentBatch * batchSize
  const nextItems = filtered.value.slice(start, start + batchSize)
  if (nextItems.length === 0) return
  displayedImages.value.push(...nextItems)
  currentBatch++
  nextTick(setupLazyObserver)
}

// tombol ke atas
function handleScroll() {
  showScrollTop.value = window.scrollY > 500
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function disableContextMenu(e) {
  e.preventDefault()
}

onMounted(() => {
  loadJson()
  setupInfiniteScroll()
  window.addEventListener('scroll', handleScroll)

  // Nonaktifkan klik kanan
  document.addEventListener('contextmenu', disableContextMenu)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('contextmenu', disableContextMenu)
})

// modal
function openModal(idx) {
  modalIndex.value = idx
  showModal.value = true
  document.body.style.overflow = 'hidden'
}
function closeModal() {
  showModal.value = false
  document.body.style.overflow = ''
}
function modalPrev() {
  if (modalIndex.value > 0) modalIndex.value--
}
function modalNext() {
  if (modalIndex.value < displayedImages.value.length - 1) modalIndex.value++
}
</script>

<style scoped>
.fade-grid-enter-active,
.fade-grid-leave-active {
  transition: all 0.3s ease;
}

.fade-grid-enter-from,
.fade-grid-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.fade-zoom-enter-active,
.fade-zoom-leave-active {
  transition: all 0.3s ease;
}

.fade-zoom-enter-from,
.fade-zoom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
