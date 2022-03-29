import { ALL_INPUTS_TYPES, DepGraph, Types, Collection, ExpTypes, TypesManagerSingleton, BitMask } from '../../SunDesign/Core.js';
import { parse_Constant, parse_Expression, test_IdentifierName, test_Number } from '../../SunDesign/Core.js';
import { typeCheck } from '../../SunDesign/sPARks.js';
import { SDML_Compile_CodeGen, create_Component, SDML_Compile_Error } from '../../SunDesign/Compiler.js';
import { SDML_Compiler_Visitor } from '../../SunDesign/TagVisitor.js';
import { registe_Tag } from '../../SunDesign/TagCollection.js';

const TAG_Add_0 =
{
    name: 'component_Add', code: `class component_Add extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(c, s);
    }
    init(c, s) {
        const ans = c.default.number.reduce((f, sum) => sum += f, 0);
        this.r = {
            n: { number: [ans] },
            e: { result: ans }
        }
    }
    update(i, c, s) {
        const ans = c.default.number.reduce((f, sum) => sum += f, 0);
        if (ans !== this.r.n.number[0]) {
            this.r.n.number[0] = ans;
            this.r.e.result = ans;
            return true;
        }
        return false;
    }
    dispose() {
        // console.log("dispose component_Add");
    }
}`}

class SDML_Add extends SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast) {
        super(scope, name, id, parent, ast);
        this.matched = null;
        this.subs = [];
    }

    static entries = [];
    static inputs = {
        default: {
            default: new Types({
                number: Infinity
            })
        },
    };
    static exports = {
        result: ExpTypes.base(ExpTypes.float),
    }

    to_Mermaid(ans, link) {
        ans.push(`Node_${this.uid}(add id=${this.id} match=${this.matched})`);
        if (this.matched === 'default')
            for (const sub of this.subs) {
                link.push(`Node_${sub.uid} -->|number| Node_${this.uid}`);
            }
    }

    receive_Sub(types, collection, match_type) {
        this.matched = match_type;
        switch (match_type) {
            case 'default': {
                const defaults = collection.get_Class('default', 'number');
                this.subs = defaults;
                for (const node of defaults) {
                    this.scope.graph.add_Edge(node, this);
                }
                break;
            }
        }
    }

    add_ToCollection(collection, param) {
        collection.add(param, 'number', this);
    }

    get_NewNode(codegen) {
        return codegen.registe_Template(TAG_Add_0);
    }

    get_NodeChildren(codegen) {
        switch (this.matched) {
            case 'default': {
                const ans = { default: { number: [] } };
                this.subs.forEach(s => ans.default.number.push(...s.get_TypeMapped('number')));
                return ans;
            }
        }
    }

    get_Type() {
        return SDML_Add.type;
    }

    static get type() {
        return new Types({ number: 1 });
    }
}

registe_Tag('add', SDML_Add);