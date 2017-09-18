export class TypedMap<T> {

  private _keys: string[];
  private _values: T[];

  constructor() {
    this._keys = <string[]> [];
    this._values = <T[]> [];
  }

  set(key:string, value: T): void {
    let index = this._keys.indexOf(key);
    if (index == -1) {
      this._values[this._keys.length] = value;
      this._keys.push(key);
    } else {
      this._values[index] = value;
    }
  }

  get(key:string): T {
    let index = this._keys.indexOf(key);
    if (index === -1) { return null; }
    return this._values[index];
  }

  keys(): string[] {
    return this._keys;
  }

  values(): T[] {
    return this._values;
  }

  remove(key): void {
    let index = this._keys.indexOf(key);
    if (index === -1) { return; }

    this._keys.splice(index, 1);
    this._values.splice(index, 1);
  }

  toJSON() {
    let ret = {};
    this._keys.forEach((k, i) => {
      ret[k] = this._values[i];
    });

    return ret;
  }

  forEach(fn) {
    this._keys.forEach((k, i) => {
      fn(this._values[i], k);
    });
  }

}
