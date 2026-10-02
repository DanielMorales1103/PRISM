import React, { useEffect } from 'react';

interface LocationMapPreviewProps {
  latitude: number;
  longitude: number;
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
}

export function LocationMapPreview({ latitude, longitude, onLocationChange }: LocationMapPreviewProps) {
  useEffect(() => {
    const receiveLocation = (event: MessageEvent) => {
      const data = event.data as { type?: string; latitude?: unknown; longitude?: unknown } | undefined;
      if (data?.type !== 'prism-map-location' || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return;
      onLocationChange?.({ latitude: data.latitude, longitude: data.longitude });
    };
    window.addEventListener('message', receiveLocation);
    return () => window.removeEventListener('message', receiveLocation);
  }, [onLocationChange]);

  const document = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0}.leaflet-control-attribution{font-size:10px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const initial=[${latitude},${longitude}];const map=L.map('map').setView(initial,16);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);const marker=L.marker(initial,{draggable:true}).addTo(map);function report(latlng){window.parent.postMessage({type:'prism-map-location',latitude:latlng.lat,longitude:latlng.lng},'*')}marker.on('dragend',function(){report(marker.getLatLng())});map.on('click',function(event){marker.setLatLng(event.latlng);report(event.latlng)});</script></body></html>`;

  return React.createElement('iframe', {
    title: 'Mapa interactivo de ubicación',
    srcDoc: document,
    loading: 'lazy',
    style: { width: '100%', height: '360px', border: 0, display: 'block' },
  });
}
