/**
 * Optimizes image URLs by routing them through the wsrv.nl resizing proxy.
 *
 * Note: Supabase's native transformation endpoint (/render/image/public/) is NOT
 * used, because it is a paid feature — on the free tier it returns
 * 403 FeatureNotEnabled for every request. If this project moves to Pro, that
 * endpoint becomes a valid (dependency-free) alternative to the proxy below.
 *
 * @param {string} imageUrl Original image URL
 * @param {object} options Transformation options (width, height, resize)
 * @returns {string} Optimized image URL
 */
export const getThumbnail = (imageUrl, options = { width: 300, height: 300, resize: 'cover' }) => {
    if (!imageUrl) return 'https://via.placeholder.com/300';

    // Resize and cache via wsrv.nl. Works for any publicly reachable URL
    // (Supabase Storage, WordPress, etc.) and keeps thumbnails small on mobile.
    try {
        const encodedUrl = encodeURIComponent(imageUrl);
        return `https://wsrv.nl/?url=${encodedUrl}&w=${options.width}&h=${options.height}&fit=${options.resize === 'cover' ? 'cover' : 'contain'}&q=80`;
    } catch (e) {
        return imageUrl;
    }
};
