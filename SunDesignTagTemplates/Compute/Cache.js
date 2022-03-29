import { ALL_INPUTS_TYPES, DepGraph, Types, Collection, ExpTypes, TypesManagerSingleton, BitMask } from '../../SunDesign/Core.js';
import { parse_Constant, parse_Expression, test_IdentifierName, test_Number } from '../../SunDesign/Core.js';
import { typeCheck } from '../../SunDesign/sPARks.js';
import { SDML_Compile_CodeGen, create_Component, SDML_Compile_Error } from '../../SunDesign/Compiler.js';
import { SDML_Compiler_Visitor } from '../../SunDesign/TagVisitor.js';
import { registe_Tag } from '../../SunDesign/TagCollection.js';

const TAG_CacheBase = (type) => {
    return {
        name: `component_CacheBase_${type}`, code: `class component_CacheBase_${type} extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.r = {
            n: {},
            e: {result: c.default.${type}[0]}
        }
    }
    update(i, c, s) {
        this.r.e.result = c.default.${type}[0];
        return true;
    }
    dispose() {
        // console.log("dispose component_CacheBase_${type}");
    }
}`}
}

class SDML_Cache extends SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast) {
        super(scope, name, id, parent, ast);
        this.exp_type = SDML_Cache.get_HintType(ast)[0];
        this.subs = [];
        // console.log(ast, this);
    }

    static inputs = Types.NONE;

    to_Mermaid(ans, link) {
        ans.push(`Node_${this.uid}(cache id=${this.id})`);
        for (const sub of this.subs) {
            link.push(`Node_${sub.uid} -->|${this.exp_type}| Node_${this.uid}`);
        }
    }

    receive_Sub(types, collection, match_type) {
        const defaults = collection.get_Class('default', this.exp_type);
        this.subs = defaults;
        for (const node of defaults) {
            this.scope.graph.add_Edge(node, this);
        }
    }

    add_ToCollection(collection, param) {
    }

    get_NewNode(codegen) {
        return codegen.registe_Template(TAG_CacheBase(this.exp_type));
    }

    get_NodeChildren(codegen) {
        const ans = { default: { [this.exp_type]: [] } };
        this.subs.forEach(s => ans.default[this.exp_type].push(...s.get_TypeMapped(this.exp_type)));
        return ans;
    }

    get_Type() {
        return SDML_Cache.type;
    }

    static get type() {
        return new Types();
    }

    static get_HintType(ast) {
        const types = [];
        for (const type in ALL_INPUTS_TYPES) {
            if (type in ast.attributes) types.push(type);
        }
        return types;
    }

    static get_ExportsTypes(ast) {
        const types = SDML_Cache.get_HintType(ast);
        if (types.length === 0)
            throw new SDML_Compile_Error(`collect node required a type hint like: <cache int/>`);
        if (types.length > 1)
            throw new SDML_Compile_Error(`multiple type hints appear in node <cache ${types.join(' ')}/>`);
        return { result: ALL_INPUTS_TYPES[types[0]].datatype() };
    }

    static get_InputsTypes(ast) {
        const types = SDML_Cache.get_HintType(ast);
        if (types.length === 0)
            throw new SDML_Compile_Error(`collect node required a type hint like: <cache int/>`);
        if (types.length > 1)
            throw new SDML_Compile_Error(`multiple type hints appear in node <cache ${types.join(' ')}/>`);
        return { default: { default: new Types({ [types[0]]: 1 }) } };
    }
}

registe_Tag('cache', SDML_Cache);