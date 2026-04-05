import './PeakMap.css';
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIconSelected from "../marker-icon-black.png";
import { TileLayer, useMap, useMapEvents, Marker, Popup, CircleMarker } from 'react-leaflet'
import { IonButton } from '@ionic/react';
import { IonIcon } from '@ionic/react';
import { navigateCircleOutline } from 'ionicons/icons';
import { Icon } from 'leaflet';
import Peaky, { type PeakWithDistance } from '@benjaminhae/peaky';
import { useEffect, useMemo, useState } from 'react';
import {
  useIonViewDidEnter,
} from '@ionic/react';


export interface PeakMapProps { 
  name: string;
  lat: number;
  lon: number;
  peaks: Array<PeakWithDistance>;
  peak_selector: (peak: PeakWithDistance | null, display:'map'|'silhouette') => void;
  selectedPeak?: PeakWithDistance;
  set_location: (lat: number, lon: number) => void;
}
const PeakMap: React.FC<PeakMapProps> = (props:PeakMapProps) => {
  const map = useMap();
  useIonViewDidEnter(() => {
    window.dispatchEvent(new Event('resize'));
    map.invalidateSize();
  });
  useEffect(()=>{
    setTimeout(()=>{map.invalidateSize();}, 500);
  }, [map]);
  const [selectLocation, setSelectLocation] = useState<{lat, lng: number}|null>(null);
  const map_events = useMapEvents({
    click(e) {
      console.log(e.latlng.lat, e.latlng.lng);
      setSelectLocation({lat: e.latlng.lat, lng: e.latlng.lng})
    }
  })
  
  const peakItems = useMemo(()=>{
    const icon = new Icon({iconUrl: markerIcon, iconSize: [25,41], iconAnchor: [12,41]});
    const selectedIcon = new Icon({iconUrl: markerIconSelected, iconSize: [25,41], iconAnchor: [12,41]});
    return props.peaks.map(
     (peak, index) => 
        <Marker position={[peak.location.lat, peak.location.lon]} key={`peak-${index}`} icon={props.selectedPeak == peak ? selectedIcon : icon}>
          <Popup>
           <strong>{peak.name}
</strong> <p>{peak.elevation.toFixed(0)} m, Entfernung: {(peak.distance/1000).toFixed(1)} km</p>
           <IonButton onClick={()=>props.peak_selector(peak, 'silhouette')}><IonIcon icon={navigateCircleOutline}></IonIcon></IonButton>
           {props.selectedPeak != peak &&
<></>
           }
          </Popup>
        </Marker>
         )
     }
     , [props.peaks]);

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      { selectLocation !== null &&
        <Popup position={[selectLocation.lat, selectLocation.lng]}>
          <strong>Show peaks for this location?</strong> 
          <p>{selectLocation.lat}, {selectLocation.lng}</p>
          <IonButton 
            onClick={()=>{
              const lat = selectLocation.lat
              const lng = selectLocation.lng
              setSelectLocation(null)
              props.peak_selector(null, 'silhouette')
              props.set_location(lat, lng);
            }}>
            <IonIcon icon={navigateCircleOutline}></IonIcon>
          </IonButton>
        </Popup>
      }
      <CircleMarker center={[props.lat, props.lon]}>
      </CircleMarker>
        {peakItems}
    </>
  );
};

export default PeakMap;
