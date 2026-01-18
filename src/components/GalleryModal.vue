<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 bg-black/75 flex items-center justify-center min-h-dvh p-4"
    @click="onClose"
  >
    <div
      class="relative max-w-5xl h-full w-full rounded-lg overflow-hidden flex items-center justify-center flex-col"
      @click="onContainerClick"
    >
      <!-- indikator posisi gambar -->
      <div
        class="absolute top-1 left-1/2 -translate-x-1/2 text-sm text-white bg-black/60 px-3 py-1 rounded-full"
      >
        Gambar {{ index + 1 }} dari {{ total }}
      </div>

      <!-- gambar utama dengan transition -->
      <Transition name="fade" mode="out-in">
        <img
          ref="imageRef"
          :key="index"
          v-if="currentSrc"
          :src="currentSrc"
          @click.stop
          @dblclick.stop="toggleFavorite"
          @load="onImageLoad"
          @contextmenu.prevent
          @dragstart.prevent
          class="w-fit max-h-[85vh] object-contain rounded transition-all duration-300"
        />
      </Transition>

      <div
        v-if="showHeart"
        class="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <span class="text-6xl animate-heart">❤️</span>
      </div>

      <!-- loading indicator -->
      <div
        v-if="!loaded"
        class="absolute inset-0 flex items-center justify-center text-white"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-700"
        ></div>
      </div>

      <!-- tombol favorit -->
      <button
        @click.stop="toggleFavorite"
        class="absolute max-lg:bottom-15 lg:bottom-20 left-1/2 -translate-x-1/2 truncate text-white bg-black/50 rounded-full px-3 py-1"
      >
        Favoritkan {{ isFavorited ? "❤️" : "🤍" }}
      </button>

      <!-- nama file di bawah gambar -->
      <div
        class="text-center text-gray-200 rounded-lg p-2 text-sm bg-black/50 absolute bottom-1 md:w-fit max-md:w-full left-1/2 -translate-x-1/2 truncate"
      >
        {{ extractFileName(imageList[index]) }}
      </div>

      <!-- tombol close -->
      <button
        @click.stop="onClose"
        class="absolute flex top-1 right-3 fill-white bg-black/50 rounded-full px-1 py-1 text-white align-middle items-center gap-1"
      >
        <box-icon name="x"></box-icon>
      </button>

      <!-- tombol full size -->
      <a
        :href="imageList[index]"
        target="_blank"
        class="absolute top-1 left-3 fill-white bg-black/50 rounded-full px-1 py-1 text-white align-middle items-center gap-1 flex"
      >
        <box-icon name="fullscreen"></box-icon>
      </a>

      <!-- tombol navigasi -->
      <button
        v-if="index > 0"
        @click.stop="onPrevClick"
        class="absolute flex left-2 top-1/2 -translate-y-1/2 fill-white bg-black/60 rounded-full px-1 py-1 text-xl text-white align-middle items-center gap-1"
      >
        <box-icon name="chevron-left"></box-icon>
      </button>
      <button
        v-if="index < total - 1"
        @click.stop="onNextClick"
        class="absolute flex right-2 top-1/2 -translate-y-1/2 fill-white bg-black/60 rounded-full px-1 py-1 text-xl text-white align-middle items-center gap-1"
      >
        <box-icon name="chevron-right"></box-icon>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";

const props = defineProps({
  show: Boolean,
  index: Number,
  total: Number,
  imageList: Array,
});

const emit = defineEmits(["close", "prev", "next", "favorited"]);

const isFavorited = ref(false);

const loaded = ref(false);
const currentSrc = ref("");
const imageRef = ref(null);
const showHeart = ref(false);

function triggerHeart() {
  showHeart.value = true;
  setTimeout(() => {
    showHeart.value = false;
  }, 800); // durasi animasi 0.8 detik
}

function onContainerClick(event) {
  if (!imageRef.value) return;

  // jika klik terjadi DI DALAM gambar → jangan tutup
  if (imageRef.value.contains(event.target)) {
    return;
  }

  // selain itu (area kuning) → tutup
  onClose();
}

function checkFavorite() {
  const fav = JSON.parse(localStorage.getItem("favorites") || "[]");
  const current = props.imageList[props.index];
  isFavorited.value = fav.includes(current);
}

function toggleFavorite() {
  const fav = JSON.parse(localStorage.getItem("favorites") || "[]");
  const current = props.imageList[props.index];

  if (fav.includes(current)) {
    const updated = fav.filter((i) => i !== current);
    localStorage.setItem("favorites", JSON.stringify(updated));
    isFavorited.value = false;
  } else {
    fav.push(current);
    localStorage.setItem("favorites", JSON.stringify(fav));
    isFavorited.value = true;
    triggerHeart(); // jalankan animasi saat jadi favorit
  }

  emit("favorited", current);
}

// ketika index berubah, set src baru dan reset loaded
watch(
  () => props.index,
  (newIndex) => {
    checkFavorite();
    loaded.value = false;
    currentSrc.value = getR2FullUrl(props.imageList[newIndex]);
  },
  { immediate: true }
);

function onImageLoad() {
  loaded.value = true;
}

function onClose() {
  emit("close");
}
function onPrevClick() {
  emit("prev");
}
function onNextClick() {
  emit("next");
}

function extractFileName(url) {
  if (!url) return "";
  return url.split("/").pop();
}
function getR2FullUrl(url) {
  if (!url) return "";
  return url.replace(
    /^(https?:\/\/[^/]+)/,
    "$1/cdn-cgi/image/fit=scale-down,width=720"
  );
}

// keyboard nav
function handleKey(e) {
  if (!props.show) return;
  switch (e.key) {
    case "ArrowLeft":
      onPrevClick();
      break;
    case "ArrowRight":
      onNextClick();
      break;
    case "Escape":
      onClose();
      break;
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKey);
  checkFavorite();
});

onUnmounted(() => window.removeEventListener("keydown", handleKey));
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes heart-pop {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

.animate-heart {
  animation: heart-pop 0.8s ease forwards;
}
</style>
