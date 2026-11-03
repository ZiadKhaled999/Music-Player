/**
 * Utility to ensure YouTube & album art thumbnails are highest possible resolution.
 * Replaces low-res Google/YouTube sizing parameters (e.g. =w60-h60 or =w120-h120) with high-res =w1200-h1200,
 * and upgrades ytimg default/mqdefault to maxresdefault or hqdefault.
 */
export function getHighResThumbnail(url?: string, videoId?: string): string {
  if (!url && !videoId) {
    return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=85';
  }

  if (url) {
    // If it's a Google user content / YT music URL with resize parameters:
    if (url.includes('googleusercontent.com') || url.includes('ggpht.com') || url.includes('yt3.ggpht.com')) {
      // Replace =w60-h60, =w120-h120, etc. with =w1200-h1200-l90-rj
      return url
        .replace(/=w\d+-h\d+[^&?]*/gi, '=w1200-h1200-l90-rj')
        .replace(/=s\d+[^&?]*/gi, '=s1200');
    }

    // If it's a standard ytimg or youtube image
    if (url.includes('ytimg.com') || url.includes('youtube.com')) {
      // Upgrade default.jpg, mqdefault.jpg, sddefault.jpg to hqdefault or maxresdefault
      if (url.includes('default.jpg') && !url.includes('maxresdefault.jpg')) {
        return url.replace(/\/(default|mqdefault|sddefault)\.jpg/gi, '/hqdefault.jpg');
      }
      return url;
    }

    return url;
  }

  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=85';
}
