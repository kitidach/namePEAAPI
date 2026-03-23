import masterData from "./pea_master_bundle";
import { MasterData, Office, Group8, Group17, Group43, Region } from "./types";

/**
 * Edge-compatible DataStore. 
 * Data is imported at build time from bundled JSON module.
 * No filesystem access needed.
 */
class DataStore {
  private _data: MasterData;
  private officeByCode: Map<string, Office>;
  private group8ById: Map<string, Group8>;
  private group17ById: Map<string, Group17>;
  private group43ById: Map<string, Group43>;

  constructor() {
    this._data = masterData as unknown as MasterData;

    this.officeByCode = new Map();
    for (const o of this._data.offices) this.officeByCode.set(o.code, o);

    this.group8ById = new Map();
    for (const g of this._data.groups8) this.group8ById.set(g.id, g);

    this.group17ById = new Map();
    for (const g of this._data.groups17) this.group17ById.set(g.id, g);

    this.group43ById = new Map();
    for (const g of this._data.groups43) this.group43ById.set(g.id, g);
  }

  get data() { return this._data; }
  get offices() { return this._data.offices; }
  get region(): Region { return this._data.region; }
  get groups8() { return this._data.groups8; }
  get groups17() { return this._data.groups17; }
  get groups43() { return this._data.groups43; }
  get hierarchy() { return this._data.hierarchy; }

  getOffice(code: string) { return this.officeByCode.get(code); }
  getGroup8(id: string) { return this.group8ById.get(id); }
  getGroup17(id: string) { return this.group17ById.get(id); }
  getGroup43(id: string) { return this.group43ById.get(id); }
}

export const dataStore = new DataStore();
