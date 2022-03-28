import { SourceScript, SunDesignExpressionLexer, SunDesignExpressionParser, SunDesignExpressionTypeCheckPass, SunDesignExpressionOptimizationPass, SunDesignExpressionCodeGenPass, typeToString } from './SunDesignExpression.js';

const sunlang = SunDesignExpressionParser
const CODEGEN_INPUT_BASE = 'this.i';

export function parse_Constant(str, name = "Source") {
    const source = new SourceScript(str, name);
    const lexer = new SunDesignExpressionLexer(source);
    lexer.tokenize();
    if (lexer.errors.length > 0) {
        return [null, null, lexer.errors.map(err => {
            let [s, starter] = source.get_ScriptPortion(err.start, err.end, '^', undefined, false)
            return `${s}\n${starter}${err.type}`
        })]
    }
    const ast = sunlang.match(lexer.tokens);
    if (ast[3] !== undefined) {
        let err = ast[3];
        let errs;
        while (err !== undefined) {
            errs = err;
            err = err.last;
        }
        const first = errs;
        const [s, starter] = source.get_ScriptPortion(first.start, first.end, '^', undefined, false)
        return [null, null, [`${s}\n${starter}${first.type}\n${first.message.split('\n').map(i => starter + i).join('\n')}`]]
    }
    else {
        const walker = SunDesignExpressionTypeCheckPass;
        const [astnew, err] = walker.walk(source, ast[2][1]);
        if (err.length > 0) {
            return [null, null, err.map((err) => {
                const [s, starter] = source.get_ScriptPortion(err.start, err.end, '^')
                return `${s}${starter}${err.type}\n${err.message.split('\n').map(i => `${starter}` + `${i}`).join('\n')}`;
            })]
        }

        const walker2 = SunDesignExpressionOptimizationPass
        const [astnew2, err2] = walker2.walk(source, astnew);
        if (err2.length > 0) {
            return [null, null, err2.map((err) => {
                const [s, starter] = source.get_ScriptPortion(err.start, err.end, '^')
                return `${s}${starter}${err.type}\n${err.message.split('\n').map(i => `${starter}` + `${i}`).join('\n')}`;
            })]
        }

        // return [astnew2, []];
        const walker3 = SunDesignExpressionCodeGenPass
        const [code, opt] = walker3.generate(astnew2);
        return [code, opt, []];
    }
}

export function parse_Expression(str, name = "Source", inputs, nodes) {
    const source = new SourceScript(str, name);
    const lexer = new SunDesignExpressionLexer(source);
    lexer.tokenize();
    if (lexer.errors.length > 0) {
        return [null, null, lexer.errors.map(err => {
            let [s, starter] = source.get_ScriptPortion(err.start, err.end, '^', undefined, false)
            return `${s}\n${starter}${err.type}`
        })]
    }
    const ast = sunlang.match(lexer.tokens);
    if (ast[3] !== undefined) {
        let err = ast[3];
        let errs;
        while (err !== undefined) {
            errs = err;
            err = err.last;
        }
        const first = errs;
        const [s, starter] = source.get_ScriptPortion(first.start, first.end, '^', undefined, false)
        return [null, null, [`${s}\n${starter}${first.type}\n${first.message.split('\n').map(i => starter + i).join('\n')}`]]
    }
    else {
        const walker = SunDesignExpressionTypeCheckPass;
        const [astnew, err] = walker.walk(source, ast[2][1], inputs, nodes);
        if (err.length > 0) {
            return [null, null, err.map((err) => {
                const [s, starter] = source.get_ScriptPortion(err.start, err.end, '^')
                return `${s}${starter}${err.type}\n${err.message.split('\n').map(i => `${starter}` + `${i}`).join('\n')}`;
            })]
        }

        const walker2 = SunDesignExpressionOptimizationPass
        const [astnew2, err2] = walker2.walk(source, astnew);
        if (err2.length > 0) {
            return [null, null, err2.map((err) => {
                const [s, starter] = source.get_ScriptPortion(err.start, err.end, '^')
                return `${s}${starter}${err.type}\n${err.message.split('\n').map(i => `${starter}` + `${i}`).join('\n')}`;
            })]
        }

        const walker3 = SunDesignExpressionCodeGenPass
        const [code, opt] = walker3.generate(astnew2, { INPUTS: CODEGEN_INPUT_BASE });
        return [code, opt, []];
    }
}

export function test_IdentifierName(name) {
    return /^[\_|a-zA-Z](\w)*$/.test(name);
}

export function test_Number(num) {
    return /^[0-9]*$/.test(num);
}

