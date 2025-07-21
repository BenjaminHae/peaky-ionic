import './ExploreContainer.css';
import PeakView, {PeakViewRef} from './PeakView';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef, useTransformContext } from "react-zoom-pan-pinch";
import { useRef, useState, useEffect, useCallback } from "react";

interface ContainerProps { }

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


const ExploreContainer: React.FC<ContainerProps> = () => {
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);
  const peakViewRef = useRef<PeakViewRef | null>(null);
  const [orientationAllowed, setOrientationAllowed] = useState(false);
  const [direction,setDirection] = useState(0);
  const [directionsDisabled,setDirectionsDisabled] = useState(0);
  const [positionX,setPositionX] = useState(0);
  const [offsetX,setOffsetX] = useState(0);

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
  if (!orientationAllowed && !DeviceMotionEvent.hasOwnProperty('requestPermission')) {
    setOrientationAllowed(true);
    setDirectionsDisabled(false);
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
      { !orientationAllowed && <strong><button onClick={requestPermission}>Allow Orientation access</button></strong> }
      <p>
        {direction.toFixed(0)}° { directionsDisabled &&  "Movement deactivated "} Move to 
        <a onClick={()=>gotoDirection(0, false)}>North</a>, 
        <a onClick={()=>gotoDirection(90, false)}>East</a>, 
        <a onClick={()=>gotoDirection(180, false)}>South</a>, 
        <a onClick={()=>gotoDirection(270, false)}>West</a>
      </p>
      <TransformWrapper 
          initialScale={2} 
          ref={transformComponentRef} 
          className="fullSize"
          onPanningStart={movingStart} 
          onPinchingStart={movingStart}
          onPanningStop={movingEnd} 
          onPinchingStop={movingEnd}>
        <PeakView transformer={transformComponentRef} ref={peakViewRef} />
      </TransformWrapper>
    </div>
  );
};

export default ExploreContainer;
