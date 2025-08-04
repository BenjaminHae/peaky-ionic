import { useState } from "react";
import SyncTileSet, { LatLng } from 'srtm-elevation-async';
import SrtmStorage from '../capacitor_srtm_storage';
import { Capacitor } from '@capacitor/core';
import Peaky, {GeoLocation} from '@benjaminhae/peaky';

interface ContainerProps { }

const TestContainer: React.FC<ContainerProps> = () => {
  const [height, setHeight] = useState<number|null>(null);
  const [text, setText] = useState<array<string>>([]);
  const storage = new SrtmStorage();
  const location = [ 47.020156, 9.978416 ];
  const options = { };
  if (Capacitor.getPlatform() == 'web') {
    options.provider = '/cache/{lat}{lng}.SRTMGL3S.hgt.zip';
  }

  const getHeight = async () => {
    const ll = new LatLng(location[0], location[1])
    
    const tileset = new SyncTileSet(storage, ll, ll, options);
    await tileset.init();
    setHeight(tileset.getElevation(ll));
  }
  const getPeaks = async () => {
    const write = (outtext:string) => {
      setText((s:Array<string>)=> [...s, outtext]);
    }
    const gl = new GeoLocation(location[0], location[1]);
    const time = [performance.now()];
    const peaky = new Peaky(storage, gl, options);
    await peaky.init();
    time.push(performance.now());
    write(`init took ${time[1]-time[0]}`);
    await peaky.calculateRidges();
    time.push(performance.now());
    write(`calculating ridges took ${time[2]-time[1]}`);
    const {min_height, max_height } = peaky.getDimensions();
  
    write(`current elevation is ${peaky.view?.elevation}`);
    write(`found elevations from ${min_height} to ${max_height}, and ${peaky.view?.ridges.length} ridges`);
  
    await peaky.findPeaks();
    time.push(performance.now());
    write(`calculating peaks took ${time[3]-time[2]}`);
    write(`found ${peaky.peaks.length} peaks`);
  }
  getHeight();
  getPeaks();

  const textItems = text.map((line) => 
    <p>{line}</p>
  );

  return (
    <div id="container">
      { height && <p> { height }</p> }
      { textItems }
    </div>
  );
};

export default TestContainer;
