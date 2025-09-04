import './PeakArrow.css';
import { KeepScale } from "react-zoom-pan-pinch";

interface PeakArrowProps { 
  elementX: number;
  elementY: number;
  x: number;
  y: number;
}
const PeakArrow: React.FC<PeakArrowProps> = (props:PeakArrowProps) => {
  // todo rotate und ggf. bewegen
  const angle = Math.atan2(-(props.elementY-props.y), props.elementX-props.x);
  console.log(`${props.elementY} ${props.y} ${props.elementX} ${props.x}: ${angle}`);
  return (
    <div className="triangle-container" style={{
      left: props.x, 
      bottom: props.y,
      position: "absolute",
    }}>
      <KeepScale style={{transformOrigin:"bottom left"}}>
        <div className="triangle-up" style={{
               transform:'rotate('+angle.toFixed(3)+'rad)', 
               transformOrigin:"right",
               fontSize: "3em"
             }}>
           PFEIL
        </div>
      </KeepScale>
    </div>
  );
};

export default PeakArrow;
