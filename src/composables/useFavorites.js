import { ref, onMounted } from "vue";

export function useFavorites() {
    const favorites = ref([]);

    function loadFavorites() {
        favorites.value = JSON.parse(localStorage.getItem("favorites") || "[]");
    }

    function toggleFavorite(imgUrl) {
        const index = favorites.value.indexOf(imgUrl);
        if (index > -1) {
            favorites.value.splice(index, 1);
        } else {
            favorites.value.push(imgUrl);
        }
        localStorage.setItem("favorites", JSON.stringify(favorites.value));
    }

    function isFavorited(imgUrl) {
        return favorites.value.includes(imgUrl);
    }

    onMounted(() => {
        loadFavorites();
    });

    return {
        favorites,
        toggleFavorite,
        isFavorited,
        loadFavorites
    };
}
