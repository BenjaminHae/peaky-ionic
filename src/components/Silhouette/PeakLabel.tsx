import './PeakLabel.css';

interface PeakLabelProps { 
  name: string;
  elevation: string;
  showByDefault: boolean;
}
const PeakLabel: React.FC<PeakLabelProps> = (props:PeakLabelProps) => {
  return (
    <div className="labelContainer" style={{zIndex: props.elevation}}>
      <div className="peakStroke">
        <div className="peakLabel">{props.showByDefault && <>{props.name} - {props.elevation} m</>}</div>
      </div>
    </div>
  );
};

export default PeakLabel;
