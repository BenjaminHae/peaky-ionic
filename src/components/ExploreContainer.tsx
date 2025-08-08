import './ExploreContainer.css';
import PeakView, {PeakViewRef} from './PeakView';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef, useTransformContext } from "react-zoom-pan-pinch";
import { useRef, useState, useEffect, useCallback } from "react";
import { GeoLocation } from '@benjaminhae/peaky';
import { Geolocation as GeoLocationService } from '@capacitor/geolocation';

interface ContainerProps { 
  location?: GeoLocation;
}

const compassHeading = (alpha, beta, gamma: number) => {

  // Convert degrees to radians
  var alphaRad = alpha * (Math.PI / 180);
  var betaRad = beta * (Math.PI / 180);
  var gammaRad = gamma * (Math.PI / 180);

  // Calculate equation components
  var cA = Math.cos(alphaRad);
  var sA = Math.sin(alphaRad);
  var cB = Math.cos(betaRad);
  var sB = Math.sin(betaRad);
  var cG = Math.cos(gammaRad);
  var sG = Math.sin(gammaRad);

  // Calculate A, B, C rotation components
  var rA = - cA * sG - sA * sB * cG;
  var rB = - sA * sG + cA * sB * cG;
  var rC = - cB * cG;

  // Calculate compass heading
  var compassHeading = Math.atan(rA / rB);

  // Convert from half unit circle to whole unit circle
  if(rB < 0) {
    compassHeading += Math.PI;
  }else if(rA < 0) {
    compassHeading += 2 * Math.PI;
  }

  // Convert radians to degrees
  compassHeading *= 180 / Math.PI;

  return compassHeading;
}


const ExploreContainer: React.FC<ContainerProps> = (props:ContainerProps) => {
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);
  const peakViewRef = useRef<PeakViewRef | null>(null);
  const [orientationAllowed, setOrientationAllowed] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [direction, setDirection] = useState(0);
  const [location, setLocation] = useState<GeoLocation|null>(null);
  const [directionsDisabled, setDirectionsDisabled] = useState(0);
  const [positionX, setPositionX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);

  const gotoDirection = (direction: number, fast: boolean = true) => {
    peakViewRef.current?.zoomToDirection(direction, fast);
    setDirection(direction);
  }
  
  const orientationListener = useCallback((event) => {
    gotoDirection(compassHeading(event.alpha, event.beta, event.gamma))
  }, [setDirectionsDisabled]);

  useEffect(() => {
    if (!directionsDisabled) {
      console.log("add event listener")
      window.addEventListener("deviceorientation", orientationListener);
    } else {
      console.log("remove event listener")
      window.removeEventListener("deviceorientation", orientationListener);
    }
    return () => window.removeEventListener("deviceorientation", orientationListener)
}, [directionsDisabled, orientationListener])

  const requestPermission = async () => {
    try {
      await DeviceMotionEvent.requestPermission();
      setOrientationAllowed(true);
      setDirectionsDisabled(false);
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
      setLocation(new GeoLocation(location.coords.latitude, location.coords.longitude));
    } catch (e){
      console.log(e);
    }
  }

  if (!orientationAllowed && !DeviceMotionEvent.hasOwnProperty('requestPermission')) {
    setOrientationAllowed(true);
    setDirectionsDisabled(false);
  }
  if (!locationAllowed) {
    requestLocationPermissions()
  }

  const movingStart = (ref: ReactZoomPanPinchRef) => {
    if (!directionsDisabled) {
      setPositionX(transformComponentRef.current?.instance.transformState.positionX / transformComponentRef.current?.instance.transformState.scale);
    }
    setDirectionsDisabled(true);
  }

  const movingEnd = (ref: ReactZoomPanPinchRef) => {
    const offset = positionX - transformComponentRef.current?.instance.transformState.positionX / transformComponentRef.current?.instance.transformState.scale;
    peakViewRef.current?.writeOffset(offset);
    setDirectionsDisabled(false);
  }

  return (
    <div id="container">
      { !orientationAllowed && <p><strong><button onClick={requestPermission}>Allow Location access</button></strong></p> }
      <div id="direction">{direction.toFixed(0)}°</div>
      <p>
        Move to <a onClick={()=>gotoDirection(0, false)}>North</a>, 
        <a onClick={()=>gotoDirection(90, false)}>East</a>, 
        <a onClick={()=>gotoDirection(180, false)}>South</a>, 
        <a onClick={()=>gotoDirection(270, false)}>West</a>
        { location && <span> {location.lat}, {location.lon}</span> }
      </p>
      <TransformWrapper 
          initialScale={1} 
          minScale={0.1}
          ref={transformComponentRef} 
          className="fullSize"
          onPanningStart={movingStart} 
          onPinchingStart={movingStart}
          onPanningStop={movingEnd} 
          onPinchingStop={movingEnd}>
        <PeakView transformer={transformComponentRef} ref={peakViewRef} location={location}/>
      </TransformWrapper>
    </div>
  );
};

export default ExploreContainer;
