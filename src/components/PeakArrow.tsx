import './PeakArrow.css';
import { KeepScale } from "react-zoom-pan-pinch";
import { IonIcon } from '@ionic/react';
import Arrow from './arrow.svg?inline';

interface PeakArrowProps { 
  elementX: number;
  elementY: number;
  x: number;
  y: number;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
  viewportScale: number;
  canvasScale: number;
}

const PeakArrow: React.FC<PeakArrowProps> = (props:PeakArrowProps) => {
  // todo: Größe des Pfeils in Abhängigkeit von Entfernung
  // todo: Pfeil muss immer sichtbar sein
  // element is visible
  let xPos = 0;
  let yPos = 0;
  const canvasXfromTransformX = (x:number): number => props.viewportX/(props.viewportScale*props.canvasScale*2)
  const canvasYfromTransformY = (y:number): number => props.viewportY/(props.viewportScale*props.canvasScale)
  // correct way to calculate x position on canvas(!) is props.viewportX/(props.viewportScale*props.canvasScale*2)
  // correct way to calculate distance to viewport right: props.viewportWidth/(props.viewportScale*props.canvasScale)

  console.log(`element position: ${props.elementX},${props.elementY}`);
  const visibleX = canvasXfromTransformX(props.viewportX) < props.elementX && (canvasXfromTransformX(props.viewportX) + props.viewportWidth/(props.viewportScale*props.canvasScale)) > props.elementX
  const visibleY = true//canvasYfromTransformY(props.viewportY) < props.elementY && (canvasYfromTransformY(props.viewportY) + props.viewportHeight/(props.viewportScale*props.canvasScale)) > props.elementY
  if (visibleX && visibleY) {
    console.log(`element is visible`);
    xPos = props.elementX;
    yPos = props.elementY;
  }
  else {
    console.log(`element is outside viewing range`);
    xPos = props.viewportX + 0.5 * props.viewportWidth*props.viewportScale * props.canvasScale;
    yPos = props.viewportY + 0.5// * props.viewportHeight*props.viewportScale * props.canvasScale;
  }
  // todo rotate und ggf. bewegen
  const angle = Math.atan2(-(props.elementY-yPos), props.elementX-xPos)+ Math.PI;
  return (
    <div className="triangle-container" style={{
      //left: props.x, 
      transform: 'translateX('+xPos+'px)',
      bottom: `${yPos}px`,
      position: "absolute",
    }}>
      <KeepScale style={{transformOrigin:"bottom left"}}>
        <div className="triangle-up" style={{
               transform:'rotate('+angle.toFixed(3)+'rad)', 
               transformOrigin:"left",
               fontSize: "3em"
             }}>
          <img src={Arrow} width={"500em"}/>
        </div>
      </KeepScale>
    </div>
  );
};

export default PeakArrow;
