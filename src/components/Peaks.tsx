import './Peaks.css';
import PeakZoom from './PeakZoom';
import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { GeoLocation } from '@benjaminhae/peaky';
import { Geolocation as GeoLocationService } from '@capacitor/geolocation';
import PeakyWorkerConnector from '../workers/peakyWorkerConnector';
import { Dimensions } from '../workers/peakyConnectorTypes';

const Peaks: React.FC = () => {
  const [orientationAllowed, setOrientationAllowed] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [location, setLocation] = useState<{coords: GeoLocation, elevation: number|null}|null>(null);
  const [dimensions, setDimensions] = useState<Dimensions|null>(null);
  const [peaks, setPeaks] = useState<Array<PeakWithElevation>>([]);

  const peakyWorker = useMemo(() => new PeakyWorkerConnector(), []);
 
  useEffect(
   () => {
     const callInit = async () => {
       if (location) {
         const options = { };
         if (Capacitor.getPlatform() == 'web') {
           options.provider = '/cache/{lat}{lng}.SRTMGL3S.hgt.zip';
         }
         options.elevation = location.elevation;
         peakyWorker.init(location.coords, options);
         const _dimensions = await peakyWorker.getDimensions();
         setDimensions(_dimensions);
         setPeaks(await peakyWorker.getPeaks());
       }
     }
     callInit();
  }, [peakyWorker, location]);

  const callCanvasDrawer = (canvas: OffscreenCanvas) => {
    peakyWorker.drawToCanvas(canvas);
  }

  const requestPermission = async () => {
    try {
      await DeviceMotionEvent.requestPermission();
      setOrientationAllowed(true);
    } catch {
    }
  }
  const requestLocationPermissions = async () => {
    try {
      const perm = await GeoLocationService.checkPermissions();
      if (!perm.location || ! perm.coarseLocation) {
        await GeoLocationService.requestPermissions('coarseLocation');
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

        /*Move to <a onClick={()=>gotoDirection(0, false)}>North</a>, 
        <a onClick={()=>gotoDirection(90, false)}>East</a>, 
        <a onClick={()=>gotoDirection(180, false)}>South</a>, 
        <a onClick={()=>gotoDirection(270, false)}>West</a>*/
  return (
    <div id="container">
      { !orientationAllowed && <p><strong><button onClick={requestPermission}>Allow Location access</button></strong></p> }
      <p>
        { location && <span> {location.coords.lat}, {location.coords.lon}{location.elevation && ", "+location.elevation.toFixed(0)+" m" }</span> }
      </p>
      { dimensions && <PeakZoom dimensions={dimensions} canvasDrawer={callCanvasDrawer} peaks={peaks} /> }
    </div>
  );
};

export default Peaks;
