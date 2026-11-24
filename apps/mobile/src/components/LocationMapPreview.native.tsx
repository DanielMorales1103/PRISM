import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';

interface LocationMapPreviewProps {
  latitude: number;
  longitude: number;
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
}

export function LocationMapPreview({ latitude, longitude, onLocationChange }: LocationMapPreviewProps) {
  const document = useMemo(() => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0}.leaflet-control-attribution{font-size:10px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const initial=[${latitude},${longitude}];const map=L.map('map').setView(initial,16);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);const marker=L.marker(initial,{draggable:true}).addTo(map);function report(latlng){window.ReactNativeWebView.postMessage(JSON.stringify({latitude:latlng.lat,longitude:latlng.lng}))}marker.on('dragend',function(){report(marker.getLatLng())});map.on('click',function(event){marker.setLatLng(event.latlng);report(event.latlng)});</script></body></html>`, [latitude, longitude]);

  return <View style={styles.container}><WebView originWhitelist={['*']} source={{ html: document, baseUrl: 'https://unpkg.com' }} javaScriptEnabled domStorageEnabled scrollEnabled={false} style={styles.map} onMessage={(event) => {
    try {
      const location = JSON.parse(event.nativeEvent.data) as { latitude?: unknown; longitude?: unknown };
      if (typeof location.latitude === 'number' && typeof location.longitude === 'number' && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
        onLocationChange?.({ latitude: location.latitude, longitude: location.longitude });
      }
    } catch { /* Ignore unrelated WebView messages. */ }
  }} /></View>;
}

const styles = StyleSheet.create({
  container: { height: 360, width: '100%', overflow: 'hidden' },
  map: { flex: 1 },
});
