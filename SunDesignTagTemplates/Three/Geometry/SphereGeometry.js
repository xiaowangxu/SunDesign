import { ALL_INPUTS_TYPES, DepGraph, Types, Collection, ExpTypes, TypesManagerSingleton, BitMask } from '../../../SunDesign/Core.js';
import { parse_Constant, parse_Expression, test_IdentifierName, test_Number } from '../../../SunDesign/Core.js';
import { typeCheck } from '../../../SunDesign/sPARks.js';
import { SDML_Compile_CodeGen, create_Component } from '../../../SunDesign/Compiler.js';
import { SDML_Compiler_Visitor } from '../../../SunDesign/TagVisitor.js';
import { registe_Tag } from '../../../SunDesign/TagCollection.js';

// BITMASKS = [r	, ws    , hs    , ps    , pe    , ts	, te	, children  ]
// BITMASKS = [1	, 2		, 4 	, 8		, 16    , 32    , 64    ,           ]

export const TAG_THREE_SphereGeometry_0 =
{
    name: 'component_THREE_SphereGeometry', code: `class component_THREE_SphereGeometry extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.b = [0];
        this.init(i, c, s);
    }
    init(i, c, s) {
        const geo = new THREE.SphereGeometry(i.r, i.ws, i.hs, i.ps, i.pe, i.ts, i.te);
        this.r = {
            n: { spheregeometry: [geo] },
            e: {}
        }
    }
    update(i, c, s) {
        const geo = this.r.n.spheregeometry[0];
        if (this.b[0] & 127) {
            geo.dispose();
            this.r.n.spheregeometry[0] = new THREE.SphereGeometry(i.r, i.ws, i.hs, i.ps, i.pe, i.ts, i.te);
            return true;
        }
        return false;
    }
    dispose() {
        this.r.n.spheregeometry[0].dispose();
        this.r.n.spheregeometry = undefined;
        // console.log("dispose component_THREE_SphereGeometry");
    }
}`}

class SDML_THREE_SphereGeometry extends SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast) {
        super(scope, name, id, parent, ast, TypesManagerSingleton.param('spheregeometry'), ['r', 'ws', 'hs', 'ps', 'pe', 'ts', 'te']);
    }

    static inputs = Types.NONE;

    to_Mermaid(ans) {
        ans.push(`Node_${this.uid}(sphere-geometry id=${this.id})`);
    }

    add_ToCollection(collection, param) {
        collection.add(param, 'spheregeometry', this);
    }

    get_Type() {
        return SDML_THREE_SphereGeometry.type;
    }

    get_NewNode(codegen) {
        return codegen.registe_Template(TAG_THREE_SphereGeometry_0);
    }

    static get type() {
        return new Types({ spheregeometry: 1 });
    }
}

registe_Tag('sphere-geo', SDML_THREE_SphereGeometry);