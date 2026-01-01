/**
 * Optimizes image URLs for Supabase storage.
 * Uses the image transformation service if available.
 * 
 * @param {string} imageUrl Original image URL
 * @param {object} options Transformation options (width, height, resize)
 * @returns {string} Optimized image URL
 */
export const getThumbnail = (imageUrl, options = { width: 200, height: 200, resize: 'cover' }) => {
    if (!imageUrl || !imageUrl.includes('supabase.co')) return imageUrl;

    // Basic resolution optimization for thumbnails using Supabase Image Transformation
    // Note: This requires the Pro plan or specific configuration on some Supabase versions
    // If it's not working, we fall back to the original URL
    if (imageUrl.includes('/object/public/')) {
        const transformPart = `/render/image/public/`;
        const queryParams = `?width=${options.width}&height=${options.height}&resize=${options.resize}`;
        return imageUrl.replace('/object/public/', transformPart) + queryParams;
    }

    return imageUrl;
};
