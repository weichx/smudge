export interface Map<K, V> {
    clear(): void;
    delete(key: K): boolean;
    forEach(callbackfn: (value: V, index: K, map: Map<K, V>) => void, thisArg?: any): void;
    get(key: K): V;
    has(key: K): boolean;
    set(key: K, value?: V): Map<K, V>;
    size: number;
}
export interface MapConstructor {
    new (): Map<any, any>;
    new <K, V>(): Map<K, V>;
    prototype: Map<any, any>;
}
export interface ISmudgable {
    clean?(fieldName?: string): void;
    isDirty?(fieldName?: string): boolean;
    isSmudged?(fieldName?: string): boolean;
    getDirtyFields?(): Array<string>;
    getSmudgedFields?(): Array<string>;
}
export declare function unSmudge(target: any, fieldName?: string): void;
export declare function clean(target: any, fieldName?: string): void;
export declare function isSmudged(target: any, fieldName?: string): boolean;
export declare function isDirty(target: any, fieldName?: string): boolean;
export declare function getDirtyFields(target: any): Array<string>;
export declare function getSmudgedFields(target: any): Array<string>;
export declare function dirtychecked(prototype: any, property: string): any;
export declare function smudge(prototype: any, property: string, instance?: any): any;
export declare function smudgable(baseClass?: Function): any;
