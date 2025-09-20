import { GeoLocation, projected_height, PeakWithDistance, PeakyOptions } from '@benjaminhae/peaky';
import { PeakyWorkerResponse, Dimensions, Status } from './peakyConnectorTypes';
import SrtmStorage from '../capacitor_srtm_storage';

//todo: send elevation
export default class PeakyWorkerConnector {
  worker: Worker;
  peakWaiter: Array<(peaks: Array<PeakWithDistance>) => void> = [];
  ridgeWaiter: Array<(dim: Dimensions) => void> = [];
  statusListener: Array<(status: Status) => void> = [];
  dimensions?: Dimensions;
  peaks?: Array<PeakWithDistance>;
  hasPeaks: boolean = false;
  
  constructor() {
    this.worker = new Worker(new URL('./peaky.ts', import.meta.url), {
      type: 'module'
    });
    this.worker.onmessage = (data) => this.messageHandler(data);
    this.worker.onerror = (err) => console.log(err);
  }
  messageHandler(parms: MessageEvent/*{data: { data: PeakyWorkerResponse }}*/) {
    const data = parms.data;
    if (data.action == "ridges") {
      this.dimensions = data.dimensions;
      if (this.dimensions) {
        this.callRidgeWaiter(this.dimensions);
      }
    }
    else if (data.action == "peaks") {
      this.peaks = data.peaks;
      if (this.peaks) {
        this.hasPeaks = true;
        this.callPeaksWaiter(this.peaks);
      }
    }
    else if (data.action == "status") {
      this.callStatusListener(data.status);
    }
    else if (data.action == "fetch") {
      this.handleFetch(data.id, data.args);
    }
  }

  handleFetch(id: string, args: Array<any>) {
    fetch.apply(null, args)
      .then(async (result)=> {
        const response = { status: result.status, ab:await (await result.blob()).arrayBuffer() }
        this.worker.postMessage({action: "fetch", id: id, state: "resolve", result: response}, [response.ab]);
      })
      .catch((result)=> {
        this.worker.postMessage({action: "fetch", id: id, state: "reject", result: result}, [result]);
      })
  }

  callStatusListener(status: Status) {
    this.statusListener.forEach((l) => new Promise<void>((r)=>{l(status); r()}));
  }

  callPeaksWaiter(peaks: Array<PeakWithDistance>) {
    while (this.peakWaiter.length > 0 ) {
      const peakHandler = this.peakWaiter.pop();
      if (peakHandler) {
        peakHandler(peaks);
      }
    }
  }

  callRidgeWaiter(dimensions: Dimensions) {
    while (this.ridgeWaiter.length > 0 ) {
      const ridgeHandler = this.ridgeWaiter.pop();
      if (ridgeHandler) {
        ridgeHandler(dimensions);
      }
    }
  }

  // call with elevation as option
  async init(location: GeoLocation, options: PeakyOptions = {}) {
    // now doing everything in the background (all data should be present already)
    this.worker.postMessage({action: "init", data: {location: location, options: options}});
  }

  getDimensions() {
    if (this.dimensions) {
      return Promise.resolve(this.dimensions);
    }
    return new Promise<Dimensions>((resolve) => {
      this.ridgeWaiter.push(resolve);
    })
  }

  drawToCanvas(offscreen: OffscreenCanvas, darkMode: boolean): string {
    try {
      const id = Math.random().toString(36).slice(2);
      this.worker.postMessage({action: "draw", canvas: offscreen, id:id, darkMode: darkMode}, [offscreen]);
      return id;
    } catch(e) {
      console.log(e);
      return "";
    }
  }

  drawToCanvasId(id: string, darkMode: boolean): void {
    this.worker.postMessage({action: "drawexisting", id:id, darkMode: darkMode});
  }

  getPeaks(): Promise<Array<PeakWithDistance>> {
    if (this.hasPeaks && this.peaks) {
      return Promise.resolve(this.peaks);
    }
    this.worker.postMessage({action: "peaks"});
    return new Promise<Array<PeakWithDistance>>((resolve) => {
      this.peakWaiter.push(resolve);
    })
  }

  subscribeStatus(listener: (status: Status) => void) {
    this.statusListener.push(listener);
  }
}
