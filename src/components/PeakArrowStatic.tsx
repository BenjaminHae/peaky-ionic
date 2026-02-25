import './PeakArrow.css';
import { useTransformContext, useTransformEffect, useTransformInit,  } from "react-zoom-pan-pinch";
import { IonIcon } from '@ionic/react';
import { useRef, useState, useEffect, useCallback } from "react";
import { type GeoLocation, projected_height, type PeakWithDistance } from '@benjaminhae/peaky';
import { useResize } from "../use-resize.hook";

import Arrow from './arrow.svg?inline';

interface PeakArrowStaticProps { 
  selectedPeak?: PeakWithDistance;
  canvasScale: number;
  centralElevation: number;
}

const PeakArrowStatic: React.FC<PeakArrowStaticProps> = (props:PeakArrowStaticProps) => {
  const [elementOnScreen, setElementOnScreen] = useState<{x,y: number}>({x:0,y:0, angle:0, visible: true});
  const [initialized, setInitialized] = useState(false);
  const [transformation, setTransformation] = useState("");
  const instance = useTransformContext();

  const arrowContainer = useRef<HTMLDivElement | null>(null);
  const arrowElement = useRef<HTMLDivElement | null>(null);

  const getViewportSize = useCallback(() => {
    if (instance.wrapperComponent) {
      const rect = instance.wrapperComponent.getBoundingClientRect();

      return {
        width: rect.width,
        height: rect.height,
      };
    }
    return {
      width: 0,
      height: 0,
    };
  }, [instance.wrapperComponent]);

  const getContentSize = useCallback(() => {
    if (instance.contentComponent) {
      const rect = instance.contentComponent.getBoundingClientRect();

      return {
        width: rect.width / instance.transformState.scale,
        height: rect.height / instance.transformState.scale,
      };
    }
    return {
      width: 0,
      height: 0,
    };
  }, [instance.contentComponent, instance.transformState.scale]);


  const computeMiniMapScale = useCallback(() => {
    const contentSize = getContentSize();
    const scaleX = width / contentSize.width;
    const scaleY = height / contentSize.height;
    ///const scale = scaleY > scaleX ? scaleX : scaleY;
    //const scale = 1;

    return { scaleX, scaleY };
  }, [getContentSize]);

  //const computeMiniMapSize = () => {
  //  const contentSize = getContentSize();
  //  console.log(contentSize);
  //  //const scaleX = 1;
  //  //const scaleY = 1;
  //  const scaleX = width / contentSize.width;
  //  const scaleY = height / contentSize.height;
  //  if (scaleY > scaleX) {
  //    return { width, height: contentSize.height * scaleX };
  //  }
  //  const height = 800;
  //  return { width: contentSize.width * scaleY, height };
  //};

  const transformMiniMap = () => {
    const wrapSize = getContentSize();
    const viewportSize = getViewportSize(); // {width, height}
    const previewScale = props.canvasScale * instance.transformState.scale;

    //  peak position on scaled display:
    const peakPosition = {
      x: props.selectedPeak.direction * wrapSize.width/3600 * /*props.canvasScale */ 2 * previewScale,
      y: projected_height(props.centralElevation, props.selectedPeak.distance, props.selectedPeak.elevation, 0)
    }
    
    // visible from the original view coordinates?
    const visibleArea = {
      x: -instance.transformState.positionX * previewScale * 1/props.canvasScale,// perfect
      width: viewportSize.width * props.canvasScale * instance.transformState.scale * 2 // a bit too big
    }
    
    const isPeakVisible = peakPosition.x > visibleArea.x && peakPosition.x < visibleArea.x + visibleArea.width;

    const elementX = props.selectedPeak.direction * wrapSize.width/3600 * instance.transformState.scale + instance.transformState.positionX * previewScale;
    const elementY = projected_height(props.centralElevation, props.selectedPeak.distance, props.selectedPeak.elevation, 0);
    const angle = isPeakVisible ? 
			Math.atan2( -(elementY - 100), elementX) + Math.PI
	: (peakPosition.x < visibleArea.x ? 0 : (peakPosition.x > visibleArea.x+visibleArea.width ? Math.PI : 0));



    //position of arrow
    const elementPosition = {
      x: isPeakVisible ? elementX: viewportSize.width/2,
      y: elementY,
      angle,
      visible: isPeakVisible
    };
    setElementOnScreen(elementPosition);
    /*if (isPeakVisible) {
      const transform = instance.handleTransformStyles(
        -instance.transformState.positionX * previewScale,
        -instance.transformState.positionY * previewScale,
        1,
      );
      setTransformation(transform);
    } else*/ {
      setTransformation("");
    }
    
    /*if (mainRef.current) {
      mainRef.current.style.width = `${miniSize.width}px`;
      mainRef.current.style.height = `${miniSize.height}px`;
    }*/
    /*if (previewRef.current) {
      const size = getViewportSize();
      const scale = computeMiniMapScale();
      const previewScale = scale * (1 / instance.transformState.scale);
      const transform = instance.handleTransformStyles(
        -instance.transformState.positionX * previewScale,
        -instance.transformState.positionY * previewScale,
        1,
      );

      previewRef.current.style.transform = transform;
      previewRef.current.style.width = `${size.width * previewScale}px`;
      previewRef.current.style.height = `${size.height * previewScale}px`;
    }*/
  };

  const initialize = () => {
    transformMiniMap();
  };

  useTransformEffect(() => {
    transformMiniMap();
  });

  useTransformInit(() => {
    initialize();
    setInitialized(true);
  });

  useResize(instance.contentComponent, initialize, [initialized]);

  useEffect(() => {
    return instance.onChange((zpp) => {
      //const scale = computeMiniMapScale();
    });
  }, [computeMiniMapScale, instance]);

  const angle = 0;
  return (
    <div className="triangle-container" ref={arrowContainer} style={{
      left: 0,
      transform: 'translateX('+elementOnScreen.x+'px) ' + transformation,
      bottom: '100px',//`${elementOnScreen.y}px`,
      position: "absolute",
      zIndex: 100
    }}>
      <div className="triangle-up" ref={arrowElement} style={{
             transform:'rotate('+elementOnScreen.angle.toFixed(3)+'rad)', 
             transformOrigin:"left",
             fontSize: "3em"
           }}>
        <img src={Arrow} width={"50em"}/>
      </div>
      { !elementOnScreen.visible && <span>{props.selectedPeak.name}</span>}
    </div>
  );
};

export default PeakArrowStatic;
