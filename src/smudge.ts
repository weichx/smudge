interface WeakMap<K, V> {
    clear(): void;
    get(key : K): V;
    has(key : K): boolean;
    delete(key : K) : any,
    set(key : K, value? : V): WeakMap<K, V>;
}

interface WeakMapConstructor {
    new (): WeakMap<any, any>;
    new <K, V>(): WeakMap<K, V>;
    prototype: WeakMap<any, any>;
}

declare var WeakMap : WeakMapConstructor;

export interface Map<K, V> {
    clear(): void;
    delete(key : K): boolean;
    forEach(callbackfn : (value : V, index : K, map : Map<K, V>) => void, thisArg? : any): void;
    get(key : K): V;
    has(key : K): boolean;
    set(key : K, value? : V): Map<K, V>;
    size: number;
}

export interface MapConstructor {
    new (): Map<any, any>;
    new <K, V>(): Map<K, V>;
    prototype: Map<any, any>;
}

declare var Map : MapConstructor;

var dirtyInstanceMap = new WeakMap<any, DirtyTracker>();
var dirtyTrackedArrays = new WeakMap<Array<any>, Array<any>>();

export interface ISmudgable {
    clean?(fieldName? : string) : void;
    isDirty?(fieldName? : string) : boolean;
    isSmudged?(fieldName? : string) : boolean;
    getDirtyFields?() : Array<string>;
    getSmudgedFields?() : Array<string>;
}

export function unSmudge(target : any, fieldName? : string) : void {
    if (!target || typeof target !== "object") return;
    var map = dirtyInstanceMap.get(target);
    map && map.unSmudge(fieldName);
}

export function clean(target : any, fieldName? : string) : void {
    if (!target || typeof target !== "object") return;
    var map = dirtyInstanceMap.get(target);
    map && map.clean(fieldName);
}

export function isSmudged(target : any, fieldName? : string) : boolean {
    if (!target || typeof target !== "object") return false;
    var map = dirtyInstanceMap.get(target);
    return Boolean(map) && map.isSmudged(fieldName);
}

export function isDirty(target : any, fieldName? : string) : boolean {
    if (!target || typeof target !== "object") return false;
    var map = dirtyInstanceMap.get(target);
    return Boolean(map) && map.isDirty(fieldName);
}

export function getDirtyFields(target : any) : Array<string> {
    if (!target || typeof target !== "object") return [];
    var map = dirtyInstanceMap.get(target);
    return map && map.getDirtyFields();
}

export function getSmudgedFields(target : any) : Array<string> {
    if (!target || typeof target !== "object") return [];
    var map = dirtyInstanceMap.get(target);
    return map && map.getSmudgedFields();
}

function DirtyTrackArray(array : Array<any>) : void {
    var trackedArray = dirtyTrackedArrays.get(array);
    if (!trackedArray) {
        dirtyTrackedArrays.set(array, array.slice(0));
    }
}

function isArraySmudged(array : Array<any>) : boolean {
    var tracked = dirtyTrackedArrays.get(array);
    if (!tracked) return false;
    if (tracked.length !== array.length) return true;
    for (var i = 0; i < array.length; i++) {
        var arrayValue = array[i];
        if (arrayValue !== tracked[i]) {
            return true;
        }
    }
    return false;
}

function isArrayDirty(array : Array<any>) : boolean {
    var tracked = dirtyTrackedArrays.get(array);
    if (!tracked) return false;
    if (tracked.length !== array.length) return true;

    if (isArraySmudged(array)) {
        return true;
    }

    for (var i = 0; i < array.length; i++) {
        var arrayValue = array[i];
        if (Array.isArray(arrayValue)) {
            if (isArrayDirty(arrayValue)) {
                return true;
            }
        }
        else if (arrayValue && typeof arrayValue === 'object') {
            var dirtyTracker = dirtyInstanceMap.get(arrayValue);
            if (dirtyTracker && dirtyTracker.isDirty()) {
                return true;
            }
        }
    }
    return false;
}

function isObjectDirty(obj : any) : boolean {
    if (obj && typeof obj === 'object') {
        var tracker = dirtyInstanceMap.get(obj);
        return tracker && tracker.isDirty();
    }
    return false;
}

class DirtyTracker {

    public fieldValues : any;
    public previousValues : any;

    constructor() {
        this.fieldValues = {};
        this.previousValues = {};
    }

    public setField(property : string, value : any) : void {
        this.previousValues[property] = this.fieldValues[property];
        this.fieldValues[property] = value;
        if (Array.isArray(value)) {
            DirtyTrackArray(value);
        }
    }

    public unSmudge(fieldName? : string) : void {
        if (fieldName) {
            delete this.previousValues[fieldName];
        }
        else {
            this.previousValues = {};
        }
    }

    public clean(fieldName? : string) : void {
        if (fieldName) {
            var property = this.fieldValues[fieldName];
            if (Array.isArray(property)) {
                for (var i = 0; i < property.length; i++) {
                    clean(property[i]);
                }
                dirtyTrackedArrays.set(property, property.slice(0));
            }
            else if (typeof property === "object" || typeof property === "function") {
                clean(property);
            }
            delete this.previousValues[fieldName];
        }
        else {
            Object.keys(this.fieldValues).forEach((field : string) => {
                this.clean(field);
            });
        }
    }