export const ALL_INPUTS_TYPES = {
    number: {
        default: (val) => { return val },
        datatype: () => ExpTypes.base(ExpTypes.number)
    },
    int: {
        default: (val) => { return val },
        datatype: () => ExpTypes.base(ExpTypes.int)
    },
    float: {
        default: (val) => { return val },
        datatype: () => ExpTypes.base(ExpTypes.float)
    },
    bool: {
        default: (val) => { return val },
        datatype: () => ExpTypes.base(ExpTypes.bool)
    },
    string: {
        default: (val) => { return val },
        datatype: () => ExpTypes.base(ExpTypes.string)
    },
    vec2: {
        default: (val) => { return val },
        datatype: () => ExpTypes.base(ExpTypes.vec2)
    },
    vec3: {
        default: (val) => { return val },
        datatype: () => ExpTypes.base(ExpTypes.vec3)
    },
    euler: {
        default: (val) => { return val },
        datatype: () => ExpTypes.base(ExpTypes.vec3)
    },
    mat4: {
        default: (val) => { return val },
        datatype: () => ExpTypes.base(ExpTypes.mat4)
    },
}

class DepGraphError {
    constructor(msg, map) {
        this.msg = msg;
        this.map = new DepGraph(map).to_Mermaid();
    }

    toString() {
        return this.to_String();
    }

    get graph() {
        return this.map;
    }

    to_String() {
        return `Graph Error: ${this.msg}\nMermaid Code:\n${this.map}`;
    }
}

export class DepGraph {
    constructor(map) {
        this.edges = map ?? new Map();
    }

    add_Node(node) {
        if (!this.edges.has(node))
            this.edges.set(node, new Set());
    }

    add_Edge(from, to) {
        this.add_Node(from);
        this.add_Node(to);
        const edge = this.edges.get(to);
        edge.add(from);
    }

    get_TopologicalOrder() {
        const order = [];
        let flag = false;
        const edges = new Map(this.edges);
        edges.forEach((val, key, map) => {
            map.set(key, new Set(val));
        })
        while (edges.size > 0) {
            flag = false;
            const entry = [...edges.entries()];
            entry.forEach(([key, val]) => {
                if (val.size === 0) {
                    order.push(key);
                    edges.delete(key);
                    edges.forEach(val => val.delete(key));
                    flag = true;
                }
            })
            if (!flag)
                break;
        }
        if (edges.size > 0) throw new DepGraphError('fail to sort graph into topological order, one or more circlar references may exist', edges);
        return order;
    }

    to_Mermaid(title = 'graph LR') {
        /**
        graph LR
            A[Christmas] -->|Get money| B(Go shopping)
                    B --> C{Let me think}
            C -->|One| D[Laptop]
            C -->|Two| E[iPhone]
            C -->|Three| F[fa:fa-car Car]
                */
        const links = [...this.edges.entries()].map(([key, val]) => {
            if (val.size === 0) return [`${key.toGraphNode()}`]
            return [...val.entries()].map(([val]) => `${val.toGraphNode()} --> ${key.toGraphNode()}`)
        }).flat(1);
        return `${title}\n${links.join("\n")}`;
    }

}

class TypesManager {
    constructor() {
        this.map = {};
    }

    extends(base = null, type, params) {
        this.map[type] = {
            name: type,
            parent: base === null ? null : (this.map[base] ?? null),
            params: params
        };
    }

    instance_of(a, b) {
        if (a in this.map && b in this.map) {
            let cnt = a;
            while (true) {
                if (cnt === null) return false;
                if (cnt === b) return true;
                cnt = this.map[cnt].parent?.name ?? null;
            }
        }
        return false;
    }

    param(a) {
        if (a in this.map) {
            const arr = [];
            let ans = {};
            let cnt = a;
            while (true) {
                if (cnt === null) break;
                const obj = this.map[cnt];
                arr.push(obj.params);
                cnt = obj.parent?.name ?? null;
            }
            arr.reverse();
            arr.forEach(params => ans = { ...ans, ...params });
            return ans;
        }
    }
}

export const TypesManagerSingleton = new TypesManager();

export class Types {
    constructor(types = null) {
        this.types = types === null ? null : { ...types };
    }

    to_Map() {
        return this.is_Empty() ? new Map() : new Map(Object.entries(this.types));
    }

    is_Empty() {
        return this.types === null;
    }

    clone() {
        return new Types(this.types);
    }

    merge_Types(types) {
        if (types.is_Empty()) return this.clone();
        const _a = new Types(this.is_Empty() ? {} : this.types);
        for (let type in types.types) {
            _a.types[type] = (_a.types[type] ?? 0) + types.types[type];
        }
        return _a;
        // return new Types(merge_Types(this.types, types.types));
    }

    merge_TypesLocal(types) {
        if (types.is_Empty()) return;
        this.types = this.is_Empty() ? {} : { ...this.types };
        const _a = this.types;
        for (let type in types.types) {
            _a[type] = (_a[type] ?? 0) + types.types[type];
        }
        return _a;
    }

