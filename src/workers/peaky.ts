/// <reference lib="webworker" />
import { type PeakyWorkerMessage, type Dimensions, type Status as WorkerStatus } from './peakyConnectorTypes';
import Peaky, { GeoLocation, type PeakyOptions, StatusMap, type Status as PeakyStatus } from '@benjaminhae/peaky';
import SrtmStorage from '../capacitor_srtm_storage';
import { jDBSCAN } from './jDBScan';

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
const canvasDarkModeInfo: { [id: string]: boolean } = {};
let calculating_location: GeoLocation;
let calculating_elevation: number;
let peaky: Peaky | undefined;
let ridgesPresent = false;
let started_calculating_peaks = false;
let finished_calculating_peaks = false;

// hack to make capacitor work
(self as any).window = self;

const write_message= (msg: string) => {
  console.log(msg);
}
const handleCanvasWaiter = () => {
  if (ridgesPresent && peaky) {
    canvasWaiter.forEach( (id) => {
      const canvas = canvasStorage[id];
      const options = {horizon_offset: 0, paint_direction: false, colors: {color_ridge_near: "#000000", color_ridge_far: "#bbbbbb"}}
      if (canvasDarkModeInfo[id]) {
        options.colors = { color_drawing:"white", color_background:"#121212", color_ridge_near: "#ffffff", color_ridge_far: "#333333" }
      }
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
const drawToCanvasId = (id: string, darkMode: boolean) => {
  canvasDarkModeInfo[id] = darkMode;
  canvasWaiter.add(id);
  handleCanvasWaiter();
}

const statusListener = (status: PeakyStatus) => {
  (status as WorkerStatus).state = StatusMap[status.state_no];
  self.postMessage({ action: "status", status: status as WorkerStatus});
}

// distance in meters
const downloadArea = (id: string, location: GeoLocation, distance: number) => {
  callFunctionErrorHandled(async () => {
    // add the usual calculation distance to the download distance
    peaky = new Peaky(new SrtmStorage(), location, { max_distance: (distance + 50*1000) });
    peaky.subscribeStatus(statusListener);
    await peaky.init();
    const status = {
      state: "done",
      state_no: 5,
      state_max: 5,
      sub: 0,
      sub_no: 0,
      sub_max: 0,
    }
    statusListener(status);
    return true;
  }, id);
}

const doRidgeCalculation = async (location: GeoLocation, options: PeakyOptions) => {
  if (calculating_location && location.lat == calculating_location.lat && location.lon == calculating_location.lon) {
    if (calculating_elevation && options.elevation && options.elevation == calculating_elevation) {
      console.log("Calculation for this location has already started");
      return;
    }
  }
  location = new GeoLocation(location.lat, location.lon);
  calculating_location = location;
  calculating_elevation = options.elevation;
  ridgesPresent = false;
  started_calculating_peaks = false;
  finished_calculating_peaks = false;
 
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

const haversine_distance = (point1, point2) => {
  const R = 6371;
  const precision = 4; // default 4 sig figs reflects typical 0.3% accuracy of spherical model
  const lat1 = (point1.location.latitude * Math.PI) / 180;
  const lon1 = (point1.location.longitude * Math.PI) / 180;
  const lat2 = (point2.location.latitude * Math.PI) / 180;
  const lon2 = (point2.location.longitude * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  
  const a =
  	Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  	Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  
  return d.toPrecision(precision); 
}

const distanceFunctionFactory = (current_location: any) => {
  return (p1, p2: any) => {
    const distance_current = Math.min(
      haversine_distance(current_location, p1),
      haversine_distance(current_location, p2)
    );
    console.log(distance_current);
    return (1/Math.sqrt(distance_current)) * haversine_distance(p1, p2)
  }
}

const clusterPeaks = (peaks: Array<any>): void => {
    const data = peaks.map((peak) => {
      return { location: {
        accuracy: 1,
        latitude: peak.location.lat,
        longitude:peak.location.lon,
      } }
    });
    // Configure a DBSCAN instance.
    const clustering = jDBSCAN()
    	.eps(1)
    	.minPts(1)
    	//.distance('HAVERSINE')
    	.distance(distanceFunctionFactory({location: {latitude: calculating_location.lat, longitude: calculating_location.lon}}))
    	.data(data)();
    clustering.forEach((element, index) => {
      peaks[index].cluster = element;
    });
    const cluster_count = Math.max(...clustering);
    console.log(cluster_count);
    
    const cluster_heights = [... Array(cluster_count).keys()].map(
      (element, idx) => {
        // cluster 0 contains single peaks
        if (idx === 0) {
          return 0
        }
        const peaks_in_cluster = peaks.filter((peak) => peak.cluster === idx);
        const heights = peaks_in_cluster.map((peak)=>peak.elevation )
        return Math.max(...heights)
      });
    peaks.forEach((peak, index) => {
      peak.heighestInCluster = peak.cluster === 0 || peak.elevation >= cluster_heights[peak.cluster];
    });
}


const doPeaksCalculation = async () => {
  if (peaky) {
    if (peaky.peaks.length > 0 || started_calculating_peaks ) {
      console.log('calculating peaks already started');
      if (finished_calculating_peaks) {
        self.postMessage({action: "peaks", peaks: peaky.peaks});
      }
      return
    }
    started_calculating_peaks = true;
    const time = [performance.now()];
    await peaky.findPeaks();
    clusterPeaks(peaky.peaks);
    finished_calculating_peaks = true;
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

const callFunctionErrorHandled = async (func: ()=> void, id?: string) => {
  try {
    const data = await func();
    if (id) {
      self.postMessage({action: "genericReturn", data: data, id: id});
    }
  } catch (e) {
    self.postMessage({action: "error", error: e.name, msg: e.message, id:id});
    throw e;
  }
}

// file actions
const deleteTile = async (id: string, tile: string) => {
  callFunctionErrorHandled(async () => {
    const storage = new SrtmStorage();
    let filename = tile + '.array.json'
    try {
      await storage.remove(filename);
    } catch(e) {
      if (e.message !== "File does not exist.") { 
        e.message = e.message + " filename: " + filename;
        throw e;
      }
    }
    filename = tile + '.hgt'
    try {
      await storage.remove(filename);
    } catch(e) {
      if (e.message !== "File does not exist.") { 
        e.message = e.message + " filename: " + filename;
        throw e;
      }
    }
    return true;
  }, id);
}

const listTiles = async (id: string) => {
  callFunctionErrorHandled(async () => {
    const storage = new SrtmStorage();
    const tileNames = (await storage.getAvailableTiles()).filter((name)=>/^[NS][0-9]{2}[EW][0-9]{3}\.(hgt|array\.json)$/.test(name));
    const uniq = [... new Set(tileNames.map((name)=> name.replace(/\..*$/,'')))]
    return uniq;
  }, id);
}

self.onmessage = (data: MessageEvent<any>) => {
  if (data.data.action === "init") {
    callFunctionErrorHandled(
      ()=> doRidgeCalculation(data.data.data.location, data.data.data.options)
    );
  }
  else if (data.data.action === "peaks") {
    callFunctionErrorHandled(
      ()=> doPeaksCalculation()
    );
  }
  else if (data.data.action === "draw") {
    canvasStorage[data.data.id] = data.data.canvas;
    drawToCanvasId(data.data.id, data.data.darkMode);
  }
  else if (data.data.action === "drawexisting") {
    drawToCanvasId(data.data.id, data.data.darkMode);
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
  else if (data.data.action === "listTiles") {
    listTiles(data.data.id);
  }
  else if (data.data.action === "deleteTile") {
    deleteTile(data.data.id, data.data.tile);
  }
  else if (data.data.action === "downloadArea") {
    downloadArea(data.data.id, data.data.location, data.data.distance);
  }
};

