import './PeakLabel.css';

interface PeakLabelProps { 
  name: string;
  elevation: string;
}
const PeakLabel: React.FC<PeakLabelProps> = (props:PeakLabelProps) => {
  return (
    <div className="labelContainer" style={{zIndex: props.elevation}}>
      <div className="peakStroke">
        <div className="peakLabel">{props.name} - {props.elevation} m</div>
      </div>
    </div>
  );
};

export default PeakLabel;
