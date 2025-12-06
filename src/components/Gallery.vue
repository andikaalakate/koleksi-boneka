<template>
  <div class="w-full mx-auto">

    <!-- Controls -->
    <div class="flex items-center justify-between mb-4 gap-2 max-w-6xl mx-auto">
      <div class="flex items-center gap-2 w-full">
        <input v-model="filter" @input="onFilter" placeholder="Cari nama file..."
          class="px-3 w-full py-1 border rounded backdrop-blur-xl" />
        <button @click="refresh" class="px-3 py-1 rounded border backdrop-blur-xl">Refresh</button>
      </div>
    </div>

    <!-- Masonry Grid -->
    <TransitionGroup ref="gridRoot" name="fade-grid" tag="div" class="masonry-grid" move-class="fade-move">
      <div v-for="(img, idx) in displayedImages" :key="img" class="masonry-item" @click="openModal(idx)">
        <img @contextmenu.prevent @dragstart.prevent :data-src="getR2ThumbUrl(img)" :alt="img" class="lazy"
          :src="placeholder" loading="lazy" />
      </div>
    </TransitionGroup>

    <!-- Message (No result) -->
    <Transition name="fade">
      <div v-if="!loading && filter && filtered.length === 0" class="text-center text-gray-500 py-10 backdrop-blur-md">
        Tidak ada hasil yang cocok dengan "<span class="font-semibold">{{ filter }}</span>"
      </div>

      <div v-else-if="!loading && !filter && filtered.length === 0"
        class="text-center text-gray-500 py-10 backdrop-blur-md">
        Belum ada gambar tersedia.
      </div>
    </Transition>

    <!-- Loading Spinner -->
    <Transition name="fade">
      <div v-if="loading" class="flex justify-center my-6 backdrop-blur-md">
        <div class="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-700"></div>
      </div>
    </Transition>

    <!-- Infinite Scroll Sentinel -->
    <div ref="sentinel" class="h-16"></div>

    <!-- Scroll to Top -->
    <Transition name="fade">
      <button v-if="showScrollTop" @click="scrollToTop"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-100 text-black rounded-full px-3 py-1 border border-black/50 shadow-lg hover:bg-slate-800 hover:text-white transition duration-500 text-xl">
        ↑
      </button>
    </Transition>

    <!-- Modal -->
    <Transition name="fade-zoom">
      <GalleryModal v-if="showModal" :show="showModal" :index="modalIndex" :total="displayedImages.length"
        :imageList="displayedImages" @close="closeModal" @prev="modalPrev" @next="modalNext" />
    </Transition>
  </div>
</template>

<script setup>
import axios from 'axios'
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
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

/* -------------------------
   Masonry span helpers
   ------------------------- */
function getGridMetrics() {
  const grid = gridRoot.value?.$el || gridRoot.value || document.querySelector('.masonry-grid')
  if (!grid) return { rowHeight: 8, gap: 16 }
  const rowHeightRaw = getComputedStyle(grid).getPropertyValue('grid-auto-rows') || '8px'
  const gapRaw = getComputedStyle(grid).getPropertyValue('gap') || getComputedStyle(grid).getPropertyValue('grid-gap') || '16px'
  const rowHeight = parseFloat(rowHeightRaw) || 8
  const gap = parseFloat(gapRaw) || 16
  return { rowHeight, gap, grid }
}

function setItemRowSpan(item) {
  // measure and set gridRowEnd on the masonry-item
  const img = item.querySelector('img')
  if (!img) return
  // measure in next frame to ensure layout is stable
  requestAnimationFrame(() => {
    const { rowHeight, gap } = getGridMetrics()
    const height = img.getBoundingClientRect().height
    // include small extra for rounding
    const rowSpan = Math.max(1, Math.ceil((height + gap) / (rowHeight + gap)))
    item.style.gridRowEnd = `span ${rowSpan}`
  })
}

function resizeAllItems() {
  const items = (gridRoot.value?.$el || gridRoot.value || document).querySelectorAll('.masonry-item')
  items.forEach((it) => setItemRowSpan(it))
}

