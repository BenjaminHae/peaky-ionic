import { PeakyWorkerMessage } from './peakyConnectorTypes';
import Peaky, { GeoLocation, PeakyOptions } from '@benjaminhae/peaky';
import SrtmStorage from '../capacitor_srtm_storage';

const self = globalThis as unknown as DedicatedWorkerGlobalScope;

const doCalculation = async (location: GeoLocation, options: PeakyOptions) => {
  const peaky = new Peaky(new SrtmStorage(), location, options);
  await peaky.init();
  await peaky.calculateRidges();
  self.postMessage({action: "ridges", peaky: peaky});
  await peaky.findPeaks();
  self.postMessage({action: "peaks", peaky: peaky});
}

self.onmessage = (data: MessageEvent<PeakyWorkerMessage>) => {
    console.log('Worker received:', e.data)
    if (e.data.action === "init") {
      doCalculation(e.data.data.location, e.data.data.options);
    }
};

