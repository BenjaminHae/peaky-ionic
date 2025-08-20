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
  const [peaks, setPeaks] = useState([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  const getPeaks = async () => {
    if (!props.location || ! canvasRef.current) {
      return;
    }
    const write_message = (outtext:string) => {
      console.log(outtext);
      setText((s:Array<string>)=> [...s, outtext]);
    }
    try {
      const location = [ 47.020156, 9.978416 ];//St. Gallenkirch
      //const location = [ 49.227165, 9.1487209];// BW
      const storage = new SrtmStorage();
      const options = { };
      let gl = props.location.coords;
      if (Capacitor.getPlatform() == 'web') {
        options.provider = '/cache/{lat}{lng}.SRTMGL3S.hgt.zip';
        gl = new GeoLocation(location[0], location[1]);
      }
      else {
        if (props.location.elevation) {
          options.elevation = props.location.elevation;
        }
      }
      write_message(`starting peak calculation`);
      const time = [performance.now()];
      const peaky = new Peaky(storage, gl, options);
      await peaky.init();
      time.push(performance.now());
      write_message(`init took ${time[1]-time[0]}`);
      await peaky.calculateRidges();
      time.push(performance.now());
      write_message(`calculating ridges took ${time[2]-time[1]}`);
      const { min_projected_height, max_projected_height, min_height, max_height } = peaky.getDimensions();
  
      write_message(`current elevation is ${peaky.view?.elevation}`);
      write_message(`found elevations from ${min_height} to ${max_height}, and ${peaky.view?.ridges.length} ridges`);
  
      await peaky.findPeaks();
      time.push(performance.now());
      write_message(`calculating peaks took ${time[3]-time[2]}`);
      write_message(`found ${peaky.peaks.length} peaks`);

      if (canvasRef.current) {
        const canHeight = max_projected_height - min_projected_height;// + 800;//800 is magic border constant, für Gipfel
        const canWidth = peaky.options.circle_precision * MAGIC_CIRCLE_SCALE;
        canvasRef.current.height = canHeight;
        canvasRef.current.width = canWidth;
        peaky.drawView(canvasRef.current, false); // true schreibt die Gipfel
        let scale = 0.1;
        if (containerRef.current) {
          scale = Math.min(windowDimensions.width/canWidth, containerRef.current.offsetHeight/canHeight)
          console.log(`containerWidth: ${windowDimensions.width}, canWidth: ${canWidth}, containerHeight: ${containerRef.current.offsetHeight}, canHeight: ${canHeight}, scale: ${scale}`);
          //scale *= 1 / transformContext.transformState.scale;
        }
        console.log(`setting width to ${canvasRef.current.offsetWidth * scale}`);
        setWidth(canvasRef.current.offsetWidth * scale);
        setCanvasScale(scale);
        //canvasRef.current.style.transformOrigin = '0 0';
        //canvasRef.current.style.transform = `scale(${scale.toFixed(2)})`;
        time.push(performance.now());
        write_message(`drawing took ${time[4]-time[3]}`);
      }
      setPeaks(peaky.peaks);
    } catch(e) {
      write_message(e.toString());
    }
  }
  useMemo(()=>getPeaks(), [canvasRef, props.location]);
  const textItems = text.map((line) => 
    <p>{line}</p>
  );
// todo: get elevation even if not present in location.elevation
  const peakItems = peaks.map((peak, index) => <div className="PeakContainer" key={`peak-${index}`} style={{left: peak.direction *MAGIC_CIRCLE_SCALE, bottom: projected_height(props.location.elevation, peak.distance, peak.elevation, 0)}}><KeepScale><PeakLabel name={peak.name} elevation={peak.elevation.toFixed(0)}/></KeepScale></div>);

  return (
        <TransformComponent>
          <div className="fullSize" ref={containerRef}>
            <div style={{transformOrigin: '0 0', transform:"scale("+canvasScale.toFixed(2)+")", position: "relative"}}>
              {peakItems}
              <canvas className="canvas" ref={canvasRef} />
            </div>
          </div>
        </TransformComponent>
  );
});

export default PeakView;
