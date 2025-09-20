import { GeoLocation, type PeakyOptions, StatusMap, type PeakWithDistance } from '@benjaminhae/peaky';

interface PeakyWorkerMessageInit {
  action: "init";
  data: {location: GeoLocation, options: PeakyOptions};
}

interface PeakyWorkerMessageDraw {
  action: "draw";
  canvas: OffscreenCanvas;
  id: string;
  darkMode: boolean;
}

interface PeakyWorkerMessageDrawExisting {
  action: "drawexisting";
  id: string;
  darkMode: boolean;
}

interface PeakyWorkerMessagePeaks {
  action: "peaks";
}

interface PeakyWorkerWantsFetchResponse {
  action: "fetch";
  id: string;
  state: "resolve" | "reject";
  result: any;
}

export interface Dimensions { 
  min_projected_height: number;
  max_projected_height: number;
  min_height: number;
  max_height: number;
  circle_precision: number;
  central_elevation: number;
}
interface PeakyWorkerResponseRidges {
  action: "ridges";
  dimensions: Dimensions;
}

interface PeakyWorkerResponsePeaks {
  action: "peaks";
  peaks: Array<PeakWithDistance>;
}

interface PeakyWorkerWantsFetch {
  action: "fetch";
  id: string;
  args: Array<any>;
}


export interface Status {
  state: string;
  state_no: number;
  state_max: number;
  sub: string;
  sub_no: number;
  sub_max: number;
}

interface PeakyWorkerResponseStatus {
  action: "status";
  status: Status;
}


export type PeakyWorkerMessage = PeakyWorkerMessageInit;
export type PeakyWorkerResponse = PeakyWorkerResponsePeaks | PeakyWorkerResponseRidges | PeakyWorkerResponseStatus | PeakyWorkerWantsFetch;
