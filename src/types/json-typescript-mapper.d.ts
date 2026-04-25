// Type stub to replace the package's own .ts source, which is incompatible with TypeScript 5.
export declare function deserialize<T>(type: new () => T, json: any): T;
export declare function serialize(instance: any): any;
