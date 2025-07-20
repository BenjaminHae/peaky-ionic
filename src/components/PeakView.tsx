import './PeakView.css';
import { TransformComponent, ReactZoomPanPinchRef, useTransformContext } from "react-zoom-pan-pinch";
import { forwardRef, useImperativeHandle, useState } from 'react';
import { PluginListenerHandle } from '@capacitor/core';
import { Motion } from '@capacitor/motion';

interface ContainerProps { 
  transformer: ReactZoomPanPinchRef
}
export interface PeakViewRef {
  zoomToDirection: (direction: number, fast?: boolean) => void;
  writeOffset: (offset: number) => void;
};

const PeakView: React.FC<ContainerProps> = forwardRef<PeakViewRef, ContainerProps>((props, ref) => {
  const [width,setWidth] = useState(0);
  const [offset,setOffset] = useState(0);
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

  const onImgLoad = ({target: img}) => {
    setWidth(img.offsetWidth);
  };

  return (
        <TransformComponent>
          <div className="fullSize">

            <img className="peakImg"
              src="St.Gallenkirch.png"
              alt="Peaks"
              onLoad={onImgLoad}
            ></img>
          </div>
        </TransformComponent>
  );
});

export default PeakView;
