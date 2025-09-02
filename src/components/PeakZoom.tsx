//import './Peaks.css';
import PeakView, {PeakViewRef} from './PeakView';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef, useTransformContext } from "react-zoom-pan-pinch";
import { useRef, useState, useEffect, useCallback } from "react";
import { GeoLocation, PeakWithDistance } from '@benjaminhae/peaky';
import { Geolocation as GeoLocationService } from '@capacitor/geolocation';
import compassHeading from '../compass_heading';
import { Dimensions } from '../workers/peakyConnectorTypes';

interface PeakZoomProps {
  dimensions: Dimensions;
  canvasDrawer: (canvas: OffscreenCanvas) => string;
  existingCanvasDrawer: (canvas: string) => void;
  peaks: Array<PeakWithDistance>;
}

const PeakZoom: React.FC<PeakZoomProps> = (props: PeakZoomProps) => {
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);
  const peakViewRef = useRef<PeakViewRef | null>(null);
  const [positionX, setPositionX] = useState(0);
  const [direction, setDirection] = useState(0);
  const [directionsDisabled, setDirectionsDisabled] = useState(false);

  const gotoDirection = (direction: number, fast: boolean = true) => {
    peakViewRef.current?.zoomToDirection(direction, fast);
    setDirection(direction);
  }

  const orientationListener = useCallback((event: DeviceOrientationEvent) => {
    if (event.alpha && event.beta && event.gamma) {
      gotoDirection(compassHeading(event.alpha, event.beta, event.gamma))
    }
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


  const movingStart = (ref: ReactZoomPanPinchRef) => {
    if (!directionsDisabled) {
      if (transformComponentRef.current) {
        setPositionX(transformComponentRef.current.instance.transformState.positionX / transformComponentRef.current.instance.transformState.scale);
      }
    }
    setDirectionsDisabled(true);
  }

  const movingEnd = (ref: ReactZoomPanPinchRef) => {
    if (transformComponentRef.current) {
      const offset = positionX - transformComponentRef.current?.instance.transformState.positionX / transformComponentRef.current?.instance.transformState.scale;
      peakViewRef.current?.writeOffset(offset);
    }
    setDirectionsDisabled(false);
  }

  return (
    <div>
      <div id="direction">{direction.toFixed(0)}°</div>
      <TransformWrapper 
          initialScale={1} 
          minScale={0.1}
          maxScale={20}
          ref={transformComponentRef} 
          onPanningStart={movingStart} 
          onPinchingStart={movingStart}
          onPanningStop={movingEnd} 
          onPinchingStop={movingEnd}>
        <PeakView 
          transformer={transformComponentRef} 
          ref={peakViewRef} 
          dimensions={props.dimensions} 
          canvasDrawer={props.canvasDrawer} 
          existingCanvasDrawer={props.existingCanvasDrawer} 
          peaks={props.peaks} />
      </TransformWrapper>
    </div>
  )
}

export default PeakZoom;
