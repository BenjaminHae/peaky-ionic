import { PeakyWorkerMessage } from './peakyConnectorTypes';
import Peaky, { GeoLocation, PeakyOptions, StatusMap } from '@benjaminhae/peaky';
import SrtmStorage from '../capacitor_srtm_storage';

const self = globalThis as unknown as DedicatedWorkerGlobalScope;

const fetchWaiter: { [id: string]: any } = {};

self.fetch = new Proxy(self.fetch, {
      apply: function (target, that, args) {
        // args holds argument of fetch function
        // Do whatever you want with fetch request
        return new Promise<any>((resolve, reject) => {
          const id = Math.random().toString(36).slice(2);
          console.log(`sending fetch request ${id}`);
          fetchWaiter[id] = [resolve, reject];
          self.postMessage({ action: "fetch", id: id, args: [args[0]] });
        });
      },
    });


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
      const options = {horizon_offset: 0}
      peaky.drawView(canvas, false, options); // true schreibt die Gipfel
      canvas.oncontextrestored = () => {self.requestAnimationFrame(()=>peaky.drawView(canvas, false, options))}
    }
  }
}
const drawToCanvas = (canvas: OffscreenCanvas) => {
  canvasWaiter.push(canvas);
  handleCanvasWaiter();
}

const statusListener = (status) => {
  status.state = StatusMap[status.state_no];
  self.postMessage({ action: "status", status: status });
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
  ridgesPresent = true;
  const dimensions = peaky.getDimensions();
  dimensions.central_elevation = peaky.view.elevation;
  self.postMessage({ action: "ridges", dimensions: dimensions });
  time.push(performance.now());
  write_message(`calculating ridges took ${time[2]-time[1]}`);
  handleCanvasWaiter();
}

const doPeaksCalculation = async () => {
  const time = [performance.now()];
  await peaky.findPeaks();
  self.postMessage({action: "peaks", peaks: peaky.peaks});
  time.push(performance.now());
  write_message(`calculating peaks took ${time[1]-time[0]}`);
  write_message(`found ${peaky.peaks.length} peaks`);
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
    drawToCanvas(data.data.canvas);
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

