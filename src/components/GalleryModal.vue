<template>
    <div v-if="show" class="fixed inset-0 z-50 bg-black/75 flex items-center justify-center min-h-dvh p-4"
        @click.self="onClose">
        <div
            class="relative max-w-5xl h-full w-full rounded-lg overflow-hidden items-center justify-center flex flex-col">
            <!-- indikator posisi gambar -->
            <div class="absolute top-1 left-1/2 -translate-x-1/2 text-sm text-white bg-black/60 px-3 py-1 rounded-full">
                Gambar {{ index + 1 }} dari {{ total }}
            </div>

            <!-- gambar utama -->
            <img @contextmenu.prevent @dragstart.prevent :src="getR2FullUrl(imageList[index])"
                class="w-full max-h-[85vh] object-contain rounded transition-all duration-300" />

            <!-- nama file di bawah gambar -->
            <div
                class="text-center text-gray-200 rounded-lg p-2 text-sm bg-black/50 absolute bottom-1 md:w-fit max-md:w-full left-1/2 -translate-x-1/2 truncate">
                {{ extractFileName(imageList[index]) }}
            </div>

            <!-- tombol close -->
            <button @click="onClose"
                class="absolute top-1 right-3 text-white bg-black bg-opacity-50 rounded-full px-2 py-1">
                ✕
            </button>

            <!-- tombol full size -->
            <a :href="imageList[index]" target="_blank"
                class="absolute top-1 left-3 text-white bg-black bg-opacity-50 rounded-full px-2 py-1">
                Full
            </a>

            <!-- tombol navigasi -->
            <button v-if="index > 0" @click="onPrev"
                class="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-40 rounded-full px-4 py-2">
                ‹
            </button>

            <button v-if="index < total - 1" @click="onNext"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-40 rounded-full px-4 py-2">
                ›
            </button>
        </div>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
    show: Boolean,
    index: Number,
    total: Number,
    imageList: Array,
})

const emit = defineEmits(['close', 'prev', 'next'])

function onClose() {
    emit('close')
}
function onPrev() {
    emit('prev')
}
function onNext() {
    emit('next')
}
function extractFileName(url) {
    if (!url) return ''
    return url.split('/').pop()
}
function getR2FullUrl(url) {
    if (!url) return ''
    return url.replace(/^(https?:\/\/[^/]+)/, '$1/cdn-cgi/image/fit=scale-down,width=720')
}

function handleKey(e) {
    if (!props.show) return
    switch (e.key) {
        case 'ArrowLeft':
            onPrev()
            break
        case 'ArrowRight':
            onNext()
            break
        case 'Escape':
            onClose()
            break
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKey)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKey)
})

watch(
    () => props.show,
    (val) => {
        if (val) window.addEventListener('keydown', handleKey)
        else window.removeEventListener('keydown', handleKey)
    }
)
</script>
  