/* -------------------------
   Lazy load observer (improved)
   ------------------------- */
function setupLazyObserver() {
  if (!ioLazy) {
    ioLazy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target
            const data = img.getAttribute('data-src')
            if (data) {
              // attach load handler before setting src to ensure it fires
              const onLoaded = () => {
                img.classList.add('loaded')
                // set span for parent item
                const item = img.closest('.masonry-item')
                if (item) setItemRowSpan(item)
                img.removeEventListener('load', onLoaded)
              }
              img.addEventListener('load', onLoaded)
              img.src = data
              img.removeAttribute('data-src')
              ioLazy.unobserve(img)
            } else {
              // already have src (maybe cached) -> ensure span
              const item = img.closest('.masonry-item')
              if (item) setItemRowSpan(item)
              ioLazy.unobserve(img)
            }
          }
        })
      },
      { rootMargin: '400px' }
    )
  }

  nextTick(() => {
    const rootEl = gridRoot.value?.$el || gridRoot.value || document
    if (!rootEl) return
    rootEl.querySelectorAll('img.lazy').forEach((img) => {
      // if image already has data-src, observe it
      if (img.getAttribute('data-src')) {
        ioLazy.observe(img)
      } else {
        // no data-src: image already has src (maybe from cache) -> set span immediately
        // but ensure it's measured after a frame; if already complete call directly
        if (img.complete) {
          const item = img.closest('.masonry-item')
          if (item) setItemRowSpan(item)
        } else {
          img.addEventListener('load', () => {
            const item = img.closest('.masonry-item')
            if (item) setItemRowSpan(item)
          }, { once: true })
        }
      }
    })
  })
}

/* -------------------------
   Fetch & filtering
   ------------------------- */
const seed = ref(Date.now())
function randomWithSeed(s) {
  const x = Math.sin(s++) * 10000
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
    nextTick(() => {
      setupLazyObserver()
    })
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
  // wait DOM update then setup lazy observer and compute spans
  nextTick(() => {
    setupLazyObserver()
    // compute spans for images that already loaded (cache) and placeholders
    resizeAllItems()
  })
}

let filterTimeout
function onFilter() {
  clearTimeout(filterTimeout)
  filterTimeout = setTimeout(() => applyFilter(), 300)
}

/* -------------------------
   Infinite scroll
   ------------------------- */
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
  nextTick(() => {
    setupLazyObserver()
    resizeAllItems()
  })
}

/* -------------------------
   Scroll + modal + lifecycle
   ------------------------- */
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
  window.addEventListener('resize', resizeAllItems)

  // juga recompute spans setelah load (safety)
  window.addEventListener('load', () => {
    nextTick(resizeAllItems)
  })

  // Nonaktifkan klik kanan
  document.addEventListener('contextmenu', disableContextMenu)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', resizeAllItems)
  document.removeEventListener('contextmenu', disableContextMenu)
  if (ioLazy) ioLazy.disconnect()
  if (ioScroll) ioScroll.disconnect()
})

// modal functions
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
.masonry-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  /* minimal 2 kolom */
  gap: 1rem;
  grid-auto-rows: 8px;
}

/* layar sedang */
@media (min-width: 480px) {
  .masonry-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

/* layar besar */
@media (min-width: 768px) {
  .masonry-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

/* layar ekstra besar */
@media (min-width: 1280px) {
  .masonry-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

.masonry-item {
  border-radius: .5rem;
  overflow: hidden;
  cursor: pointer;
  transition: transform .3s ease;
  position: relative;
  /* penting untuk TransitionGroup */
  /* grid-row-end akan di-set dinamis oleh JS */
}

.masonry-item img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

.masonry-item:hover {
  transform: scale(1.02);
}

/* --- Transitions --- */
.fade-grid-enter-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.fade-grid-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
  position: absolute;
}

.fade-grid-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(10px);
}

.fade-grid-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(-10px);
}

.fade-move {
  transition: transform 0.4s ease;
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

/* Lazy Load */
img.lazy {
  opacity: 1;
  transition: opacity 0.5s ease;
}

img.lazy.loaded {
  opacity: 1;
}
</style>
