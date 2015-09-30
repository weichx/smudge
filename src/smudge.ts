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
        enumerable : true,
        get : function () {
            var dirtyTracker = dirtyInstanceMap.get(this);
            if (!dirtyTracker) {
                dirtyTracker = new DirtyTracker();
            }
            return dirtyTracker.fieldValues[property];
        },
        set : function (value : any) {
            var dirtyTracker = dirtyInstanceMap.get(this);
            if (!dirtyTracker) {
                dirtyTracker = new DirtyTracker();
                dirtyInstanceMap.set(this, dirtyTracker);
            }
            dirtyTracker.setField(property, value);
        }
    });
}

export function smudgable(constructor : any) : any {
    var smudged : boolean = false;


    function SmudgeConstructor() : any {
        return constructor.apply(this, arguments);
    }

    SmudgeConstructor.prototype = constructor.prototype;

    return function () : any {
        //todo play with this
        //var Temp = function(){};
        //Temp.prototype = constructor.prototype;
        //var inst = new Temp();
        //var retn = constructor.apply(inst, arguments);
        //return Object(retn) === retn ? retn : inst;
        var instance = new (<any>SmudgeConstructor)(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
        if (!smudged) {
            smudged = true;
            Object.keys(instance).forEach(function (property : string) {
                smudge(instance.constructor.prototype, property, instance);
            });
        }
        return instance;
    };
}
