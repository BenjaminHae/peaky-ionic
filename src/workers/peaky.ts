import { PeakyWorkerMessage } from './peakyConnectorTypes';
import Peaky, { GeoLocation, PeakyOptions } from '@benjaminhae/peaky';
import SrtmStorage from '../capacitor_srtm_storage';

const self = globalThis as unknown as DedicatedWorkerGlobalScope;
const canvasWaiter: Array<OffscreenCanvas> = [];

let peaky: Peaky | undefined;
let ridgesPresent = false;

self.window = self;

const write_message= (msg) => {
  console.log(msg);
}
const handleCanvasWaiter = () => {
  if (ridgesPresent && peaky) {
    while (canvasWaiter.length > 0 ) {
      const canvas = canvasWaiter.pop();
      peaky.drawView(canvas, false); // true schreibt die Gipfel
    }
  }
}
const drawToCanvas = (canvas: OffscreenCanvas) => {
  canvasWaiter.push(canvas);
  handleCanvasWaiter();
}

const doCalculation = async (location: GeoLocation, options: PeakyOptions) => {
  location = new GeoLocation(location.lat, location.lon);
  console.log(location);
  console.log(options);
  write_message(`starting peak calculation`);
  const time = [performance.now()];
  peaky = new Peaky(new SrtmStorage(), location, options);
  await peaky.init();
  time.push(performance.now());
  write_message(`init took ${time[1]-time[0]}`);
  await peaky.calculateRidges();
  ridgesPresent = true;
  self.postMessage({ action: "ridges", dimensions: peaky.getDimensions() });
  time.push(performance.now());
  write_message(`calculating ridges took ${time[2]-time[1]}`);
  handleCanvasWaiter();

  // todo: ggf. das hier explizit triggern, damit dazwischen ein draw passieren kann
  await peaky.findPeaks();
  self.postMessage({action: "peaks", peaks: peaky.peaks});
  time.push(performance.now());
  write_message(`calculating peaks took ${time[3]-time[2]}`);
  write_message(`found ${peaky.peaks.length} peaks`);
}


self.onmessage = (data: MessageEvent<any>) => {
    console.log('Worker received:')
    console.log(data.data)
    if (data.data.action === "init") {
      doCalculation(data.data.data.location, data.data.data.options);
    }
    if (data.data.action === "draw") {
      drawToCanvas(data.data.canvas);
    }
};

