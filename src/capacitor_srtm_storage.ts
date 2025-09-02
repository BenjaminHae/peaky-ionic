import { Filesystem, Directory, type StatOptions, type WriteFileOptions } from '@capacitor/filesystem';

export default class SrtmStorage {
  constructor() {
    //Filesystem.requestPermissions(); only when directory is Documents or External
  }
  filenameToOptions(tile: string): StatOptions {
    return {directory: Directory.Data, path: tile}
  }
  // existsSync
  // src/load-tile.js
  // src/srtm.js
  // src/sync-tile-set.js
  async hasTile(tile: string): Promise<boolean> {
    try {
      await Filesystem.stat(this.filenameToOptions(tile));
      return true;
    } catch {
      return false;
    }
  }

  // statSync
  // src/hgt.js
  async getTileSize(tile: string): Promise<number> {
    /* This gives the length of the b64 string :/
    const size = (await Filesystem.stat(this.filenameToOptions(tile))).size;
    */
    const size = (await this.readTileRaw(tile)).length;
    return size;
  }

  async readTileRaw(tile: string): Promise<Uint8Array> {
    const b64 = (await Filesystem.readFile(this.filenameToOptions(tile))).data;
    if (Uint8Array.hasOwnProperty('fromBase64')) {
      return Uint8Array.fromBase64(b64);
    } else {
      const binaryString = atob(b64 as string);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
  }

  // readFileSync
  // src/hgt.js
  //  vermutlich muss hier noch mehr passieren, es muss ein Buffer zurückgegeben werden, der readInt16BE kann
  //  https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
  //  noch besser vermutlich mit DataView https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView
  //  lesen des arrays mit getUint16(position, false/* big endian*/) 
  //  returns DataView
  async readTile(tile: string): Promise<DataView> {
    const bytes = await this.readTileRaw(tile);
    return new DataView(bytes.buffer);
  }

  async writeTile(tile: string, data: ArrayBuffer): Promise<void> {
    const options = this.filenameToOptions(tile);
    (options as WriteFileOptions).data = _arrayBufferToBase64(data);
    await Filesystem.writeFile(options as WriteFileOptions);
  }
  
  // src/srtm.js
  async remove(tile: string): Promise<void> {
    return await Filesystem.deleteFile(this.filenameToOptions(tile));
  }
}
function _arrayBufferToBase64( buffer: ArrayBuffer ): string {
  const bytes = new Uint8Array( buffer );
  if (typeof (bytes as any).toBase64 === 'function') {
    return bytes.toBase64();
  } else {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
  }
}
