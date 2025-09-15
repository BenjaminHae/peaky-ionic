import './Peaks.css';
import PeakZoom from './PeakZoom';
import PeakList from './PeakList';
import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { GeoLocation, PeakWithDistance } from '@benjaminhae/peaky';
import { Geolocation as GeoLocationService } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import PeakyWorkerConnector from '../workers/peakyWorkerConnector';
import { Dimensions, Status } from '../workers/peakyConnectorTypes';
import Progress from './Progress';

interface PeaksProps { 
  selected_area: string;
  set_possible_selections: (possibilities: Array<string>) => void;
}

const Peaks: React.FC<PeaksProps> = (props: PeaksProps) => {
  const [orientationAllowed, setOrientationAllowed] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [location, setLocation] = useState<{coords: GeoLocation, elevation?: number|null}|null>(null);
  const [dimensions, setDimensions] = useState<Dimensions|null>(null);
  const [peaks, setPeaks] = useState<Array<PeakWithDistance>>([]);
  const [status, setStatus] = useState<Status>();

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
         props.set_possible_selections(['silhouette']);
         setPeaks(await peakyWorker.getPeaks());
         props.set_possible_selections(['silhouette', 'map', 'list']);
       }
     }
     callInit();
  }, [peakyWorker, location]);

  const callCanvasDrawer = (canvas: OffscreenCanvas) => peakyWorker.drawToCanvas(canvas);
  const callExistingCanvasDrawer = (id: string) => peakyWorker.drawToCanvasId(id);

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

  return (
    <div id="container">
      { !orientationAllowed && <p><strong><button onClick={requestPermission}>Allow Location access</button></strong></p> }
      { status && status.state_no < 5 &&
        <Progress status={status}/>
      }
      <p>
        { location && <span> {location.coords.lat}, {location.coords.lon}{location.elevation && ", "+location.elevation.toFixed(0)+" m" }</span> }
      </p>
      { props.selected_area == 'list' && peaks.length > 0 && <PeakList peaks={peaks}/>}
      { props.selected_area == 'map' && peaks.length > 0 && <div>Map</div> }
      { props.selected_area == 'silhouette' && dimensions && <PeakZoom dimensions={dimensions} canvasDrawer={callCanvasDrawer} existingCanvasDrawer={callExistingCanvasDrawer} peaks={peaks} /> }
    </div>
  );
};

export default Peaks;
