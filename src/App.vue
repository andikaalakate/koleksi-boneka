<script setup>
import Gallery from './components/Gallery.vue';
</script>

<template>
	<div
		class="min-h-screen bg-slate-100 bg-[url('https://www.toptal.com/designers/subtlepatterns/uploads/dot-grid.png')] bg-repeat p-6 flex flex-col items-center">
		<!-- Judul Utama -->
		<h1 class="text-3xl font-bold mb-4 text-center">Koleksi MyBoneka</h1>

		<!-- Credit / Author -->
		<div class="flex items-center justify-center gap-4 text-gray-600 text-sm mb-4 animate-fade-in">
			<span class="italic">by <span class="font-semibold text-gray-800">Andika Alakate</span></span>

			<!-- GitHub -->
			<a href="https://github.com/andikaalakate" target="_blank"
				class="flex items-center gap-1 hover:text-black transition-all hover:scale-105">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
					<path
						d="M12 .5C5.65.5.5 5.65.5 12.04c0 5.12 3.29 9.47 7.86 11a.77.77 0 0 0 .17-.49v-1.7c-3.2.7-3.88-1.55-3.88-1.55a3.07 3.07 0 0 0-1.3-1.72c-1.06-.73.08-.71.08-.71a2.44 2.44 0 0 1 1.78 1.21 2.46 2.46 0 0 0 3.37.96 2.47 2.47 0 0 1 .73-1.55c-2.56-.29-5.26-1.29-5.26-5.73a4.49 4.49 0 0 1 1.2-3.1 4.17 4.17 0 0 1 .12-3.05s.97-.31 3.18 1.19a10.94 10.94 0 0 1 5.8 0c2.2-1.5 3.18-1.19 3.18-1.19a4.17 4.17 0 0 1 .12 3.05 4.49 4.49 0 0 1 1.2 3.1c0 4.45-2.7 5.43-5.27 5.72a2.77 2.77 0 0 1 .8 2.15v3.18a.77.77 0 0 0 .17.49c4.57-1.54 7.86-5.89 7.86-11C23.5 5.65 18.35.5 12 .5Z" />
				</svg>
				<span>GitHub</span>
			</a>

			<!-- Facebook -->
			<a href="https://facebook.com/andikaalakate" target="_blank"
				class="flex items-center gap-1 hover:text-blue-600 transition-all hover:scale-105">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
					<path
						d="M22.68 0H1.32A1.32 1.32 0 0 0 0 1.32v21.36A1.32 1.32 0 0 0 1.32 24H12.8v-9.29H9.69v-3.62h3.11V8.41c0-3.09 1.89-4.77 4.65-4.77 1.32 0 2.45.1 2.78.14v3.23h-1.91c-1.5 0-1.79.71-1.79 1.75v2.3h3.58l-.47 3.62h-3.11V24h6.1A1.32 1.32 0 0 0 24 22.68V1.32A1.32 1.32 0 0 0 22.68 0Z" />
				</svg>
				<span>Facebook</span>
			</a>
		</div>

		<!-- Komponen Galeri -->
		<Gallery />
	</div>
</template>

<style scoped>
@keyframes fade-in {
	from {
		opacity: 0;
		transform: translateY(-5px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.animate-fade-in {
	animation: fade-in 0.8s ease-out;
}
</style>