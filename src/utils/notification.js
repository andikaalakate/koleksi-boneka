export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Browser tidak support notifikasi')
        return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
}

export async function showNotification(title, options = {}) {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return

    reg.showNotification(title, options)
}
