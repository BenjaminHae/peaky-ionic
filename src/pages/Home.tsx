import { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
//import TestContainer from '../components/TestContainer';
import Peaks from '../components/Peaks';
import './Home.css';

const Home: React.FC = () => {
  return (
    <IonPage>
      <IonContent>
        <Peaks/>
      </IonContent>
    </IonPage>
  );
};

export default Home;
