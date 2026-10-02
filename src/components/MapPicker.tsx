import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapPickerProps {
  latitude: number;
  longitude: number;
  radius: number;
  onChange: (lat: number, lng: number) => void;
  readOnly?: boolean;
}

function LocationMarker({ position, onChange, readOnly }: { position: L.LatLngExpression, onChange: (lat: number, lng: number) => void, readOnly?: boolean }) {
  useMapEvents({
    click(e) {
      if (!readOnly) {
        onChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

function MapUpdater({ position }: { position: L.LatLngExpression }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [map, position]);
  return null;
}

export function MapPicker({ latitude, longitude, radius, onChange, readOnly = false }: MapPickerProps) {
  const [position, setPosition] = useState<L.LatLngExpression>([latitude || -2.533300, longitude || 140.717400]);

  useEffect(() => {
    if (latitude && longitude) {
      setPosition([latitude, longitude]);
    }
  }, [latitude, longitude]);

  return (
    <div className="h-[300px] w-full rounded-md overflow-hidden border border-border z-0 relative">
      <MapContainer center={position} zoom={16} scrollWheelZoom={true} style={{ height: "100%", width: "100%", zIndex: 1 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater position={position} />
        <LocationMarker position={position} onChange={onChange} readOnly={readOnly} />
        {latitude && longitude && radius > 0 && (
          <Circle
            center={[latitude, longitude]}
            radius={radius}
            pathOptions={{ fillColor: 'blue', fillOpacity: 0.2, color: 'blue' }}
          />
        )}
      </MapContainer>
    </div>
  );
}
