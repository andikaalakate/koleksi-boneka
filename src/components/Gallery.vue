<template>
  <div class="w-full mx-auto scrollbar-none">
    <!-- Controls -->
    <div class="flex items-center flex-col mb-4 gap-2 max-w-6xl mx-auto">
      <div class="flex items-center gap-2 w-full">
        <input
          v-model="filter"
          placeholder="Cari nama file..."
          class="px-3 w-full py-1 border rounded backdrop-blur-xl"
        />
        <button
          @click="refresh"
          class="px-3 py-1 rounded border backdrop-blur-xl"
        >
          Refresh
        </button>
      </div>
      <button
        @click="showFavoritesOnly = !showFavoritesOnly"
        class="px-3 py-1 col-span-2 w-full rounded border backdrop-blur-xl"
      >
        {{ showFavoritesOnly ? "Semua" : "Favorit" }}
      </button>
    </div>

    <!-- Masonry Grid -->
    <TransitionGroup
      ref="gridRoot"
      name="fade-grid"
      tag="div"
      class="masonry-grid"
      move-class="fade-move"
    >
      <div
        v-for="(img, idx) in displayedImages"
        :key="img"
        class="masonry-item h-fit rounded-lg group"
        @click="openModal(idx)"
      >
        <img
          @contextmenu.prevent
          @dragstart.prevent
          :data-src="getR2Url(img, 400)"
          :alt="img"
          @error="handleImageError"
          class="lazy group-hover:scale-110 transition duration-500"
          :src="placeholder"
          loading="lazy"
        />
        <div
          class="absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:bg-black/40 transition duration-500"
        >
          <box-icon
            name="zoom-in"
            class="absolute right-1/2 bottom-1/2 transform translate-x-1/2 translate-y-1/2 size-10 fill-white"
          ></box-icon>
        </div>
        <div
          v-if="isFavorited(img)"
          role="favorite"
          class="absolute top-1 right-1 bg-black/60 text-white rounded-full px-1 py-1 text-xs"
        >
          ❤️
        </div>
      </div>
    </TransitionGroup>

    <!-- Message (No result) -->
    <Transition name="fade">
      <div
        v-if="!loading && filter && filtered.length === 0"
        class="text-center text-gray-500 py-10 backdrop-blur-md"
      >
        Tidak ada hasil yang cocok dengan "<span class="font-semibold">{{
          filter
        }}</span
        >"
      </div>

      <div
        v-else-if="!loading && !filter && filtered.length === 0"
        class="text-center text-gray-500 py-10 backdrop-blur-md"
      >
        Belum ada gambar tersedia.
      </div>
    </Transition>

    <!-- Loading Spinner -->
    <Transition name="fade">
      <div v-if="loading" class="flex justify-center my-6 backdrop-blur-md">
        <div
          class="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-700"
        ></div>
      </div>
    </Transition>

    <!-- Infinite Scroll Sentinel -->
    <div ref="sentinel" class="h-16"></div>

    <!-- Scroll to Top -->
    <Transition name="fade">
      <button
        v-if="showScrollTop"
        @click="scrollToTop"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-49 flex items-center justify-center size-10 bg-slate-100 text-black rounded-full px-2 py-1 align-middle fill-black/70 border border-white hover:border-black shadow-xl hover:fill-black transition duration-500 text-xl"
      >
        <box-icon name="chevrons-up" class=""></box-icon>
      </button>
    </Transition>

    <!-- Modal -->
    <Transition name="fade-zoom">
      <GalleryModal
        v-if="showModal"
        :show="showModal"
        :index="modalIndex"
        :total="displayedImages.length"
        :imageList="displayedImages"
        @close="closeModal"
        @prev="modalPrev"
        @next="modalNext"
        @favorited="loadFavorites"
      />
    </Transition>
  </div>
</template>

<script setup>
import axios from "axios";
import { ref, nextTick, onMounted, onUnmounted, watch, computed } from "vue";
import GalleryModal from "./GalleryModal.vue";
import { getR2Url, shuffleArray } from "../utils/gallery";
import { useFavorites } from "../composables/useFavorites";
import { useMasonry } from "../composables/useMasonry";

const IMAGES_JSON = import.meta.env.VITE_IMAGES_JSON_URL;
const placeholder = "/placeholder.webp";

const images = ref([]);
const filter = ref("");
const loading = ref(false);
const showModal = ref(false);
const modalIndex = ref(0);
const gridRoot = ref(null);
const sentinel = ref(null);
const showScrollTop = ref(false);
const showFavoritesOnly = ref(false);

