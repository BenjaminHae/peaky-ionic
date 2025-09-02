import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
//import TestContainer from '../components/TestContainer';
import Peaks from '../components/Peaks';
import './Home.css';

const Home: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Peaky</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Peaky</IonTitle>
          </IonToolbar>
        </IonHeader>
        <Peaks />
      </IonContent>
    </IonPage>
  );
};

export default Home;
