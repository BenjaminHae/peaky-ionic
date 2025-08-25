import Peaky, { GeoLocation, projected_height, PeakWithDistance } from '@benjaminhae/peaky';
import { PeakyWorkerResponse, Dimensions } from './peakyConnectorTypes';

//todo: send elevation
export default class PeakyWorkerConnector {
  worker: Worker;
  peakWaiter: Array<(peaks: Array<PeakWithDistance>) => void> = [];
  ridgeWaiter: Array<(dim: Dimensions) => void> = [];
  dimensions?: Dimensions;
  peaks?: Array<PeakWithDistance>;
  
  constructor() {
    this.worker = new Worker(new URL('./peaky.ts', import.meta.url), {
      type: 'module'
    });
    console.log(this.worker);
    this.worker.onmessage = (data) => this.messageHandler(data);
    this.worker.onerror = (err) => console.log(err);
  }
  messageHandler(parms/*{data: { data: PeakyWorkerResponse }}*/) {
    console.log(parms);
    const data = parms.data;
    if (data.action == "ridges") {
      this.dimensions = data.dimensions;
      this.callRidgeWaiter(this.dimensions);
    }
    else if (data.action == "peaks") {
      this.peaks = data.peaks;
      this.hasPeaks = true;
      this.callPeaksWaiter(this.peaks);
    }
  }

  callPeaksWaiter(peaks: Array<PeaksWithDistance>) {
    while (this.peakWaiter.length > 0 ) {
      this.peakWaiter.pop()(peaks);
    }
  }

  callRidgeWaiter(dimensions: Dimensions) {
    while (this.ridgeWaiter.length > 0 ) {
      this.ridgeWaiter.pop()(dimensions);
    }
  }

  // call with elevation as option
  init(location: GeoLocation, options: PeakyOptions = {}) {
    console.log("init worker");
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

  drawToCanvas(offscreen: OffscreenCanvas) {
    try {
      this.worker.postMessage({action: "draw", canvas: offscreen}, [offscreen]);
    } catch(e) {
      console.log(e);
    }
  }

  getPeaks(): Promise<Array<PeakWithDistance>> {
    if (this.hasPeaks) {
      return Promise.resolve(this.peaks);
    }
    this.worker.postMessage({action: "peaks"});
    return new Promise<Array<PeakWithDistance>>((resolve) => {
      this.peakWaiter.push(resolve);
    })
  }

}/*{
      const location = [ 47.020156, 9.978416 ];//St. Gallenkirch
      //const location = [ 49.227165, 9.1487209];// BW
      const storage = new SrtmStorage();
      const options = { };
      let gl = props.location.coords;
      if (Capacitor.getPlatform() == 'web') {
        options.provider = '/cache/{lat}{lng}.SRTMGL3S.hgt.zip';
        gl = new GeoLocation(location[0], location[1]);
      }
      else {
        if (props.location.elevation) {
          options.elevation = props.location.elevation;
        }
      }
      write_message(`starting peak calculation`);
      const time = [performance.now()];
      const peaky = new Peaky(storage, gl, options);
      await peaky.init();
      time.push(performance.now());
      write_message(`init took ${time[1]-time[0]}`);
      await peaky.calculateRidges();
      time.push(performance.now());
      write_message(`calculating ridges took ${time[2]-time[1]}`);
      const { min_projected_height, max_projected_height, min_height, max_height } = peaky.getDimensions();
  
      write_message(`current elevation is ${peaky.view?.elevation}`);
      write_message(`found elevations from ${min_height} to ${max_height}, and ${peaky.view?.ridges.length} ridges`);
  
      await peaky.findPeaks();
      time.push(performance.now());
      write_message(`calculating peaks took ${time[3]-time[2]}`);
      write_message(`found ${peaky.peaks.length} peaks`);

      if (canvasRef.current) {
        const canHeight = max_projected_height - min_projected_height + 800;//800 is magic border constant, für Gipfel
        const canWidth = peaky.options.circle_precision * MAGIC_CIRCLE_SCALE;
        canvasRef.current.height = canHeight;
        canvasRef.current.width = canWidth;
        peaky.drawView(canvasRef.current, false); // true schreibt die Gipfel
        let scale = 0.1;
        if (containerRef.current) {
          scale = Math.min(windowDimensions.width/canWidth, containerRef.current.offsetHeight/canHeight)
          console.log(`containerWidth: ${windowDimensions.width}, canWidth: ${canWidth}, containerHeight: ${containerRef.current.offsetHeight}, canHeight: ${canHeight}, scale: ${scale}`);
          //scale *= 1 / transformContext.transformState.scale;
        }
        console.log(`setting width to ${canvasRef.current.offsetWidth * scale}`);
        setWidth(canvasRef.current.offsetWidth * scale);
        setCanvasScale(scale);
        //canvasRef.current.style.transformOrigin = '0 0';
        //canvasRef.current.style.transform = `scale(${scale.toFixed(2)})`;
        time.push(performance.now());
        write_message(`drawing took ${time[4]-time[3]}`);
      }
      const newCentralElevation = peaky.view.elevation;
      setElevation(newCentralElevation);
      setPeaks(peaky.peaks);
    }
*/
