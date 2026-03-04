import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface FreightMapProps {
  originCoords: [number, number] | null;
  destCoords: [number, number] | null;
  extraStopCoords?: [number, number][];
  onRouteCalculated?: (distanceKm: number, durationMin: number, routeCoords: [number, number][]) => void;
}

const GREEN_ICON = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const RED_ICON = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const BLUE_ICON = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function FreightMap({ originCoords, destCoords, extraStopCoords = [], onRouteCalculated }: FreightMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-27.09, -48.61], 13);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '',
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Clear all markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }

    if (originCoords) {
      markersRef.current.push(L.marker(originCoords, { icon: GREEN_ICON }).addTo(map).bindPopup("Origem"));
    }
    if (destCoords) {
      markersRef.current.push(L.marker(destCoords, { icon: RED_ICON }).addTo(map).bindPopup("Destino"));
    }
    // Extra stop markers
    extraStopCoords.forEach((coords, i) => {
      markersRef.current.push(L.marker(coords, { icon: BLUE_ICON }).addTo(map).bindPopup(`Parada ${i + 1}`));
    });

    const allPoints = [originCoords, ...extraStopCoords, destCoords].filter(Boolean) as [number, number][];

    if (originCoords && destCoords) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [30, 30] });

      // Build OSRM waypoints: origin → stops → destination
      const waypoints = [originCoords, ...extraStopCoords, destCoords];
      const coordsStr = waypoints.map(c => `${c[1]},${c[0]}`).join(";");
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (data.routes?.[0]) {
            const route = data.routes[0];
            const coords: [number, number][] = route.geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]] as [number, number]
            );
            routeLineRef.current = L.polyline(coords, {
              color: "hsl(45, 100%, 55%)",
              weight: 4,
              opacity: 0.9,
            }).addTo(map);
            map.fitBounds(routeLineRef.current.getBounds(), { padding: [30, 30] });

            const distKm = route.distance / 1000;
            const durMin = route.duration / 60;
            onRouteCalculated?.(distKm, durMin, coords);
          }
        })
        .catch(() => {});
    } else if (originCoords) {
      map.setView(originCoords, 14);
    } else if (destCoords) {
      map.setView(destCoords, 14);
    }
  }, [originCoords, destCoords, extraStopCoords, mapReady]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-[300px] rounded-xl overflow-hidden border"
      style={{ zIndex: 0 }}
    />
  );
}
