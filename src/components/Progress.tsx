//import './PeakLabel.css';
import { Status } from '../workers/peakyConnectorTypes';
import React, { useEffect, useState } from 'react';
import { IonProgressBar } from '@ionic/react';

interface ProgressProps { 
  status: Status;
}
const Progress: React.FC<ProgressProps> = (props:ProgressProps) => {
  const progress = props.status.state_no / props.status.state_max;
  const sub_progress = props.status.sub_max ? props.status.sub_no / props.status.sub_max : undefined;
  return (
    <div>
      <p><IonProgressBar value={progress}></IonProgressBar></p>
      <p>{ props.status.state} { sub_progress && <span>({props.status.sub_no}/{props.status.sub_max})</span>}</p>
      { sub_progress && <p><IonProgressBar value={sub_progress}></IonProgressBar></p>}
    </div>
  );
};

export default Progress;
