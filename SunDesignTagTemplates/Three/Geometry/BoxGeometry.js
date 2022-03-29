import { ALL_INPUTS_TYPES, DepGraph, Types, Collection, ExpTypes, TypesManagerSingleton, BitMask } from '../../../SunDesign/Core.js';
import { parse_Constant, parse_Expression, test_IdentifierName, test_Number } from '../../../SunDesign/Core.js';
import { typeCheck } from '../../../SunDesign/sPARks.js';
import { SDML_Compile_CodeGen, create_Component } from '../../../SunDesign/Compiler.js';
import { SDML_Compiler_Visitor } from '../../../SunDesign/TagVisitor.js';
import { registe_Tag } from '../../../SunDesign/TagCollection.js';

// BITMASKS = [w	, h	    , d     , ws    , hs    , ds	, children  ]
// BITMASKS = [1	, 2		, 4 	, 8		, 16    , 32    ,           ]

export const TAG_THREE_BoxGeometry_0 =
{
    name: 'component_THREE_BoxGeometry', code: `class component_THREE_BoxGeometry extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.b = [0];
        this.init(i, c, s);
    }
    init(i, c, s) {
        const geo = new THREE.BoxGeometry(i.w, i.h, i.d, i.ws, i.hs, i.ds);
        this.r = {
            n: { boxgeometry: [geo] },
            e: {}
        }
    }
    update(i, c, s) {
        const geo = this.r.n.boxgeometry[0];
        if (this.b[0] & 63) {
            geo.dispose();
            this.r.n.boxgeometry[0] = new THREE.BoxGeometry(i.w, i.h, i.d, i.ws, i.hs, i.ds);
            return true;
        }
        return false;
    }
    dispose() {
        this.r.n.boxgeometry[0].dispose();
        this.r.n.boxgeometry = undefined;
        // console.log("dispose component_THREE_BoxGeometry");
    }
}`}

class SDML_THREE_BoxGeometry extends SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast) {
        super(scope, name, id, parent, ast, TypesManagerSingleton.param('boxgeometry'), ['w', 'h', 'd', 'ws', 'hs', 'ds']);
    }

    static inputs = Types.NONE;

    to_Mermaid(ans) {
        ans.push(`Node_${this.uid}(box-geometry id=${this.id})`);
    }

    add_ToCollection(collection, param) {
        collection.add(param, 'boxgeometry', this);
    }

    get_Type() {
        return SDML_THREE_BoxGeometry.type;
    }

    get_NewNode(codegen) {
        return codegen.registe_Template(TAG_THREE_BoxGeometry_0);
    }

    static get type() {
        return new Types({ boxgeometry: 1 });
    }
}

registe_Tag('box-geo', SDML_THREE_BoxGeometry);