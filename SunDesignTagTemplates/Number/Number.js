import { ALL_INPUTS_TYPES, DepGraph, Types, Collection, ExpTypes, TypesManagerSingleton, BitMask } from '../../SunDesign/Core.js';
import { parse_Constant, parse_Expression, test_IdentifierName, test_Number } from '../../SunDesign/Core.js';
import { typeCheck } from '../../SunDesign/sPARks.js';
import { SDML_Compile_CodeGen, create_Component, SDML_Compile_Error } from '../../SunDesign/Compiler.js';
import { SDML_Compiler_Visitor } from '../../SunDesign/TagVisitor.js';
import { registe_Tag } from '../../SunDesign/TagCollection.js';

export const TAG_Number_0 =
{
    name: 'component_Num', code: `class component_Num extends ComponentBase {
    constructor(i, c, s) {
        super({n:0, ...i}, [0]);
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.r = {
            n: { number: [i.n] },
            e: {}
        }
    }
    update(i, c, s) {
        if ((this.b[0] & 1) && (i.n !== this.r.n.number[0])) {
            this.r.n.number[0] = i.n;
            return true;
        }
        return false;
    }
    dispose() {
        // console.log("dispose component_Num", this.r.n.number[0]);
    }
}`}

export const TAG_Number_2 =
{
    name: 'component_Num2', code: `class component_Num2 extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.r = {
            n: { int: [i.int], float: [i.float]},
            e: {}
        }
    }
    update(i, c, s) {
        let $changed = false;
        if (i.int !== this.r.n.int[0]) {
            this.r.n.int[0] = i.int;
            $changed ||= true;
        }
        if (i.float !== this.r.n.float[0]) {
            this.r.n.float[0] = i.float;
            $changed ||= true;
        }
        return $changed;
    }
    dispose() {
        // console.log("dispose component_Num2", this.r.n.int[0]);
    }
}`}

class SDML_Number extends SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast) {
        super(scope, name, id, parent, ast, {
            n: {
                datatype: ExpTypes.base(ExpTypes.number),
                default: '0'
            }
        }, ['n']);
    }

    static inputs = Types.NONE;

    to_Mermaid(ans) {
        ans.push(`Node_${this.uid}(number id=${this.id})`);
    }

    add_ToCollection(collection, param) {
        collection.add(param, 'number', this);
    }

    get_Type() {
        return SDML_Number.type;
    }

    get_NewNode(codegen) {
        return codegen.registe_Template(TAG_Number_0);
    }

    static get type() {
        return new Types({ number: 1 });
    }
}

class SDML_Number2 extends SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast) {
        super(scope, name, id, parent, ast, {
            int: {
                datatype: ExpTypes.base(ExpTypes.int)
            },
            float: {
                datatype: ExpTypes.base(ExpTypes.float)
            },
        });
    }

    static inputs = Types.NONE;

    to_Mermaid(ans) {
        ans.push(`Node_${this.uid}(number2 id=${this.id})`);
    }

    add_ToCollection(collection, param) {
        collection.add(param, 'int', this);
        collection.add(param, 'float', this);
    }

    get_Type() {
        return SDML_Number2.type;
    }

    get_NewNode(codegen) {
        return codegen.registe_Template(TAG_Number_2);
    }

    static get type() {
        return new Types({ int: 1, float: 1 });
    }
}

registe_Tag('num', SDML_Number);
registe_Tag('num2', SDML_Number2);