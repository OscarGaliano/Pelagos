import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export type ZonePoint = { lat: number; lng: number };
export type ZonePolygon = [number, number][];

interface ZoneMapPreviewProps {
  point: ZonePoint | null;
  polygon: ZonePolygon | null;
}

export function ZoneMapPreview({ point, polygon }: ZoneMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter: L.LatLngExpression = point
      ? [point.lat, point.lng]
      : polygon && polygon.length > 0
      ? [polygon[0][0], polygon[0][1]]
      : [40.4168, -3.7038];

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    mapRef.current = map;

    if (point) {
      L.marker([point.lat, point.lng]).addTo(map);
    }

    if (polygon && polygon.length > 0) {
      const poly = L.polygon(
        polygon.map(([lat, lng]) => [lat, lng] as L.LatLngTuple),
        {
          color: '#06b6d4',
          fillColor: '#06b6d4',
          fillOpacity: 0.3,
        }
      ).addTo(map);
      map.fitBounds(poly.getBounds(), { padding: [30, 30] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [point, polygon]);

  if (!point && (!polygon || polygon.length === 0)) return null;

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-cyan-400/30">
      <div ref={containerRef} className="h-48 w-full" />
      {point && (
        <p className="text-cyan-400/80 text-xs px-3 py-1.5 bg-[#0a1628]">
          Punto: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
        </p>
      )}
      {polygon && polygon.length > 0 && (
        <p className="text-cyan-400/80 text-xs px-3 py-1.5 bg-[#0a1628]">
          Área definida: {polygon.length} puntos
        </p>
      )}
    </div>
  );
}
