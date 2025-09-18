import './PeakMap.css';
import { MapContainer } from 'react-leaflet'
import PeakMap, {PeakMapProps} from './PeakMap';

const PeakMapContainer: React.FC<PeakMapProps> = (props:PeakMapProps) => {
  return (
    <MapContainer center={[props.lat, props.lon]} zoom={13} scrollWheelZoom={false} style={{height: "100%", width:"100%"}}>
      <PeakMap {...props}/>
    </MapContainer>
  );
};

export default PeakMapContainer;
