import './PeakMap.css';
import markerIcon from "leaflet/dist/images/marker-icon.png";
import { TileLayer, useMap, Marker, Popup, CircleMarker } from 'react-leaflet'
import { Icon } from 'leaflet';
import Peaky, { type GeoLocation, type PeakWithDistance } from '@benjaminhae/peaky';
import { useEffect, useMemo } from 'react';
import {
  useIonViewDidEnter,
} from '@ionic/react';


export interface PeakMapProps { 
  name: string;
  lat: number;
  lon: number;
  peaks: Array<PeakWithDistance>;
  selectedPeak?: PeakWithDistance;
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
  
  const peakItems = useMemo(()=>{
    const icon = new Icon({iconUrl: markerIcon, iconSize: [25,41], iconAnchor: [12,41]});
    return props.peaks.map(
     (peak, index) => 
        <Marker position={[peak.location.lat, peak.location.lon]} key={`peak-${index}`} icon={icon}>
          <Popup>
           {peak.name} {peak.elevation.toFixed(0)} m
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
      <CircleMarker center={[props.lat, props.lon]}>
        <Popup>
          A pretty CSS3 popup. <br /> Easily customizable.
        </Popup>
      </CircleMarker>
        {peakItems}
    </>
  );
};

export default PeakMap;
