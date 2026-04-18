import './PeakLabel.css';
import { useState } from 'react';

interface PeakLabelProps { 
  name: string;
  elevation: string;
  showByDefault: boolean;
}
const PeakLabel: React.FC<PeakLabelProps> = (props:PeakLabelProps) => {
  const [selected, setSelected] = useState<boolean>(false);
  return (
    <div className="labelContainer" style={{zIndex: props.elevation}}>
      <div className="peakStroke" onClick={()=>{setSelected((val)=>!val)}} >
        {(props.showByDefault || selected) && 
          <div className="peakLabel">{props.name} - {props.elevation} m</div>
        }
      </div>
    </div>
  );
};

export default PeakLabel;
