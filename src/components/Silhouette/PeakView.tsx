import './PeakView.css';
import { TransformComponent, ReactZoomPanPinchRef, useTransformContext, KeepScale } from "react-zoom-pan-pinch";
import { forwardRef, useImperativeHandle, useState, useRef, useMemo, useEffect } from 'react';
import { PluginListenerHandle } from '@capacitor/core';
import { Motion } from '@capacitor/motion';
import { type GeoLocation, projected_height, type PeakWithDistance } from '@benjaminhae/peaky';
import SrtmStorage from '../../capacitor_srtm_storage';
import PeakLabel from './PeakLabel';
import PeakArrow from './PeakArrow';
import PeakArrowStatic from './PeakArrowStatic';
import { IonButton } from '@ionic/react';
import { type Dimensions } from '../../workers/peakyConnectorTypes';


const MAGIC_CIRCLE_SCALE = 2;

interface ContainerProps { 
  transformer: ReactZoomPanPinchRef;
  location: GeoLocation;
  canvasDrawer: (canvas: OffscreenCanvas, darkMode: boolean) => string;
  existingCanvasDrawer: (canvas: string, darkMode: boolean) => void;
  peaks: Array<PeakWithDistance>;
  dimensions: Dimensions;
  selectedPeak?: PeakWithDistance;
  peakIteration: number;
}
export interface PeakViewRef {
  zoomToDirection: (direction: number, fast?: boolean) => void;
  writeOffset: (offset: number) => void;
  resetOffset: () => void;
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
  const [text, setText] = useState<Array<string>>([]);
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);
  const canvasRef3 = useRef<HTMLCanvasElement>(null);
  const [offscreen, setOffscreen] = useState<OffscreenCanvas|undefined>(undefined);
  const [offscreen2, setOffscreen2] = useState<OffscreenCanvas|undefined>(undefined);
  const [offscreen3, setOffscreen3] = useState<OffscreenCanvas|undefined>(undefined);
  const [offscreenId, setOffscreenId] = useState<string>("");
  const [offscreenId2, setOffscreenId2] = useState<string>("");
  const [offscreenId3, setOffscreenId3] = useState<string>("");
  const containerRef = useRef(null);
  const transformContext = useTransformContext();
  const zoomToDirection = (dir: number, fast: boolean=true) => {
    if (props.transformer.current) {
      const { setTransform } = props.transformer.current;
      const scale = transformContext.transformState.scale;
      let newPositionX = -(dir % 360)/360 * width - offset 
      while (newPositionX < 0) {
        newPositionX += width;
      }
      while (newPositionX > width) {
        newPositionX -= width;
      }
      setTransform(newPositionX * scale, transformContext.transformState.positionY, scale, fast ? 5 : 300);
    }
  };
  const writeOffset = (off: number) => {
    setOffset((offset)=>(offset + off) % width);
  }
  useImperativeHandle(ref, () => ({
    zoomToDirection: (dir: number, fast: boolean=true) => {
      zoomToDirection(dir, fast);
    },
    writeOffset: (offset: number) => {
      writeOffset(offset);
    },
    resetOffset: () => {
      setOffset(0);
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

  const canHeight = props.dimensions.max_projected_height - props.dimensions.min_projected_height// + 800;//800 is magic border constant, für Gipfel
  const canWidth = props.dimensions.circle_precision;

  const [regionData, setRegionData] = useState(undefined);
  useEffect(() => {
    load()
    async function load() {
      const response = await fetch("/regions.json");
      const file = await response.json();
      setRegionData(file) // this is optional
    }
  },[])

  const regions = useMemo(()=>{
        const regionIds = [...new Set(props.peaks.map(r=>r.region).filter(r=>(r !== null && r !== undefined && r !== 0)))]
        const regionInfo = regionIds.map(r=> {
          const regionPeaks = props.peaks
            .filter(p=>p.region==r)
            .sort((p1,p2)=>p1.direction-p2.direction);
          return regionPeaks.reduce(
              (acc, val, ind, arr) => {
                let prev_idx;
                let distance = 0;
                if (ind > 0) {
                  prev_idx = ind - 1;
                }
                else {
                  prev_idx = arr.length - 1;
                  distance = canWidth;
                }
                distance = distance + val.direction - arr[prev_idx].direction
 
		if (distance > acc.max_distance) {
                  // left_item is the most left peak of the region, the distance however is that of the empty area!
                  acc.right_item = {direction: arr[prev_idx].direction, idx: prev_idx}
                  acc.left_item = {direction: val.direction, idx: ind}
                  acc.max_distance = distance
                }
                return acc;
              },
              {left_item:undefined, right_item:undefined, max_distance:0, region: r, peaks: regionPeaks}
            )
          }
        );
        return regionInfo.filter(r => (r.region != 0 && r.region && r.peaks.length > 1)).map((region) => [-1,0,1].map(
            (canvasId, cIndex) => 
            <div key={`region-${region}-${cIndex}`} style={{
                   position: "absolute",
                   bottom: "0em", 
                   height: "1em",
                   left: (canvasId * canWidth + region.left_item.direction) * MAGIC_CIRCLE_SCALE,
                   minWidth: (region.right_item.direction - region.left_item.direction) * MAGIC_CIRCLE_SCALE + (region.right_item.direction > region.left_item.direction ? 0 : canWidth)
               }}>
               <div style={{
                 width: (region.right_item.direction - region.left_item.direction) * MAGIC_CIRCLE_SCALE + (region.right_item.direction > region.left_item.direction ? 0 : canWidth),
                 borderTop: `0.5em solid light-dark(black, white)`
               }}>
               </div>
               <KeepScale style={{transformOrigin:"top left", width: "100%"}}>
                 <div style={{width:"100%",
                   textAlign: "left",
                   font: "7em serif"
                   }}>
                   {regionData? regionData[region.region] : region.region}
                 </div>
               </KeepScale>
            </div>
        ));
      }
   , [props.peaks, props.dimensions, canvasScale, regionData]);

  const peakItems = useMemo(()=>{
    const minHeight = props.dimensions.min_projected_height;
    return props.peaks.map(
     (peak, index) => [-1,0,1].map( (canvasId, index2) => 
         <div 
           className="PeakContainer" 
           key={`peak-${index}-${index2}`} 
           style={{
             left: (canvasId * canWidth + peak.direction) * MAGIC_CIRCLE_SCALE, 
             bottom: projected_height(props.dimensions.central_elevation, peak.distance, peak.elevation, 0) - props.dimensions.min_projected_height, 
             transform:`scale(${(1/canvasScale).toFixed(2)})`, 
             transformOrigin:"bottom left",
             zIndex: peak.direction
           }}>
           <KeepScale style={{transformOrigin:"bottom left"}}><PeakLabel showByDefault={peak.heighestInCluster} name={peak.name} elevation={peak.elevation.toFixed(0)} /></KeepScale>
         </div>
         )
       )
     }
     , [props.peaks, props.dimensions, canvasScale]);

  useEffect(()=> {
    if(canvasRef.current) {
      try {
        setOffscreen(canvasRef.current.transferControlToOffscreen());
      } catch {
      }
    }
  }, [canvasRef.current]);
  useEffect(()=> {
    if(canvasRef2.current) {
      try {
        setOffscreen2(canvasRef2.current.transferControlToOffscreen());
      } catch {
      }
    }
  }, [canvasRef2.current]);
  useEffect(()=> {
    if(canvasRef3.current) {
      try {
        setOffscreen3(canvasRef3.current.transferControlToOffscreen());
      } catch {
      }
    }
  }, [canvasRef3.current]);
  const darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  useEffect(()=> {
    console.log('try repainting canvas')
    if (canvasRef.current && offscreen) {
      console.log('exists')
      const newId = props.canvasDrawer(offscreen, darkMode);
      if (newId !== "") {
        setOffscreenId(newId);
      }
      else if (offscreenId !== "") {
        props.existingCanvasDrawer(offscreenId, darkMode);
      }
      let scale = 0.1;
      if (containerRef.current) {
        console.log(`setting canvas scale from Math.min(windowDimensions.width/(canWidth*MAGIC_CIRCLE_SCALE), containerRef.current.offsetHeight/canHeight)`);
        console.log(`setting canvas scale from Math.min(${windowDimensions.width}/(${canWidth}*MAGIC_CIRCLE_SCALE), ${containerRef.current.offsetHeight}/${canHeight})`);
        scale = Math.min(windowDimensions.width/(canWidth*MAGIC_CIRCLE_SCALE), containerRef.current.offsetHeight/canHeight);
      }
      setWidth(canvasRef.current.offsetWidth * scale * MAGIC_CIRCLE_SCALE);
      console.log(`setting canvas Scale to ${scale}`);
      setCanvasScale(scale);
    }
  }, [offscreen, props.dimensions]);
  useEffect(()=> {
    if (offscreen2) {
      const newId = props.canvasDrawer(offscreen2, darkMode);
      if (newId !== "") {
        setOffscreenId2(newId);
      }
      else if (offscreenId !== "") {
        props.existingCanvasDrawer(offscreenId2, darkMode);
      }
    }
  }, [offscreen2, props.dimensions]);
  useEffect(()=> {
    if (offscreen3) {
      const newId = props.canvasDrawer(offscreen3, darkMode);
      if (newId !== "") {
        setOffscreenId3(newId);
      }
      else if (offscreenId !== "") {
        props.existingCanvasDrawer(offscreenId3, darkMode);
      }
    }
  }, [offscreen3, props.dimensions]);

  const directions = ["N","O","S","W"].map((dir, index) => {
      return [-1,0,1].map((canvasId) => {
        return (<div 
                 key={`key-${index}-${canvasId}`} 
                 style={{
                     position:"absolute", 
                     bottom:0, 
                     left: 2*(canWidth/4 * index + canvasId * canWidth), 
                     height:"100%", 
                     width:"1px", 
                     borderLeftWidth: `${dir==="N" || dir === "S" ? "10" : "5"}px`,
                     borderLeftStyle: dir==="N" ? "solid" : "dashed",
                     borderLeftColor: `${dir==="N" ? "red" : "light-dark(grey, white)"}`, 
                     fontSize: "5em"
               }}>
                 <KeepScale>{dir}</KeepScale>
          </div>)
      });
    });
  
  return (
        <>
        { props.peaks.length > 0 && 
          <PeakArrowStatic 
            selectedPeak={ props.peaks[0] } 
            canvasScale={ canvasScale }
            centralElevation={props.dimensions.central_elevation} 
          /> }
        <TransformComponent
          wrapperStyle={{width: "100%", height: "100%"}}
          contentStyle={{width: "100%", height: "100%"}}
          >
          <div className="fullSize" ref={containerRef}>
            <div style={{transformOrigin: '0 0', transform:`scale(${canvasScale.toFixed(2)})`, position: "relative"}}>
              <canvas className="canvas" ref={canvasRef2} height={canHeight} width={canWidth} style={{transformOrigin: '0 0', transform:`scaleX(${MAGIC_CIRCLE_SCALE})`, position: "absolute", left: `-${canWidth*2}px`, top: '0px'}}/>
              <canvas className="canvas" ref={canvasRef} height={canHeight} width={canWidth} style={{transformOrigin: '0 0', transform:`scaleX(${MAGIC_CIRCLE_SCALE})`}}/>
              <canvas className="canvas" ref={canvasRef3} height={canHeight} width={canWidth} style={{transformOrigin: '0 0', transform:`scaleX(${MAGIC_CIRCLE_SCALE})`, position: "absolute", left: `${canWidth*2}px`, top: '0px'}}/>
              {directions}
              {regions}
              {peakItems}
              { props.selectedPeak && 
                <PeakArrow 
                  elementX={props.selectedPeak.direction * MAGIC_CIRCLE_SCALE} 
                  elementY={projected_height(props.dimensions.central_elevation, props.selectedPeak.distance, props.selectedPeak.elevation, 0)} 
                  viewportX={ -transformContext.transformState.positionX * MAGIC_CIRCLE_SCALE} 
                  viewportY={ -transformContext.transformState.positionY} 
                  viewportHeight={windowDimensions.height} 
                  viewportWidth={windowDimensions.width} 
                  viewportScale={transformContext.transformState.scale} 
                  canvasScale={ canvasScale }
                /> 
              }
            </div>
          </div>
        </TransformComponent>
        </>
  );
});

export default PeakView;
