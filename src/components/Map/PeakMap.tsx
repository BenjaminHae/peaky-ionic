import './PeakMap.css';
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIconSelected from "./marker-icon-black.png";
import { GeoLocation } from '@benjaminhae/peaky';
import { TileLayer, useMap, useMapEvents, Marker, Popup, Circle, CircleMarker, Rectangle, Tooltip, FeatureGroup } from 'react-leaflet'
import { IonButton, IonItem, IonInput } from '@ionic/react';
import { IonIcon, IonLabel } from '@ionic/react';
import { navigateCircleOutline, cloudDownloadOutline } from 'ionicons/icons';
import { Icon } from 'leaflet';
import Peaky, { type PeakWithDistance } from '@benjaminhae/peaky';
import { useEffect, useMemo, useState } from 'react';
import {
  useIonViewDidEnter,
} from '@ionic/react';


export interface PeakMapProps { 
  lat: number;
  lon: number;
  peaks: Array<PeakWithDistance>;
  peak_selector: (peak: PeakWithDistance | null, display:'map'|'silhouette') => void;
  selectedPeak?: PeakWithDistance;
  set_location: (lat: number, lon: number) => void;
  selectedTiles: Array<{tile:string, northWest: GeoLocation, southEast: GeoLocation}>;
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
  const [selectLocation, setSelectLocation] = useState<{lat: number, lng: number}|null>(null);
  const map_events = useMapEvents({
    click(e) {
      console.log(e.latlng.lat, e.latlng.lng);
      setSelectLocation({lat: e.latlng.lat, lng: e.latlng.lng})
    }
  })

  const [circleAroundLocation, setCircleAroundLocation] = useState<number>(0);
  
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

  const tileRectangles = useMemo(()=>{
    if (props.selectedTiles?.length > 0) {
      const tiles = props.selectedTiles.map((tile, index) => {
        return <div key={index}>
          <Rectangle bounds={[[tile.northWest.lat, tile.northWest.lon], [tile.southEast.lat, tile.southEast.lon]]}>
            <Tooltip direction="center" offset={[0.5, 0.5]} opacity={1} permanent >
                    {tile.tile}
            </Tooltip>
          </Rectangle>
       </div>
      })
      return <FeatureGroup pathOptions={{ color: 'purple' }}>
              {tiles}
            </FeatureGroup>
    }
    return <></>
  }, [props.selectedTiles]);

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      { selectLocation !== null &&
        <Popup position={[selectLocation.lat, selectLocation.lng]}>
          <strong>Show peaks for this location</strong> 
          <p>
          {selectLocation.lat}, {selectLocation.lng}
          </p>
          <IonButton 
            title="Show Peaks"
            onClick={()=>{
              const lat = selectLocation.lat
              const lng = selectLocation.lng
              setSelectLocation(null)
              props.peak_selector(null, 'silhouette')
              props.set_location(lat, lng);
            }}>
            <IonIcon icon={navigateCircleOutline}></IonIcon>
          </IonButton><br/>
          <strong>Download data for location</strong> 
          <IonItem>
            <IonInput 
              label="Include Distance" 
              type="number" 
              value={circleAroundLocation} 
              onIonChange={(e)=>{setCircleAroundLocation(parseInt(e.detail.value));}}
            >
            </IonInput>
            <IonLabel>km</IonLabel>
            <IonButton
              disabled
              title="Download data for this location"
              onClick={()=>{
                const lat = selectLocation.lat
                const lng = selectLocation.lng
                // todo download location
              }}>
              <IonIcon icon={cloudDownloadOutline}></IonIcon>
            </IonButton>
          </IonItem>
        </Popup>
      }
      <CircleMarker center={[props.lat, props.lon]} radius={5} >
      </CircleMarker>
      { selectLocation !== null && circleAroundLocation > 0 &&
        <Circle center={[selectLocation.lat, selectLocation.lng]} radius={circleAroundLocation * 1000}>
        </Circle>
      }
      {peakItems}
      {tileRectangles}
    </>
  );
};

export default PeakMap;
