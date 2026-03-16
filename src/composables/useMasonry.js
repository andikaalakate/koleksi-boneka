import { ref, nextTick, onMounted, onUnmounted } from "vue";

export function useMasonry(gridRoot) {
    function getGridMetrics() {
        const grid = gridRoot.value?.$el || gridRoot.value;
        if (!grid) return { rowHeight: 8, gap: 16 };

        const style = getComputedStyle(grid);
        const rowHeight = parseFloat(style.getPropertyValue("grid-auto-rows")) || 8;
        const gap = parseFloat(style.getPropertyValue("gap")) || 16;

        return { rowHeight, gap };
    }

    function setItemRowSpan(item) {
        const img = item.querySelector("img");
        if (!img) return;

        const updateSpan = () => {
            const { rowHeight, gap } = getGridMetrics();
            const height = img.getBoundingClientRect().height;
            const rowSpan = Math.max(1, Math.ceil((height + gap) / (rowHeight + gap)));
            item.style.gridRowEnd = `span ${rowSpan}`;
        };

        if (img.complete) {
            updateSpan();
        } else {
            img.addEventListener("load", updateSpan, { once: true });
            img.addEventListener("error", updateSpan, { once: true });
        }
    }

    function resizeAllItems() {
        const rootEl = gridRoot.value?.$el || gridRoot.value;
        if (!rootEl) return;

        const items = rootEl.querySelectorAll(".masonry-item");
        items.forEach(setItemRowSpan);
    }

    let resizeObserver = null;

    onMounted(() => {
        resizeObserver = new ResizeObserver(() => {
            resizeAllItems();
        });

        const rootEl = gridRoot.value?.$el || gridRoot.value;
        if (rootEl) {
            resizeObserver.observe(rootEl);
        }

        window.addEventListener("resize", resizeAllItems);
    });

    onUnmounted(() => {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
        window.removeEventListener("resize", resizeAllItems);
    });

    return {
        resizeAllItems,
        setItemRowSpan
    };
}
