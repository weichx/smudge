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
export declare function smudge(prototype: any, property: string, instance?: any): any;
export declare function smudgable(constructor: any): any;
