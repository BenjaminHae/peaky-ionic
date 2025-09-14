import { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
//import TestContainer from '../components/TestContainer';
import Peaks from '../components/Peaks';
import './Home.css';
import { mapOutline, navigateCircleOutline, listCircleOutline } from 'ionicons/icons';
import { IonButton, IonButtons, IonIcon } from '@ionic/react';

const Home: React.FC = () => {
  const [selectedArea, setSelectedArea] = useState<string>('map');
  const selectedItems = [['map', mapOutline], ['list', listCircleOutline], ['peaks', navigateCircleOutline]];
  const selectorButtons = selectedItems.map((item) =>
    <IonButton key={item[0]} onClick={()=>{setSelectedArea(item[0])}} fill={selectedArea == item[0] ? "solid" : "clear"} >
      <IonIcon slot="icon-only" icon={item[1]}></IonIcon>
    </IonButton>
  );
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Peaky</IonTitle>
          <IonButtons slot="end">
            { selectorButtons }
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Peaky</IonTitle>
          </IonToolbar>
        </IonHeader>
        <Peaks selected_area={selectedArea}/>
      </IonContent>
    </IonPage>
  );
};

export default Home;
