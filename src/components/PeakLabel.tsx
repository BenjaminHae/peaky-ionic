import './PeakLabel.css';

interface PeakLabelProps { 
  name: string;
  elevation: string;
  left: number;
}
const PeakLabel: React.FC<PeakLabelProps> = (props:PeakLabelProps) => {
  return (
    <div className="labelContainer" style={{left: props.left, zIndex: props.elevation}}>
      <div className="peakLabel">{props.name} - {props.elevation} m</div>
      <div className="peakStroke"></div>
    </div>
  );
};

export default PeakLabel;
