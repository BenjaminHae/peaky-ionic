

interface PeakyWorkerMessageInit {
  action: "init";
  data: {location: GeoLocation, options: PeakyOptions};
}

interface PeakyWorkerMessageDraw {
  action: "draw";
  canvas: OffscreenCanvas;
}

interface PeakyWorkerMessagePeaks {
  action: "peaks";
}

export interface Dimensions { 
  min_projected_height, 
  max_projected_height, 
  min_height, 
  max_height, 
  circle_precision: number 
  central_elevation: number;
}
interface PeakyWorkerResponseRidges {
  action: "ridges";
  dimensions: Dimensions;
}

interface PeakyWorkerResponsePeaks {
  action: "peaks";
  peaks: Array<PeakWithElevation>;
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
