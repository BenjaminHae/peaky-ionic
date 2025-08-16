import './PeakView.css';
import { TransformComponent, ReactZoomPanPinchRef, useTransformContext } from "react-zoom-pan-pinch";
import { forwardRef, useImperativeHandle, useState, useRef, useMemo, useEffect } from 'react';
import { PluginListenerHandle } from '@capacitor/core';
import { Motion } from '@capacitor/motion';
import Peaky, { GeoLocation } from '@benjaminhae/peaky';
import SrtmStorage from '../capacitor_srtm_storage';

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
  const [width,setWidth] = useState(0);
  const [offset,setOffset] = useState(0);
  const [text, setText] = useState<array<string>>([]);
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef(null);
  const transformContext = useTransformContext();
  const zoomToDirection = (dir: number, fast: boolean=true) => {
    if (props.transformer.current) {
      const { setTransform } = props.transformer.current;
      const scale = transformContext.transformState.scale;
      console.log(`zooming with offset ${offset}`);
      setTransform(-dir/360 * width * scale - offset*scale,transformContext.transformState.positionY, scale, fast ? 5 : 300);
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
    const write = (outtext:string) => {
      console.log(outtext);
      setText((s:Array<string>)=> [...s, outtext]);
    }
    //const location = [ 47.020156, 9.978416 ];
    const location = [ 49.227165, 9.1487209];// BW
    const storage = new SrtmStorage();
    const options = { };
    if (Capacitor.getPlatform() == 'web') {
      options.provider = '/cache/{lat}{lng}.SRTMGL3S.hgt.zip';
    }
    //const gl = new GeoLocation(location[0], location[1]);
    const gl = props.location.coords;
    if (props.location.elevation) {
      options.elevation = props.location.elevation;
    }
    write(`starting peak calculation`);
    const time = [performance.now()];
    const peaky = new Peaky(storage, gl, options);
    await peaky.init();
    time.push(performance.now());
    write(`init took ${time[1]-time[0]}`);
    await peaky.calculateRidges();
    time.push(performance.now());
    write(`calculating ridges took ${time[2]-time[1]}`);
    const { min_projected_height, max_projected_height, min_height, max_height } = peaky.getDimensions();
  
    write(`current elevation is ${peaky.view?.elevation}`);
    write(`found elevations from ${min_height} to ${max_height}, and ${peaky.view?.ridges.length} ridges`);
  
    await peaky.findPeaks();
    time.push(performance.now());
    write(`calculating peaks took ${time[3]-time[2]}`);
    write(`found ${peaky.peaks.length} peaks`);
    if (canvasRef.current) {
      const canHeight = max_projected_height - min_projected_height + 800;//200 is magic border constant
      const canWidth = peaky.options.circle_precision * 10;
      canvasRef.current.height = canHeight;
      canvasRef.current.width = canWidth;
      peaky.drawView(canvasRef.current);
      let scale = 0.1;
      if (containerRef.current) {
        scale = Math.min(windowDimensions.width/canWidth, containerRef.current.offsetHeight/canHeight)
        console.log(`containerWidth: ${windowDimensions.width}, canWidth: ${canWidth}, containerHeight: ${containerRef.current.offsetHeight}, canHeight: ${canHeight}, scale: ${scale}`);
        //scale *= 1 / transformContext.transformState.scale;
      }
      console.log(`setting width to ${canvasRef.current.offsetWidth * scale}`);
      setWidth(canvasRef.current.offsetWidth * scale);
      canvasRef.current.style.transformOrigin = '0 0';
      //todo: Scale to actual size of frame
      canvasRef.current.style.transform = `scale(${scale.toFixed(2)})`;
    }
  }
  useMemo(()=>getPeaks(), [canvasRef, props.location]);
  const textItems = text.map((line) => 
    <p>{line}</p>
  );

  return (
        <TransformComponent>
          <div className="fullSize" ref={containerRef}>
            <canvas ref={canvasRef} />
          </div>
        </TransformComponent>
  );
});

export default PeakView;
