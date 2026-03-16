export function getR2Url(url, width = 400) {
    if (!url) return "";
    return url.replace(
        /^(https?:\/\/[^/]+)/,
        `$1/cdn-cgi/image/fit=scale-down,width=${width}`
    );
}

export function shuffleArray(arr, seedValue) {
    const result = [...arr];
    let s = seedValue;
    for (let i = result.length - 1; i > 0; i--) {
        const x = Math.sin(s++) * 10000;
        const j = Math.floor((x - Math.floor(x)) * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export function extractFileName(url) {
    if (!url) return "";
    return url.split("/").pop();
}
