import { ALL_INPUTS_TYPES, DepGraph, Types, Collection, ExpTypes, TypesManagerSingleton, BitMask } from '../../SunDesign/Core.js';
import { parse_Constant, parse_Expression, test_IdentifierName, test_Number } from '../../SunDesign/Core.js';
import { typeCheck } from '../../SunDesign/sPARks.js';
import { SDML_Compile_CodeGen, create_Component, SDML_Compile_Error } from '../../SunDesign/Compiler.js';
import { SDML_Compiler_Visitor } from '../../SunDesign/TagVisitor.js';
import { registe_Tag } from '../../SunDesign/TagCollection.js';

const TAG_ComputeBase_0 =
{
    name: 'component_ComputeBase', code: `class component_ComputeBase extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.r = {
            n: {},
            e: {result: i.exp}
        }
    }
    update(i, c, s) {
        if (i.exp !== this.r.e.result) {
            this.r.e.result = i.exp;
            return true;
        }
        return false;
    }
    dispose() {
        // console.log("dispose component_Num");
    }
}`}

class SDML_Compute extends SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast) {
        const exp_type = ALL_INPUTS_TYPES[SDML_Compute.get_HintType(ast)[0]].datatype();
        // console.log(exp_type);
        super(scope, name, id, parent, ast, {
            exp: {
                datatype: exp_type
            }
        });
        // console.log(ast, this);
    }

    static inputs = Types.NONE;

    to_Mermaid(ans) {
        ans.push(`Node_${this.uid}(compute id=${this.id})`);
    }

    receive_Sub(types, collection, match_type) {
    }

    add_ToCollection(collection, param) {
    }

    get_NewNode(codegen) {
        return codegen.registe_Template(TAG_ComputeBase_0);
    }

    get_Type() {
        return SDML_Compute.type;
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
        const types = SDML_Compute.get_HintType(ast);
        if (types.length === 0)
            throw new SDML_Compile_Error(`compute node required a type hint like: <compute int exp="..."/>`);
        if (types.length > 1)
            throw new SDML_Compile_Error(`multiple type hints appear in node <compute ${types.join(' ')} exp="..."/>`);
        return { result: ALL_INPUTS_TYPES[types[0]].datatype() };
    }
}

registe_Tag('compute', SDML_Compute);
