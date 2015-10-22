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
function dirtychecked(prototype, property) {
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
exports.dirtychecked = dirtychecked;
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
        configurable: true,
        get: function () {
            var dirtyTracker = dirtyInstanceMap.get(this);
            if (!dirtyTracker) {
                dirtyTracker = new DirtyTracker();
                dirtyInstanceMap.set(this, dirtyTracker);
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
function smudgable(baseClass) {
    return function (constructor) {
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
        window.__smudge = smudge;
        var w = window;
        w.__wasSmudged = w.__wasSmudged || {};
        w.__smudgedTypes = w.__smudgedTypes || new Map();
        w.__smudgeValues = w.__smudgeValues || new Map();
        var obj = w.__smudgedTypes.get(constructor);
        if (!obj) {
            obj = {};
            obj.randomString = (Math.random() * Math.random()).toString();
            obj.construct = constructor;
            obj.baseClass = baseClass;
            w.__smudgedTypes.set(constructor, obj);
            w.__smudgeValues.set(obj.randomString, obj);
        }
        var randomString = obj.randomString;
        var fn = eval("(function " + constructorName + " (" + argStr + ") {\n            " + body.trim().replace('_super', "window.__smudgeValues.get('" + randomString + "').baseClass") + "\n            if(!window.__wasSmudged['" + randomString + "']) {\n                var construct = window.__smudgeValues.get('" + randomString + "').construct;\n                Object.keys(construct).forEach(function (property) {\n                    this.constructor[property] = construct[property];\n                }, this);\n\n                Object.keys(this).forEach(function (property) {\n                    window.__smudge(this.constructor.prototype, property, this);\n                }, this);\n                window.__wasSmudged['" + randomString + "'] = true;\n            }\n        })");
        if (w.__CerializeTypeMap && w.__CerializeTypeMap.has(constructor)) {
            w.__CerializeTypeMap.set(fn, w.__CerializeTypeMap.get(constructor));
        }
        return fn;
    };
}
exports.smudgable = smudgable;
