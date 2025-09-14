//import './PeakView.css';
import { type GeoLocation, projected_height, type PeakWithDistance } from '@benjaminhae/peaky';
import { IonItem, IonLabel, IonList } from '@ionic/react';
import { IonButton, IonButtons } from '@ionic/react';
import { IonIcon } from '@ionic/react';
import { mapOutline, navigateCircleOutline } from 'ionicons/icons';


interface PeakListProps { 
  peaks: Array<PeakWithDistance>;
}

const PeakList: React.FC<PeakListProps> = (props:PeakListProps) => {
  const peakItems = props.peaks.map(
   (peak, index) =>
           <IonItem key={`peak-item-${index}`}>
             <IonLabel>{peak.name} ({peak.elevation.toFixed(0)} m)</IonLabel><IonButtons slot="start"><IonButton><IonIcon icon={mapOutline}></IonIcon></IonButton><IonButton><IonIcon icon={navigateCircleOutline}></IonIcon></IonButton></IonButtons>
           </IonItem>
     );

  return (
      <IonList>
          {peakItems}
      </IonList>
  );
};

export default PeakList;
