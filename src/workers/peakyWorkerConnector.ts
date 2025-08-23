import Peaky, { GeoLocation, projected_height, PeakWithDistance } from '@benjaminhae/peaky';
import { PeakyWorkerResponse } from './peakyConnectorTypes';

export default class PeakyWorkerConnector {
  worker: Worker;
  peaky?: Peaky;
  canvasWaiter: Array<(p: Peaky) => void > = [];
  peakWaiter: Array<(peaks: Array<PeakWithDistance>) => void> = [];
  
  hasPeaks = false;
  
  constructor() {
    this.worker = new Worker(new URL('./peaky.ts', import.meta.url));
    this.worker.onmessage = (data) => this.messageHandler(data);
  }
  messageHandler({data: { data: PeakyWorkerResponse }}) {
    if (data.action == "ridges") {
      this.peaky = data.peaky;
      this.callCanvasWaiter(this.peaky);
    }
    else if (data.action == "peaks") {
      this.peaky = data.peaky;
      this.hasPeaks = true;
      this.callPeaksWaiter(this.peaky.peaks);
    }
  }

  callCanvasWaiter(peaky: Peaky) {
    while (this.canvasWaiter.length > 0 ) {
      this.canvasWaiter.pop()(peaky);
    }
  }

  callPeaksWaiter(peaks: Array<PeaksWithDistance>) {
    while (this.peakWaiter.length > 0 ) {
      this.peakWaiter.pop()(peaks);
    }
  }

  getCanvasDrawer(): Promise<Peaky> {
    if (this.peaky) {
      return Promise.resolve(this.peaky);
    }
    return new Promise<Peaky>((resolve) => {
      this.peakWaiter.push(resolve);
    })
  }

  getPeaks(): Promise<Array<PeakWithDistance>> {
    if (this.hasPeaks && this.peaky) {
      return Promise.resolve(this.peaky.peaks);
    }
    return new Promise<Array<PeakWithDistance>>((resolve) => {
      this.callPeaksWaiter.push(resolve);
    })
  }

  init(location: GeoLocation, options: PeakyOptions = {}) {
    this.worker.postMessage({action: "init", data: {location: location, options: options}});
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
