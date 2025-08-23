import Peaky, { GeoLocation } from '@benjaminhae/peaky';

interface PeakyWorkerMessageInit {
  action: "init";
  data: {location: GeoLocation, options: PeakyOptions};
}

interface PeakyWorkerResponseRidges {
  action: "ridges";
  peaky: Peaky;
}

interface PeakyWorkerResponsePeaks {
  action: "peaks";
  peaky: Peaky;
}

interface PeakyWorkerResponseStatus {
  action: "status";
  state: string;
  state_no: number;
  state_max: number;
  sub: string;
  sub_no: number;
  sub_max: number;
}

export type PeakyWorkerMessage = PeakyWorkerMessageInit;
export type PeakyWorkerResponse = PeakyWorkerResponsePeaks | PeakyWorkerResponseRidges | PeakyWorkerResponseStatus;
