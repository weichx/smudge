var dirtyInstanceMap = new WeakMap();
var dirtyTrackedArrays = new WeakMap();
function unSmudge(target, fieldName) {
    if (!target || typeof target !== "object")
        return;
    var map = dirtyInstanceMap.get(target);
    map && map.unSmudge(fieldName);
}
exports.unSmudge = unSmudge;
function clean(target, fieldName) {
    if (!target || typeof target !== "object")
        return;
    var map = dirtyInstanceMap.get(target);
    map && map.clean(fieldName);
}
exports.clean = clean;
function isSmudged(target, fieldName) {
    if (!target || typeof target !== "object")
        return false;
    var map = dirtyInstanceMap.get(target);
    return Boolean(map) && map.isSmudged(fieldName);
}
exports.isSmudged = isSmudged;
function isDirty(target, fieldName) {
    if (!target || typeof target !== "object")
        return false;
    var map = dirtyInstanceMap.get(target);
    return Boolean(map) && map.isDirty(fieldName);
}
exports.isDirty = isDirty;
function getDirtyFields(target) {
    if (!target || typeof target !== "object")
        return [];
    var map = dirtyInstanceMap.get(target);
    return map && map.getDirtyFields();
}
exports.getDirtyFields = getDirtyFields;
function getSmudgedFields(target) {
    if (!target || typeof target !== "object")
        return [];
    var map = dirtyInstanceMap.get(target);
    return map && map.getSmudgedFields();
}
exports.getSmudgedFields = getSmudgedFields;
function DirtyTrackArray(array) {
    var trackedArray = dirtyTrackedArrays.get(array);
    if (!trackedArray) {
        dirtyTrackedArrays.set(array, array.slice(0));
    }
}
function isArraySmudged(array) {
    var tracked = dirtyTrackedArrays.get(array);
    if (!tracked)
        return false;
    if (tracked.length !== array.length)
        return true;
    for (var i = 0; i < array.length; i++) {
        var arrayValue = array[i];
        if (arrayValue !== tracked[i]) {
            return true;
        }
    }
    return false;
}
function isArrayDirty(array) {
    var tracked = dirtyTrackedArrays.get(array);
    if (!tracked)
        return false;
    if (tracked.length !== array.length)
        return true;
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
function isObjectDirty(obj) {
    if (obj && typeof obj === 'object') {
        var tracker = dirtyInstanceMap.get(obj);
        return tracker && tracker.isDirty();
    }
    return false;
}
var DirtyTracker = (function () {
    function DirtyTracker() {
        this.fieldValues = {};
        this.previousValues = {};
    }
    DirtyTracker.prototype.setField = function (property, value) {
        this.previousValues[property] = this.fieldValues[property];
        this.fieldValues[property] = value;
        if (Array.isArray(value)) {
            DirtyTrackArray(value);
        }
    };
    DirtyTracker.prototype.unSmudge = function (fieldName) {
        if (fieldName) {
            delete this.previousValues[fieldName];
        }
        else {
            this.previousValues = {};
        }
    };
    DirtyTracker.prototype.clean = function (fieldName) {
        var _this = this;
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
            Object.keys(this.fieldValues).forEach(function (field) {
                _this.clean(field);
            });
        }
    };
    DirtyTracker.prototype.getDirtyFields = function () {
        var _this = this;
        return Object.keys(this.fieldValues).filter(function (keyName) {
            return _this.isDirty(keyName);
        });
    };
    DirtyTracker.prototype.getSmudgedFields = function () {
        var _this = this;
        return Object.keys(this.fieldValues).filter(function (keyName) {
            return _this.isSmudged(keyName);
        });
    };
    DirtyTracker.prototype.isSmudged = function (fieldName) {
        var _this = this;
        if (fieldName) {
            var previous = this.previousValues[fieldName];
            var current = this.fieldValues[fieldName];
            return previous !== void 0 && previous !== current;
        }
        else {
            return Object.keys(this.fieldValues).some(function (key) {
                return _this.isSmudged(key);
            });
        }
    };
    DirtyTracker.prototype.isDirty = function (fieldName) {
        var _this = this;
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
            else
                return previous !== current;
        }
        else {
            return Object.keys(this.fieldValues).some(function (key) {
                return _this.isDirty(key);
            });
        }
    };
    return DirtyTracker;
})();
function smudge(prototype, property, instance) {
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
        get: function () {
            var dirtyTracker = dirtyInstanceMap.get(this);
            if (!dirtyTracker) {
                dirtyTracker = new DirtyTracker();
            }
            return dirtyTracker.fieldValues[property];
        },
        set: function (value) {
            var dirtyTracker = dirtyInstanceMap.get(this);
            if (!dirtyTracker) {
                dirtyTracker = new DirtyTracker();
                dirtyInstanceMap.set(this, dirtyTracker);
            }
            dirtyTracker.setField(property, value);
        }
    });
}
exports.smudge = smudge;
function smudgable(constructor) {
    var smudged = false;
    function SmudgeConstructor() {
        return constructor.apply(this, arguments);
    }
    SmudgeConstructor.prototype = constructor.prototype;
    return function () {
        var instance = new SmudgeConstructor(arguments);
        if (!smudged) {
            smudged = true;
            Object.keys(instance).forEach(function (property) {
                smudge(instance.constructor.prototype, property, instance);
            });
        }
        return instance;
    };
}
exports.smudgable = smudgable;
