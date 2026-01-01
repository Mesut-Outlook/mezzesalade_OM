/**
 * Optimizes image URLs for Supabase storage.
 * Uses the image transformation service if available.
 * 
 * @param {string} imageUrl Original image URL
 * @param {object} options Transformation options (width, height, resize)
 * @returns {string} Optimized image URL
 */
export const getThumbnail = (imageUrl, options = { width: 300, height: 300, resize: 'cover' }) => {
    if (!imageUrl) return 'https://via.placeholder.com/300';

    // 1. Supabase Optimization (Native)
    if (imageUrl.includes('supabase.co') && imageUrl.includes('/object/public/')) {
        const transformPart = `/render/image/public/`;
        const queryParams = `?width=${options.width}&height=${options.height}&resize=${options.resize}`;
        return imageUrl.replace('/object/public/', transformPart) + queryParams;
    }

    // 2. All other images (WordPress, etc.) - Use wsrv.nl image proxy for resizing and caching
    // This is much faster than loading original 5MB+ photos from a slow server
    try {
        const encodedUrl = encodeURIComponent(imageUrl);
        return `https://wsrv.nl/?url=${encodedUrl}&w=${options.width}&h=${options.height}&fit=${options.resize === 'cover' ? 'cover' : 'contain'}&q=80`;
    } catch (e) {
        return imageUrl;
    }
};
