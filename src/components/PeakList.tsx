//import './PeakView.css';
import { useState, useEffect, useCallback } from "react";
import { type GeoLocation, projected_height, type PeakWithDistance } from '@benjaminhae/peaky';
import { IonItem, IonLabel, IonList, IonItemGroup, IonItemDivider } from '@ionic/react';
import { IonButton, IonButtons } from '@ionic/react';
import { IonIcon } from '@ionic/react';
import { mapOutline, navigateCircleOutline } from 'ionicons/icons';


interface PeakListProps { 
  peaks: Array<PeakWithDistance>;
  peak_selector: (peak: PeakWithDistance, display:'map'|'silhouette') => void;
}

const peakItemFromPeak = (peak, index) =>
       <IonItem key={`peak-item-${index}`}>
         <IonLabel>{peak.name} {peak.elevation.toFixed(0)} m (Entfernung: {(peak.distance/1000).toFixed(1)} km)</IonLabel>
         <IonButtons slot="start">
           <IonButton onClick={()=>props.peak_selector(peak, 'map')}><IonIcon icon={mapOutline}></IonIcon></IonButton>
           <IonButton onClick={()=>props.peak_selector(peak, 'silhouette')}><IonIcon icon={navigateCircleOutline}></IonIcon></IonButton>
         </IonButtons>
       </IonItem>

const peakSorter = (sortingMethod:string) => {
  return (peakA, peakB: PeakWithDistance) => {
      let criteriaA, criteriaB;
      if (sortingMethod === 'name') {
        criteriaA = peakA.name;
        criteriaB = peakB.name;
      }
      else {
        criteriaA = peakA.elevation;
        criteriaB = peakB.elevation;
      }
      if (criteriaA < criteriaB) {
        return -1;
      }
      if (criteriaA > criteriaB) {
        return 1;
      }
      return 0;
    }
  }

const PeakList: React.FC<PeakListProps> = (props:PeakListProps) => {
  const [sortingMethod, setSortingMethod] = useState<'name'|'elevation'>('name');
  const regions = [...new Set(props.peaks.map(p=>p.region))]
  console.log(regions)
  const peakItems = regions.map( (r) => 
      <IonItemGroup>
        <IonItemDivider>
          <IonLabel>{r}</IonLabel>
        </IonItemDivider>
	{props.peaks.filter(p=> p.region == r).sort(peakSorter(sortingMethod)).map(peakItemFromPeak)}
      </IonItemGroup>
  )
  //const peakItems = props.peaks.sort(peakSorter).map(peakItemFromPeak);

  return (
      <IonList>
          {peakItems}
      </IonList>
  );
};

export default PeakList;
