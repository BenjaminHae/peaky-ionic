import './PeakView.css';
import { TransformComponent, ReactZoomPanPinchRef, useTransformContext, KeepScale } from "react-zoom-pan-pinch";
import { forwardRef, useImperativeHandle, useState, useRef, useMemo, useEffect } from 'react';
import { PluginListenerHandle } from '@capacitor/core';
import { Motion } from '@capacitor/motion';
import Peaky, { GeoLocation, projected_height } from '@benjaminhae/peaky';
import SrtmStorage from '../capacitor_srtm_storage';
import PeakLabel from './PeakLabel';

const MAGIC_CIRCLE_SCALE = 2;

interface ContainerProps { 
  transformer: ReactZoomPanPinchRef;
  location?: {coords: GeoLocation, elevation: number|null};
  canvasDrawer: (canvas: OffscreenCanvas) => void;
  peaks: Array<PeakWithElevation>;
}
export interface PeakViewRef {
  zoomToDirection: (direction: number, fast?: boolean) => void;
  writeOffset: (offset: number) => void;
};

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height
  };
}

const PeakView: React.FC<ContainerProps> = forwardRef<PeakViewRef, ContainerProps>((props, ref) => {
  const [width, setWidth] = useState(0);
  const [canvasScale, setCanvasScale] = useState(1);
  const [offset, setOffset] = useState(0);
  const [text, setText] = useState<array<string>>([]);
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [offscreen, setOffscreen] = useState<OffscreenCanvas|undefined>(undefined);
  const containerRef = useRef(null);
  const transformContext = useTransformContext();
  const zoomToDirection = (dir: number, fast: boolean=true) => {
    if (props.transformer.current) {
      const { setTransform } = props.transformer.current;
      const scale = transformContext.transformState.scale;
      console.log(`zooming with offset ${offset}`);
      let newPositionX = -dir/360 * width - offset 
      if (newPositionX < 0) {
        newPositionX += width;
      } else if (newPositionX > width) {
        newPositionX -= width;
      }
      setTransform(newPositionX * scale, transformContext.transformState.positionY, scale, fast ? 5 : 300);
    }
  };
  const writeOffset = (off: number) => {
    console.log(`writing offset ${offset}`);
    setOffset(offset + off);
  }
  useImperativeHandle(ref, () => ({
    zoomToDirection: (dir: number, fast: boolean=true) => {
      zoomToDirection(dir, fast);
    },
    writeOffset: (offset: number) => {
      writeOffset(offset);
    }
  }));
  // get screen size
  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const peakItems = useMemo(()=>
    props.peaks.map(
     (peak, index) => 
       <div 
         className="PeakContainer" 
         key={`peak-${index}`} 
         style={{
           left: peak.direction * MAGIC_CIRCLE_SCALE, 
           bottom: projected_height(props.dimensions.central_elevation, peak.distance, peak.elevation, 0), 
           transform:`scale(${(1/canvasScale).toFixed(2)})`, 
           transformOrigin:"bottom left"
         }}>
         <KeepScale style={{transformOrigin:"bottom left"}}><PeakLabel name={peak.name} elevation={peak.elevation.toFixed(0)}/></KeepScale>
       </div>
     ), [props.peaks, props.dimensions]);

  const canHeight = props.dimensions.max_projected_height - props.dimensions.min_projected_height + 800;//800 is magic border constant, für Gipfel
  const canWidth = props.dimensions.circle_precision * MAGIC_CIRCLE_SCALE;

  useEffect(()=> {
    if(canvasRef.current) {
      try {
        setOffscreen(canvasRef.current.transferControlToOffscreen());
      } catch {
      }
    }
  }, [canvasRef]);
  useEffect(()=> {
    if (canvasRef.current && offscreen) {
      props.canvasDrawer(offscreen);
      let scale = 0.1;
      if (containerRef.current) {
        scale = Math.min(windowDimensions.width/canWidth, containerRef.current.offsetHeight/canHeight);
        console.log(`containerWidth: ${windowDimensions.width}, canWidth: ${canWidth}, containerHeight: ${containerRef.current.offsetHeight}, canHeight: ${canHeight}, scale: ${scale}`);
      }
      console.log(`setting width to ${canvasRef.current.offsetWidth * scale}`);
      setWidth(canvasRef.current.offsetWidth * scale);
      setCanvasScale(scale);
    }
  }, [props.canvasDrawer, offscreen, props.dimensions]);

  return (
        <TransformComponent>
          <div className="fullSize" ref={containerRef}>
            <div style={{transformOrigin: '0 0', transform:"scale("+canvasScale.toFixed(2)+")", position: "relative"}}>
              {peakItems}
              <canvas className="canvas" ref={canvasRef} height={canHeight} width={canWidth} />
            </div>
          </div>
        </TransformComponent>
  );
});

export default PeakView;
