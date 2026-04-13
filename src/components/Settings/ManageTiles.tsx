//import './Peaks.css';
import { useMemo, useState, useEffect } from "react";
import { GeoLocation } from '@benjaminhae/peaky';
import SrtmStorage from '../../capacitor_srtm_storage';
import { IonItem, IonLabel, IonList } from '@ionic/react';
import { IonButton, IonButtons, IonCheckbox, IonListHeader, CheckboxCustomEvent } from '@ionic/react';
import { IonIcon } from '@ionic/react';
import { informationCircle } from 'ionicons/icons';
import { mapOutline, navigateCircle, trashBinOutline } from 'ionicons/icons';

interface ManageTilesProps {
  showInMap: (areas: Array<{tile:string, northWest:GeoLocation, southEast: GeoLocation}>) => void;
  location?: GeoLocation;
}

const zeroPad = function(v: number, l: number) {
    let r = v.toString();
    while (r.length < l) {
        r = '0' + r;
    }
    return r;
};

function tileKey(latLng: GeoLocation): string {
  return `${latLng.lat < 0 ? 'S':'N'}${zeroPad(Math.abs(Math.floor(latLng.lat)),2)}${latLng.lon < 0 ? 'W':'E'}${zeroPad(Math.abs(Math.floor(latLng.lon)),3)}`
}

function formatBytes(bytes: number, decimals: number = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function getSquareFromTile(tile: string) {
  const N = tile[0] === "N";
  const lat = parseInt(tile[1] + tile[2]) * (N ? 1 : -1)
  const E = tile[3] === "E";
  const lon = parseInt(tile[4] + tile[5] + tile[6]) * (E ? 1 : -1)
  return {tile: tile, northWest: new GeoLocation(lat, lon), southEast: new GeoLocation(lat + 1, lon + 1)};
}

const ManageTiles: React.FC<ManageTilesProps> = (props: ManageTilesProps) => {
  const storage = useMemo(() => new SrtmStorage(), []);
  const [tiles, setTiles] = useState<Array<string>>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [changeSet, setChangeSet] = useState<number>(0);
  useMemo(()=> {
      async function loadTiles() {
        console.log('reloading tiles');
        const tileNames = (await storage.getAvailableTiles()).filter((name)=>/^[NS][0-9]{2}[EW][0-9]{3}\.(hgt|array\.json)$/.test(name));
        const uniq = [... new Set(tileNames.map((name)=> name.replace(/\..*$/,'')))]
        setTiles(uniq);
      }
      loadTiles();
    }, [storage, changeSet]);

  const currentTile = props.location? tileKey(props.location): "";
  
  const chooseSelected = (tile: string, event: CheckboxCustomEvent<{ checked: boolean }>) => {
    setSelected(
      (current) => {
        const newSelected = {...current}
        newSelected[tile] = event.detail.checked;
        return newSelected;
      })
  }

  const chooseMultiSelected = (event: CheckboxCustomEvent<{ checked: boolean }>) => {
    if (event.detail.checked) {
      setSelected(tiles.reduce(
        (acc: Record<string, boolean>, tile: string) => {
          acc[tile] = true;
          return acc
        }, {}))
    }
    else {
      setSelected({});
    }
  }

  const deleteSelected = async () => {
    for (let tile in selected) {
      if (selected[tile]) {
        await deleteOne(tile, false)
      }
    }
    setChangeSet((n)=> n+1)
  }

  const deleteOne = async (tile: string, update: boolean = true) => {
    await storage.remove(tile + '.array.json');
    await storage.remove(tile + '.hgt');
    if (update) {
      setChangeSet((n)=> n+1)
    }
  }

  const showSelected = () => {
    const squares = [];
    for (let tile in selected) {
      if (selected[tile]) {
        squares.push(getSquareFromTile(tile));
      }
    }
    props.showInMap(squares);
  }

  const showOne = (tile: string) => {
    props.showInMap([getSquareFromTile(tile)]);
  }

  const tileList = tiles
    .map(
      (tile, index) => {
        return <IonItem key={`tile-${index}`}>
            <IonCheckbox 
              labelPlacement="end"
              checked={selected[tile]}
              onIonChange={
                (event) => chooseSelected(tile, event)
              }> 
              {tile} {currentTile === tile && <IonIcon icon={navigateCircle} title="Current location"></IonIcon>}
            </IonCheckbox>
            <IonButtons slot="end">
              <IonButton title="Show on map" onClick={()=>showOne(tile)}><IonIcon icon={mapOutline}></IonIcon></IonButton>
              <IonButton title="Delete data" onClick={()=>deleteOne(tile)}><IonIcon icon={trashBinOutline}></IonIcon></IonButton>
            </IonButtons>
          </IonItem>
        }
    );

  const countSelected = Object.values(selected).filter(x=>x).length;

  return (
      <IonList>
        <IonListHeader>
          <IonCheckbox 
            labelPlacement="end"
            value={countSelected === tiles.length}
            onIonChange={
              (event) => chooseMultiSelected(event)
            }> {countSelected} selected ({formatBytes(2884802 * countSelected)})
          </IonCheckbox> 
          <IonButton title="Show selected on map" onClick={()=>showSelected()}><IonIcon icon={mapOutline}></IonIcon></IonButton>
          <IonButton title="Delete selected data" onClick={()=>deleteSelected()}><IonIcon icon={trashBinOutline}></IonIcon></IonButton>
        </IonListHeader>
        {tileList}
      </IonList>
  )
}

export default ManageTiles;