    match_Types(types, inf = false, ext = false, extends_map = []) {
        if (types.is_Empty()) return this.types === types.types;
        if (this.is_Empty()) {
            for (let key in types.types) {
                const count_a = types.types[key];
                if (count_a !== Infinity) return false;
            }
            return true;
        }
        else {
            const map = this.to_Map();
            const keys = [...map.keys()];
            for (let key in types.types) {
                const mapped_keys = keys.map(t => {
                    return t === key || TypesManagerSingleton.instance_of(t, key);
                });
                const passed = mapped_keys.reduce((last, cnt) => last || cnt, false);
                const count_b = mapped_keys.reduce((last, cnt, idx) => {
                    if (cnt) last += map.get(keys[idx]);
                    return last;
                }, 0);
                const count_a = types.types[key];
                // console.log(passeed, count_b);
                if (!passed/*!map.has(key)*/) {
                    if (inf && count_a === Infinity);
                    else
                        return false
                };
                // const count_b = map.get(key);
                if (inf && count_a === Infinity);
                else if (count_a !== count_b) return false;
                extends_map.push({ target: key, subtypes: keys.filter((t, idx) => mapped_keys[idx]) });
                mapped_keys.forEach((i, idx) => {
                    const map_key = keys[idx];
                    if (i) map.delete(map_key);
                })
                // map.delete(key);
            }
            if (ext && map.size > 0) return false;
            return true;
        }

    }

    make_Infinity() {
        if (this.is_Empty()) return this;
        for (let type in this.types) {
            this.types[type] = Infinity;
        }
        return this;
    }

    get type_names() {
        if (this.is_Empty()) return [];
        return Object.keys(this.types);
    }

    to_String() {
        return this.toString();
    }

    toString() {
        return this.to_List().join(', ');
    }

    to_List() {
        if (this.is_Empty()) return ['(empty)'];
        return Object.entries(this.types).map(([type, count]) => `${type} * ${count}`);
    }

    static NONE = null;
    static IGNORE = Symbol("ignore all types");
}

export class Collection {
    constructor() {
        this.collection = {};
    };

    get slots_name() {
        return Object.keys(this.collection);
    }

    add_Class(match_type) {
        if (match_type in this.collection) return this.collection[match_type];
        else {
            const match_obj = {};
            this.collection[match_type] = match_obj;
            return match_obj;
        }
    }

    add(match_type, type, node) {
        const match_obj = this.add_Class(match_type);
        if (type in match_obj) match_obj[type].add(node);
        else {
            const set = new Set();
            set.add(node);
            match_obj[type] = set;
        }
    }

    get(param) {
        return this.collection[param];
    }

    get_All(param) {
        const _class = this.get(param);
        const arr = [];
        for (const key in _class) {
            arr.push(..._class[key]);
        }
        return [...new Set(arr)];
    }

    get_Class(param, typename) {
        return [...(this.collection?.[param]?.[typename] ?? [])];
    }

    merge_Local(collection) {
        // debugger
        for (const param in collection.collection) {
            if (param in this.collection) {
                const types = collection.collection[param];
                for (const type in types) {
                    const nodes = types[type];
                    for (const node of nodes) {
                        if (!this.collection[param][type].includes(node)) this.collection[param][type].push(node);
                    }
                }
            }
            else {
                this.collection[param] = collection.collection[param];
            }
        }
    }

    get_AllChildren(param) {
        if (this.collection[param] === undefined) return;
        let array = [];
        for (let set in this.collection[param]) {
            array = [...array, ...this.collection[param][set]];
        }
        return array;
    }
}

export class ExpTypes {
    static int = 'int';
    static float = 'float';
    static bool = 'bool';
    static string = 'string';
    static vec2 = 'vec2';
    static vec3 = 'vec3';
    static mat4 = 'mat4';
    static color = 'color';
    static quat = 'quat';
    static euler = 'euler';
    static any = '$any';
    static number = '$number';
    static base(type) {
        return {
            type: 'datatype',
            datatype: 'base',
            value: type
        }
    }
    static array(type, count = null) {
        return {
            type: "datatype",
            datatype: "arraytype",
            count: count,
            value: type
        }
    }
}

export class BitMask {
    constructor(inputs = []) {
        this.inputs = inputs;
        this.count = inputs.length;
        this.int_count = Math.ceil(this.count / 31);
    }

    static add_Mask(i, pos) {
        return i | (1 << pos);
    }

    get_Index(input) {
        return this.inputs.indexOf(input);
    }

    get_Masks(inputs) {
        const ans = {};
        for (const input of inputs) {
            const idx = this.get_Index(input);
            if (idx === -1) continue;
            const pos = idx % 31;
            const cnt = Math.floor(idx / 31);
            if (cnt in ans) {
                ans[cnt] = BitMask.add_Mask(ans[cnt], pos);
            }
            else {
                ans[cnt] = BitMask.add_Mask(0, pos);
            }
        }
        return Object.entries(ans).map(([cnt, pos]) => [parseInt(cnt), pos]);
    }

    get mask_count() {
        return this.int_count;
    }

    to_String() {

    }

    get_EmptyArrayString() {
        const arr = [];
        const size = this.mask_count;
        for (let i = 0; i < size; i++)
            arr.push('0');
        return `[${arr.join(', ')}]`;
    }
}