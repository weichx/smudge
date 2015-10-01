///<reference path="./typings/jasmine.d.ts"/>

import {
    smudgable,
    isSmudged,
    isDirty,
    unSmudge,
    clean,
    getDirtyFields,
    getSmudgedFields
} from '../src/smudge';

@smudgable
export class Test1 {

    public property1 : number;
    public stringProp : string;
    public objProp : Object;
    public arrayProp : Array<string>;

    constructor() {
        this.property1 = 100;
        this.stringProp = "hello";
        this.objProp = {};
        this.arrayProp = [];
    }
}

@smudgable
class Test2 {
    public stringProp : string;
    public list : Array<Test2>;
    public subobject : Test2;
    public nestedArrays : Array<Array<Test2>>;

    constructor() {
        this.stringProp = "hi";
        this.list = [];
        this.subobject = null;
        this.nestedArrays = [];
    }
}

describe("@smudgable", function () {

    it('should not start out smudged', function () {
        var t = new Test1();
        expect(isSmudged(t, 'property1')).toBe(false);
    });

    it('should be set to its constructor value', function () {
        var t = new Test1();
        expect(t.property1).toBe(100);
    });

    it('should smudge a shallow field', function () {
        var t = new Test1();
        t.property1 = 200;
        expect(isSmudged(t, 'property1')).toBe(true);
    });

    it('should be smudged', function () {
        var t = new Test1();
        t.property1 = 300;
        expect(isSmudged(t)).toBe(true)
    });

    it('should report smudged fields', function () {
        var t = new Test1();
        t.property1 = 300;
        expect(getSmudgedFields(t)).toEqual(['property1']);
        t.stringProp = "goodbye";
        expect(getSmudgedFields(t)).toEqual(['property1', 'stringProp']);
    });

    it('should not smudge if same value is set', function () {
        var t = new Test1();
        t.property1 = 100;
        expect(isSmudged(t)).toBe(false);
    });

    it('returns the right value', function () {
        var t = new Test1();
        t.property1 = 300;
        expect(t.property1).toBe(300);
    });

    it('should clean a smudged field', function () {
        var t = new Test1();
        t.property1 = 200;
        unSmudge(t, 'property1');
        expect(isSmudged(t, 'property1')).toBe(false);
    });

    it('should clean all smudged fields', function () {
        var t = new Test1();
        t.property1 = 200;
        t.stringProp = "goodbye";
        unSmudge(t);
        expect(isSmudged(t)).toBe(false);
    });

    it('should not smudge an array if contents change', function () {
        var t = new Test1();
        t.arrayProp.push('hi there');
        expect(isSmudged(t)).toBe(false);
    });

    it('should not smudge an object if contents change', function () {
        var t = new Test1();
        (<any>t.objProp).x = 1;
        expect(isSmudged(t)).toBe(false);
    });

    it('should smudge an array field', function () {
        var t = new Test1();
        t.arrayProp = [];
        expect(isSmudged(t)).toBe(true);
    });

    it('should smudge an object field', function () {
        var t = new Test1();
        t.objProp = {};
        expect(isSmudged(t)).toBe(true);
    });
});

describe('dirty', function () {

    it('should not start out dirty', function () {
        var t = new Test1();
        expect(isSmudged(t, 'property1')).toBe(false);
    });

    it('should mark smudged fields as dirty', function () {
        var t = new Test1();
        t.property1 = 200;
        expect(isDirty(t, 'property1')).toBe(true);
    });

    it('should examine array length changes', function () {
        var t = new Test1();
        t.arrayProp.push('str');
        expect(isDirty(t, 'arrayProp')).toBe(true);
    });

    it('should examine array value changes', function () {
        var t = new Test1();
        t.arrayProp.push('str1');
        t.arrayProp.push('str2');
        clean(t, 'arrayProp');
        expect(isDirty(t, 'arrayProp')).toBe(false);
        t.arrayProp[0] = 'different';
        expect(isDirty(t, 'arrayProp')).toBe(true);
    });

    it('should clean an array', function () {
        var t = new Test1();
        t.arrayProp.push('str');
        expect(isDirty(t, 'arrayProp')).toBe(true);
        clean(t, 'arrayProp');
        expect(isDirty(t, 'arrayProp')).toBe(false);
    });

    it('should examine object properties', function () {
        var t = new Test2();
        t.subobject = new Test2();
        clean(t);
        t.subobject.stringProp = "yes";
        expect(isDirty(t)).toBe(true);
        expect(isDirty(t, 'subobject')).toBe(true);
    });

    it('should find dirty objects within an array that hasnt changed', function(){
        var t = new Test2();
        t.list.push(new Test2(), new Test2());
        clean(t, 'list');
        t.list[0].stringProp = "uh oh";
        expect(isDirty(t)).toBe(true);
        expect(isDirty(t, 'list')).toBe(true);
    });

    it('should clean dirty objects within an array', function() {
        var t = new Test2();
        t.list.push(new Test2(), new Test2());
        clean(t, 'list');
        t.list[0].stringProp = "uh oh";
        clean(t, 'list');
        expect(isDirty(t.list[0])).toBe(false);
    });

    it('should clean dirty objects within objects', function() {
        var t = new Test2();
        t.subobject = new Test2();
        t.subobject.subobject = new Test2();
        clean(t);
        t.subobject.subobject.stringProp = "changed";
        clean(t, 'subobject');
        expect(isDirty(t)).toBe(false);
        expect(isDirty(t.subobject)).toBe(false);
        expect(isDirty(t.subobject.subobject)).toBe(false);
    });

    //todo this test isnt passing yet
    xit('should clean nested arrays', function() {
        var t = new Test2();
        t.nestedArrays.push([
            new Test2(), new Test2()
        ], [new Test2(), new Test2()]);
        expect(isDirty(t)).toBe(true);
        clean(t);
        expect(isDirty(t)).toBe(false);
        t.nestedArrays[0][0].stringProp = "nope";
        expect(isDirty(t.nestedArrays[0])).toBe(true);
        clean(t);
        expect(isDirty(t)).toBe(false);
    });
});