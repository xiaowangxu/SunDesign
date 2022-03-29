import { ALL_INPUTS_TYPES, DepGraph, Types, Collection, ExpTypes, TypesManagerSingleton, BitMask } from '../../../SunDesign/Core.js';
import { parse_Constant, parse_Expression, test_IdentifierName, test_Number } from '../../../SunDesign/Core.js';
import { typeCheck } from '../../../SunDesign/sPARks.js';
import { SDML_Compile_CodeGen, create_Component } from '../../../SunDesign/Compiler.js';
import { SDML_Compiler_Visitor } from '../../../SunDesign/TagVisitor.js';
import { registe_Tag } from '../../../SunDesign/TagCollection.js';

// BITMASKS = [color	, emissive	, roughness , metalness , flat  , wireframe	, children  ]
// BITMASKS = [1	    , 2		    , 4 	    , 8		    , 16    , 32        , 64        ]

export const TAG_THREE_StandardMaterial_0 =
{
    name: 'component_THREE_StandardMaterial', code: `class component_THREE_StandardMaterial extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.b = [0];
        this.init(i, c, s);
    }
    init(i, c, s) {
        const mat = new THREE.MeshStandardMaterial({
            color: i.color,
            emissive: i.emissive,
            roughness: i.roughness,
            metalness: i.metalness,
            flatShading: i.flat,
            wireframe: i.wireframe,
        });
        this.r = {
            n: { standardmaterial: [mat] },
            e: {}
        }
    }
    update(i, c, s) {
        const mat = this.r.n.standardmaterial[0];
        if (this.b[0] & /* color */ 1) {
            mat.color = i.color;
        }
        if (this.b[0] & /* emissive */ 2) {
            mat.emissive = i.emissive;
        }
        if (this.b[0] & /* roughness */ 4) {
            mat.roughness = i.roughness;
        }
        if (this.b[0] & /* metalness */ 8) {
            mat.metalness = i.metalness;
        }
        if (this.b[0] & /* flat */ 16) {
            mat.flatShading = i.flat;
        }
        if (this.b[0] & /* wireframe */ 32) {
            mat.wireframe = i.wireframe;
        }
        if (this.b[0] & 63) {
            mat.needsUpdate = true;
        }
        return false;
    }
    dispose() {
        this.r.n.standardmaterial[0].dispose();
        this.r.n.standardmaterial = undefined;
        // console.log("dispose component_THREE_BoxGeometry");
    }
}`}

class SDML_THREE_Material extends SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast) {
        super(scope, name, id, parent, ast, TypesManagerSingleton.param('standardmaterial'), ['color', 'emissive', 'roughness', 'metalness', 'flat', 'wireframe']);
    }

    static inputs = Types.NONE;

    to_Mermaid(ans) {
        ans.push(`Node_${this.uid}(material id=${this.id})`);
    }

    add_ToCollection(collection, param) {
        collection.add(param, 'standardmaterial', this);
    }

    get_Type() {
        return SDML_THREE_Material.type;
    }

    get_NewNode(codegen) {
        return codegen.registe_Template(TAG_THREE_StandardMaterial_0);
    }

    static get type() {
        return new Types({ standardmaterial: 1 });
    }
}

registe_Tag('material', SDML_THREE_Material);