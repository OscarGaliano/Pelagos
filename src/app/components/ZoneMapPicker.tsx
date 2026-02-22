import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { MapPin, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export type ZonePoint = { lat: number; lng: number };
export type ZonePolygon = [number, number][];

interface ZoneMapPickerProps {
  point: ZonePoint | null;
  polygon: ZonePolygon | null;
  onPointChange: (point: ZonePoint | null) => void;
  onPolygonChange: (polygon: ZonePolygon | null) => void;
  onClose: () => void;
}

export function ZoneMapPicker({
  point,
  polygon,
  onPointChange,
  onPolygonChange,
  onClose,
}: ZoneMapPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const [mode, setMode] = useState<'point' | 'polygon'>('point');
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter: L.LatLngExpression = point
      ? [point.lat, point.lng]
      : polygon && polygon.length > 0
      ? [polygon[0][0], polygon[0][1]]
      : [40.4168, -3.7038];

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    if (point) {
      const marker = L.marker([point.lat, point.lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onPointChange({ lat: pos.lat, lng: pos.lng });
      });
      markerRef.current = marker;
    }

    if (polygon && polygon.length > 0) {
      const poly = L.polygon(polygon.map(([lat, lng]) => [lat, lng] as L.LatLngTuple), {
        color: '#06b6d4',
        fillColor: '#06b6d4',
        fillOpacity: 0.3,
      }).addTo(map);
      polygonLayerRef.current = poly;
      map.fitBounds(poly.getBounds(), { padding: [50, 50] });
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (mode === 'point' && !isDrawing) {
        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else {
          const marker = L.marker(e.latlng, { draggable: true }).addTo(map);
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onPointChange({ lat: pos.lat, lng: pos.lng });
          });
          markerRef.current = marker;
        }
        onPointChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    if (mode === 'polygon') {
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      if (polygonLayerRef.current) {
        drawnItems.addLayer(polygonLayerRef.current);
      }

      const drawControl = new L.Control.Draw({
        draw: {
          polygon: {
            shapeOptions: {
              color: '#06b6d4',
              fillColor: '#06b6d4',
              fillOpacity: 0.3,
            },
          },
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
        },
        edit: {
          featureGroup: drawnItems,
          remove: true,
        },
      });

      map.addControl(drawControl);
      drawControlRef.current = drawControl;

      map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
        const event = e as L.DrawEvents.Created;
        if (polygonLayerRef.current) {
          map.removeLayer(polygonLayerRef.current);
        }
        const layer = event.layer as L.Polygon;
        drawnItems.addLayer(layer);
        polygonLayerRef.current = layer;
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        const coords: ZonePolygon = latlngs.map((ll) => [ll.lat, ll.lng]);
        onPolygonChange(coords);
        setIsDrawing(false);
      });

      map.on(L.Draw.Event.DELETED, () => {
        polygonLayerRef.current = null;
        onPolygonChange(null);
      });

      map.on(L.Draw.Event.DRAWSTART, () => setIsDrawing(true));
      map.on(L.Draw.Event.DRAWSTOP, () => setIsDrawing(false));
    }
  }, [mode, onPolygonChange]);

  const clearPoint = () => {
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    onPointChange(null);
  };

  const clearPolygon = () => {
    if (polygonLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    onPolygonChange(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a1628] border-b border-cyan-400/20">
        <h3 className="text-cyan-200 font-medium">Seleccionar zona de pesca</h3>
        <button onClick={onClose} className="text-cyan-400 p-2 hover:bg-white/10 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2 px-4 py-3 bg-[#0c1f3a]">
        <button
          type="button"
          onClick={() => setMode('point')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            mode === 'point'
              ? 'bg-cyan-500/40 text-cyan-100 border border-cyan-400/50'
              : 'bg-white/10 text-cyan-300 border border-cyan-400/20 hover:bg-white/20'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Marcar punto
        </button>
        <button
          type="button"
          onClick={() => setMode('polygon')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            mode === 'polygon'
              ? 'bg-cyan-500/40 text-cyan-100 border border-cyan-400/50'
              : 'bg-white/10 text-cyan-300 border border-cyan-400/20 hover:bg-white/20'
          }`}
        >
          <Pencil className="w-4 h-4" />
          Dibujar área
        </button>
      </div>

      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />
      </div>

      <div className="px-4 py-3 bg-[#0c1f3a] border-t border-cyan-400/20 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          {point && (
            <button
              type="button"
              onClick={clearPoint}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm border border-red-400/30"
            >
              <Trash2 className="w-4 h-4" />
              Quitar punto
            </button>
          )}
          {polygon && polygon.length > 0 && (
            <button
              type="button"
              onClick={clearPolygon}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm border border-red-400/30"
            >
              <Trash2 className="w-4 h-4" />
              Quitar área
            </button>
          )}
        </div>
        <div className="text-cyan-300/70 text-xs">
          {mode === 'point' && 'Toca el mapa para marcar un punto. Arrastra para moverlo.'}
          {mode === 'polygon' && 'Usa las herramientas de arriba a la izquierda del mapa para dibujar el área.'}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-xl bg-cyan-500/40 text-cyan-100 font-medium text-sm"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
