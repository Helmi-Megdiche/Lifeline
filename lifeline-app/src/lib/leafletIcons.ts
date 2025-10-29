// Client-only setup for Leaflet default marker icons using local images
"use client";

export async function setupLeafletDefaultIcon() {
  // Only run on client side
  if (typeof window === 'undefined') return;
  
  try {
    // Dynamic imports to avoid SSR issues
    const [
      { default: L },
      { default: icon2x },
      { default: icon },
      { default: shadow }
    ] = await Promise.all([
      import('leaflet'),
      import('leaflet/dist/images/marker-icon-2x.png'),
      import('leaflet/dist/images/marker-icon.png'),
      import('leaflet/dist/images/marker-shadow.png')
    ]);

    // Avoid reapplying
    const anyL = L as any;
    if (anyL.__lifelineIconsSetup) return;
    anyL.__lifelineIconsSetup = true;

    const Default = (L.Icon.Default as any);
    if (Default && Default.mergeOptions) {
      Default.mergeOptions({
        iconRetinaUrl: icon2x.src ?? icon2x,
        iconUrl: icon.src ?? icon,
        shadowUrl: shadow.src ?? shadow,
      });
    }
  } catch (error) {
    console.warn('Failed to setup Leaflet icons:', error);
  }
}