const { favorites, isFavorited, loadFavorites } = useFavorites();
const { resizeAllItems, setItemRowSpan } = useMasonry(gridRoot);

const batchSize = 40;
const currentBatch = ref(0);

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase();
  return images.value.filter((url) => {
    const matchText = q ? url.toLowerCase().includes(q) : true;
    const matchFav = showFavoritesOnly.value ? isFavorited(url) : true;
    return matchText && matchFav;
  });
});

const displayedImages = ref([]);

watch(filtered, (newFiltered) => {
  currentBatch.value = 0;
  displayedImages.value = newFiltered.slice(0, batchSize);
  currentBatch.value = 1;
  nextTick(() => {
    setupLazyObserver();
    resizeAllItems();
  });
});

watch(showFavoritesOnly, () => {
  // filtered computed will handle it
});

let ioLazy = null;
let ioScroll = null;

function setupLazyObserver() {
  if (ioLazy) ioLazy.disconnect();
  
  ioLazy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const dataSrc = img.getAttribute("data-src");
          if (dataSrc) {
            img.src = dataSrc;
            img.removeAttribute("data-src");
            img.classList.add("loaded");
            const item = img.closest(".masonry-item");
            if (item) setItemRowSpan(item);
            ioLazy.unobserve(img);
          }
        }
      });
    },
    { rootMargin: "400px" }
  );

  nextTick(() => {
    const rootEl = gridRoot.value?.$el || gridRoot.value;
    if (!rootEl) return;
    rootEl.querySelectorAll("img.lazy[data-src]").forEach((img) => {
      ioLazy.observe(img);
    });
  });
}

function handleImageError(e) {
  e.target.src = placeholder;
  e.target.classList.add("loaded");
  const item = e.target.closest(".masonry-item");
  if (item) setItemRowSpan(item);
}

const seed = ref(Date.now());

async function loadJson({ force = false } = {}) {
  loading.value = true;
  try {
    if (!force && sessionStorage.getItem("galleryImages")) {
      images.value = JSON.parse(sessionStorage.getItem("galleryImages"));
      return true;
    }

    const url = force
      ? `${IMAGES_JSON}${IMAGES_JSON.includes("?") ? "&" : "?"}t=${Date.now()}`
      : IMAGES_JSON;

    const res = await axios.get(url, { headers: { "Cache-Control": "no-cache" } });
    const data = Array.isArray(res.data) ? shuffleArray(res.data, seed.value) : [];
    images.value = data;
    sessionStorage.setItem("galleryImages", JSON.stringify(data));
    return true;
  } catch (err) {
    console.error("Gagal fetch images.json", err);
    images.value = [];
    return false;
  } finally {
    loading.value = false;
    nextTick(setupLazyObserver);
  }
}

async function refresh() {
  filter.value = "";
  images.value = [];
  displayedImages.value = [];
  currentBatch.value = 0;
  if (await loadJson({ force: true })) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function setupInfiniteScroll() {
  if (ioScroll) ioScroll.disconnect();
  ioScroll = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loading.value) {
        loadMore();
      }
    },
    { rootMargin: "400px" }
  );
  if (sentinel.value) ioScroll.observe(sentinel.value);
}

function loadMore() {
  const start = currentBatch.value * batchSize;
  const nextItems = filtered.value.slice(start, start + batchSize);
  if (nextItems.length === 0) return;
  displayedImages.value.push(...nextItems);
  currentBatch.value++;
  nextTick(() => {
    setupLazyObserver();
    resizeAllItems();
  });
}

function handleScroll() {
  showScrollTop.value = window.scrollY > 500;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => {
  loadJson();
  setupInfiniteScroll();
  window.addEventListener("scroll", handleScroll);
  document.addEventListener("contextmenu", (e) => e.preventDefault());
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  if (ioLazy) ioLazy.disconnect();
  if (ioScroll) ioScroll.disconnect();
});

function openModal(idx) {
  modalIndex.value = idx;
  showModal.value = true;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  showModal.value = false;
  document.body.style.overflow = "";
}

function modalPrev() {
  if (modalIndex.value > 0) modalIndex.value--;
}

function modalNext() {
  if (modalIndex.value < displayedImages.value.length - 1) modalIndex.value++;
}
</script>


<style scoped>
.masonry-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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
  overflow: hidden;
  cursor: pointer;
  position: relative;
}

.masonry-item img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
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

.fade-zoom-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.fade-zoom-leave-to {
  opacity: 0;
  transition: all 0.5s ease;
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
}

img.lazy.loaded {
  opacity: 1;
}
</style>
