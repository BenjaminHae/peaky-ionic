import './Peaks.css';
import PeakZoom from './PeakZoom';
import PeakList from './PeakList';
import PeakMapContainer from './PeakMapContainer';
import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { GeoLocation, PeakWithDistance } from '@benjaminhae/peaky';
import { Geolocation as GeoLocationService } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import PeakyWorkerConnector from '../workers/peakyWorkerConnector';
import { Dimensions, Status } from '../workers/peakyConnectorTypes';
import Progress from './Progress';
import { IonToolbar, IonButton, IonButtons, IonIcon  } from '@ionic/react';
import { mapOutline, navigateCircleOutline, listCircleOutline } from 'ionicons/icons';

interface PeaksProps { 
  selected_area: string;
  set_possible_selections: (possibilities: Array<string>) => void;
  set_selection: (selection: string) => void;
}

const Peaks: React.FC<PeaksProps> = (props: PeaksProps) => {
  const [orientationAllowed, setOrientationAllowed] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [location, setLocation] = useState<{coords: GeoLocation, elevation?: number|null}|null>(null);
  const [dimensions, setDimensions] = useState<Dimensions|null>(null);
  const [peaks, setPeaks] = useState<Array<PeakWithDistance>>([]);
  const [status, setStatus] = useState<Status>();
  const [selectedPeak, setSelectedPeak] = useState<PeakWithDistance|undefined>();

  const [selectedArea, setSelectedArea] = useState<string>('silhouette');
  const [selectItems, setSelectItems] = useState<Array<string>>([]);
  const possibleSelectItems = {'map': mapOutline, 'list': listCircleOutline, 'silhouette': navigateCircleOutline};
  const areaSelector = (items: Array<string>) => {
    setSelectItems(items.map((item) => [item, possibleSelectItems[item]]));
  }; 

  const peakyWorker = useMemo(() => new PeakyWorkerConnector(), []);
 
  useMemo(
   () => {
     const callInit = async () => {
       if (location) {
         const options = {};
         if (location.elevation !== null) 
         (options as any).elevation = location.elevation;
         if (Capacitor.getPlatform() == 'web') {
           (options as any).provider = '/cache/{lat}{lng}.SRTMGL3S.hgt.zip';
         }
         peakyWorker.subscribeStatus((s) => setStatus(s));
         await peakyWorker.init(location.coords, options);
         const _dimensions = await peakyWorker.getDimensions();
         setDimensions(_dimensions);
         areaSelector(['silhouette']);
         setPeaks(await peakyWorker.getPeaks());
         areaSelector(['silhouette', 'map', 'list']);
       }
     }
     callInit();
  }, [peakyWorker, location]);

  const callCanvasDrawer = (canvas: OffscreenCanvas, darkMode: boolean) => peakyWorker.drawToCanvas(canvas, darkMode);
  const callExistingCanvasDrawer = (id: string, darkMode: boolean) => peakyWorker.drawToCanvasId(id, darkMode);

  const requestPermission = async () => {
    try {
      await (DeviceMotionEvent as any).requestPermission();
      setOrientationAllowed(true);
    } catch {
    }
  }
  const requestLocationPermissions = async () => {
    try {
      const perm = await GeoLocationService.checkPermissions();
      if (!perm.location || ! perm.coarseLocation) {
        await GeoLocationService.requestPermissions({permissions: ['coarseLocation']});
      }
      setLocationAllowed(true);
      const location = await GeoLocationService.getCurrentPosition({enableHighAccuracy: true});

      // for debugging purposes use a static location for web
      if (Capacitor.getPlatform() == 'web') {
        const location = [ 47.020156, 9.978416 ];//St. Gallenkirch
        setLocation({coords: new GeoLocation(location[0], location[1])});
      }
      else {
        setLocation({coords: new GeoLocation(location.coords.latitude, location.coords.longitude), elevation: location.coords.altitude});
      }
    } catch (e){
      console.log(e);
    }
  }

  if (!orientationAllowed && !DeviceMotionEvent.hasOwnProperty('requestPermission')) {
    setOrientationAllowed(true);
  }
  if (!locationAllowed) {
    requestLocationPermissions()
  }

  
  const peak_selector = (peak: PeakWithDistance, display?:'map'|'silhouette') => {
    setSelectedPeak(peak);
    if (peak && display) {
      setSelectedArea(display);
    }
  };

  const selectorButtons = selectItems.map((item) =>
    <IonButton key={item[0]} onClick={()=>{setSelectedArea(item[0])}} fill={selectedArea == item[0] ? "solid" : "clear"} >
      <IonIcon slot="icon-only" icon={item[1]}></IonIcon>
    </IonButton>
  );

  return (
    <>
      <IonToolbar>
        <p>
          { location ? <span> {location.coords.lat}, {location.coords.lon}{location.elevation && ", "+location.elevation.toFixed(0)+" m" }</span> : <span>Waiting for location ...</span>}
        </p>
        <IonButtons slot="end">
          { selectorButtons }
        </IonButtons>
      </IonToolbar>
      <div id="container">
        { !orientationAllowed && <p><strong><button onClick={requestPermission}>Allow Location access</button></strong></p> }
        { status && status.state_no < 5 &&
          <Progress status={status}/>
        }
        { dimensions && 
          <div
            style={{display: selectedArea == 'silhouette' ? 'block' : 'none'}}
          >
            <PeakZoom 
              dimensions={dimensions} 
              canvasDrawer={callCanvasDrawer} 
              existingCanvasDrawer={callExistingCanvasDrawer} 
              peaks={peaks}
              selectedPeak={selectedPeak} 
              unselectPeak={() => {peak_selector(undefined)}}
            /> 
          </div>}
        { selectedArea == 'list' && peaks.length > 0 && <PeakList peaks={peaks} peak_selector={peak_selector}/>}
        { selectedArea == 'map' && peaks.length > 0 && 
          <PeakMapContainer 
            peaks={peaks} 
            lat={location.coords.lat} 
            lon={location.coords.lon}
            selectedPeak={selectedPeak} 
            peak_selector={peak_selector}
          /> 
        }
      </div>
    </>
  );
};

export default Peaks;
