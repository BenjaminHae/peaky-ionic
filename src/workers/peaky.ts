/// <reference lib="webworker" />
import { type PeakyWorkerMessage, type Dimensions, type Status as WorkerStatus } from './peakyConnectorTypes';
import Peaky, { GeoLocation, type PeakyOptions, StatusMap, type Status as PeakyStatus } from '@benjaminhae/peaky';
import SrtmStorage from '../capacitor_srtm_storage';

const self = globalThis as unknown as DedicatedWorkerGlobalScope;

const fetchWaiter: { [id: string]: any } = {};

self.fetch = new Proxy(self.fetch, {
      apply: function (target, that, args) {
        // args holds argument of fetch function
        // Do whatever you want with fetch request
        return new Promise<any>((resolve, reject) => {
          const id = Math.random().toString(36).slice(2);
          fetchWaiter[id] = [resolve, reject];
          self.postMessage({ action: "fetch", id: id, args: [args[0]] });
        });
      },
    });


const canvasWaiter = new Set<string>([]);
const canvasStorage: { [id: string]: OffscreenCanvas } = {};
let peaky: Peaky | undefined;
let ridgesPresent = false;

// hack to make capacitor work
(self as any).window = self;

const write_message= (msg: string) => {
  console.log(msg);
}
const handleCanvasWaiter = () => {
  if (ridgesPresent && peaky) {
    canvasWaiter.forEach( (id) => {
      const canvas = canvasStorage[id];
      const options = {horizon_offset: 0}
      self.requestAnimationFrame(()=>{ 
        peaky?.drawView(canvas, false, options); 
      });
      /*canvas.oncontextrestored = () => {console.log('context restored');peaky.drawView(canvas, false, options);self.requestAnimationFrame(()=>peaky.drawView(canvas, false, options))}
      canvas.oncontextlost = () => {console.log('context lost');}
      canvas.addEventListener("contextlost", (event) => console.log(event));
      canvas.addEventListener("contextrestored", (event) => console.log(event));*/
    });
    canvasWaiter.clear();
  }
}
const drawToCanvasId = (id: string) => {
  canvasWaiter.add(id);
  handleCanvasWaiter();
}

const statusListener = (status: PeakyStatus) => {
  (status as WorkerStatus).state = StatusMap[status.state_no];
  self.postMessage({ action: "status", status: status as WorkerStatus});
}

const doRidgeCalculation = async (location: GeoLocation, options: PeakyOptions) => {
  location = new GeoLocation(location.lat, location.lon);
  write_message(`starting peak calculation`);
  const time = [performance.now()];
  peaky = new Peaky(new SrtmStorage(), location, options);
  peaky.subscribeStatus(statusListener);
  await peaky.init();
  time.push(performance.now());
  write_message(`init took ${time[1]-time[0]}`);
  await peaky.calculateRidges();
  // this is true after calculateRidges
  if (peaky.view) {
    ridgesPresent = true;
    const dimensions = peaky.getDimensions(0) as Dimensions;
    dimensions.central_elevation = peaky.view.elevation;
    self.postMessage({ action: "ridges", dimensions: dimensions });
    time.push(performance.now());
    write_message(`calculating ridges took ${time[2]-time[1]}`);
    handleCanvasWaiter();
  }
}

const doPeaksCalculation = async () => {
  if (peaky) {
    const time = [performance.now()];
    await peaky.findPeaks();
    self.postMessage({action: "peaks", peaks: peaky.peaks});
    time.push(performance.now());
    write_message(`calculating peaks took ${time[1]-time[0]}`);
    write_message(`found ${peaky.peaks.length} peaks`);
  }
}

class FakeResponseObject {
  status: any;
  ab: ArrayBuffer;
  constructor (status: any, ab: ArrayBuffer) {
    this.status = status;
    this.ab = ab;
  }
  
  blob(): Blob {
    return new Blob([this.ab]);
  }
}

self.onmessage = (data: MessageEvent<any>) => {
  if (data.data.action === "init") {
    doRidgeCalculation(data.data.data.location, data.data.data.options);
  }
  else if (data.data.action === "peaks") {
    doPeaksCalculation();
  }
  else if (data.data.action === "draw") {
    canvasStorage[data.data.id] = data.data.canvas;
    drawToCanvasId(data.data.id);
  }
  else if (data.data.action === "drawexisting") {
    drawToCanvasId(data.data.id);
  }
  else if (data.data.action === "fetch") {
    const waiter = fetchWaiter[data.data.id];
    if (data.data.state === "resolve") {
      waiter[0](new FakeResponseObject(data.data.result.status, data.data.result.ab));
    }
    else if (data.data.state === "reject") {
      waiter[1](data.data.result);
    }

  }
};