    public getDirtyFields() : Array<string> {
        return Object.keys(this.fieldValues).filter((keyName : string) => {
            return this.isDirty(keyName);
        });
    }

    public getSmudgedFields() : Array<string> {
        return Object.keys(this.fieldValues).filter((keyName : string) => {
            return this.isSmudged(keyName);
        });
    }

    public isSmudged(fieldName? : string) : boolean {
        if (fieldName) {
            var previous = this.previousValues[fieldName];
            var current = this.fieldValues[fieldName];
            return previous !== void 0 && previous !== current;
        } else {
            return Object.keys(this.fieldValues).some((key : string) : boolean => {
                return this.isSmudged(key);
            });
        }
    }

    public isDirty(fieldName? : string) : boolean {
        if (fieldName) {
            var previous = this.previousValues[fieldName];
            var current = this.fieldValues[fieldName];
            if (Array.isArray(current)) {
                return isArrayDirty(current);
            }
            else if (current && typeof current === 'object') {
                return isObjectDirty(current);
            }
            else if (previous === void 0) {
                return false;
            }
            else return previous !== current;
        }
        else {
            return Object.keys(this.fieldValues).some((key : string) : boolean => {
                return this.isDirty(key);
            });
        }
    }
}

export function dirtychecked(prototype : any, property : string) : any {
    Object.defineProperty(prototype, property, {
        enumerable: true,
        get: function () {
            var dirtyTracker = dirtyInstanceMap.get(this);
            if (!dirtyTracker) {
                dirtyTracker = new DirtyTracker();
                dirtyInstanceMap.set(this, dirtyTracker);
            }
            return dirtyTracker.fieldValues[property];
        },
        set: function (value : any) {
            var dirtyTracker = dirtyInstanceMap.get(this);
            if (!dirtyTracker) {
                dirtyTracker = new DirtyTracker();
                dirtyInstanceMap.set(this, dirtyTracker);
            }
            dirtyTracker.setField(property, value);
        }
    });
}

export function smudge(prototype : any, property : string, instance? : any) : any {
    if (instance) {
        var dirtyTracker = dirtyInstanceMap.get(instance);
        if (!dirtyTracker) {
            dirtyTracker = new DirtyTracker();
            dirtyInstanceMap.set(instance, dirtyTracker);
        }
        if (Array.isArray(instance[property])) {
            DirtyTrackArray(instance[property]);
        }
        dirtyTracker.setField(property, instance[property]);
        delete instance[property];
    }

    Object.defineProperty(prototype, property, {
        enumerable: true,
        configurable: true,
        get: function () {
            var dirtyTracker = dirtyInstanceMap.get(this);
            if (!dirtyTracker) {
                dirtyTracker = new DirtyTracker();
                dirtyInstanceMap.set(this, dirtyTracker);
            }
            return dirtyTracker.fieldValues[property];
        },
        set: function (value : any) {
            var dirtyTracker = dirtyInstanceMap.get(this);
            if (!dirtyTracker) {
                dirtyTracker = new DirtyTracker();
                dirtyInstanceMap.set(this, dirtyTracker);
            }
            dirtyTracker.setField(property, value);
        }
    });
}

export function smudgable(baseClass? : Function) : any {
    return function (constructor : any) {
        var str = constructor.toString();
        var start = str.indexOf('{') + 1;
        var end = str.lastIndexOf('}');
        var body = str.slice(start, end);
        var argSection = str.substr(0, start);
        var argStart = argSection.indexOf('(') + 1;
        var argEnd = argSection.lastIndexOf(')');
        var argStr = str.slice(argStart, argEnd);
        var nameStart = str.indexOf(' ') + 1;
        var nameEnd = argStart - 1;
        var constructorName = str.slice(nameStart, nameEnd).trim();

        (<any>window).__smudge = smudge;
        var w : any = (<any>window);
        w.__wasSmudged = w.__wasSmudged || {};
        w.__smudgedTypes = w.__smudgedTypes || new Map<any, any>();
        w.__smudgeValues = w.__smudgeValues || new Map<string, any>();

        var obj : any = w.__smudgedTypes.get(constructor);
        if (!obj) {
            obj = {};
            obj.randomString = (Math.random() * Math.random()).toString();
            obj.construct = constructor;
            obj.baseClass = baseClass;
            w.__smudgedTypes.set(constructor, obj);
            w.__smudgeValues.set(obj.randomString, obj);
        }

        var randomString = obj.randomString;
        var fn = eval(`(function ${constructorName} (${argStr}) {
            ${body.trim().replace('_super', `window.__smudgeValues.get('${randomString}').baseClass`)}
            if(!window.__wasSmudged['${randomString}']) {
                var construct = window.__smudgeValues.get('${randomString}').construct;
                Object.keys(construct).forEach(function (property) {
                    this.constructor[property] = construct[property];
                }, this);

                Object.keys(this).forEach(function (property) {
                    window.__smudge(this.constructor.prototype, property, this);
                }, this);
                window.__wasSmudged['${randomString}'] = true;
            }
        })`);
        if(w.__CerializeTypeMap && w.__CerializeTypeMap.has(constructor)) {
            w.__CerializeTypeMap.set(fn, w.__CerializeTypeMap.get(constructor));
        }
        return fn;
    }
}