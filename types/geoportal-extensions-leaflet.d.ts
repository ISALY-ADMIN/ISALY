/**
 * Le SDK Géoportail pour Leaflet ne publie pas de types. Il s'importe pour son
 * effet de bord : il greffe `L.geoportalLayer` sur l'instance Leaflet du
 * projet (celle de `import('leaflet')`, qu'il `require` lui-même). Le typage
 * de `L.geoportalLayer` vit dans components/home/ListingMiniMap.tsx.
 */
declare module 'geoportal-extensions-leaflet'
