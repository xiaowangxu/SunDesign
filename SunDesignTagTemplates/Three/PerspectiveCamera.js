import { ALL_INPUTS_TYPES, DepGraph, Types, Collection, ExpTypes, TypesManagerSingleton, BitMask } from '../../SunDesign/Core.js';
import { parse_Constant, parse_Expression, test_IdentifierName, test_Number } from '../../SunDesign/Core.js';
import { typeCheck } from '../../SunDesign/sPARks.js';
import { SDML_Compile_CodeGen, create_Component, SDML_Compile_Error } from '../../SunDesign/Compiler.js';
import { SDML_Compiler_Visitor } from '../../SunDesign/TagVisitor.js';
import { registe_Tag } from '../../SunDesign/TagCollection.js';

// BITMASKS = [pos	, rot	, scale , fov	, near	, far	, children	]
// BITMASKS = [1	, 2		, 4 	, 8		, 16	, 32	, 64		]

export const TAG_THREE_PerspectiveCamera_0 =
{
    name: 'component_THREE_PerspectiveCamera', code: `class component_THREE_PerspectiveCamera extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.b = [0];
        this.init(i, c, s);
    }
    init(i, c, s) {
        const perspectivecamera = new THREE.PerspectiveCamera(i.fov, 1, i.near, i.far);
        perspectivecamera.position.copy(i.pos);
        perspectivecamera.rotation.copy(i.rot);
        perspectivecamera.scale.copy(i.scale);
        this.r = {
            n: { perspectivecamera: [perspectivecamera] },
            e: {}
        }
    }
    update(i, c, s) {
        let $changed = false;
        const perspectivecamera = this.r.n.perspectivecamera[0];
		if (this.b[0] & /* pos */ 1){
        	perspectivecamera.position.copy(i.pos);
		}
		if (this.b[0] & /* rot */ 2){
        	perspectivecamera.rotation.copy(i.rot);
		}
		if (this.b[0] & /* scale */ 4){
        	perspectivecamera.scale.copy(i.scale);
		}
        if (this.b[0] & /* fov */ 8) {
            perspectivecamera.fov = i.fov;
        }
        if (this.b[0] & /* near */ 16) {
            perspectivecamera.near = i.near;
        }
        if (this.b[0] & /* far */ 32) {
            perspectivecamera.far = i.far;
        }
        if (this.b[0] & /* fov, near, far */ 56) {
            perspectivecamera.updateProjectionMatrix();
        }
		return $changed;
    }
    dispose() {
        // console.log("dispose component_THREE_Object3D", this.r.n.object3d[0]);
    }
}`}

class SDML_THREE_PerspectiveCamera extends SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast) {
        super(scope, name, id, parent, ast, TypesManagerSingleton.param('perspectivecamera'), ['pos', 'rot', 'scale', 'fov', 'near', 'far']);
    }

    static inputs = Types.NONE;

    to_Mermaid(ans) {
        ans.push(`Node_${this.uid}(perspectivecamera id=${this.id})`);
    }

    add_ToCollection(collection, param) {
        collection.add(param, 'perspectivecamera', this);
    }

    get_Type() {
        return SDML_THREE_PerspectiveCamera.type;
    }

    get_NewNode(codegen) {
        return codegen.registe_Template(TAG_THREE_PerspectiveCamera_0);
    }

    static get type() {
        return new Types({ perspectivecamera: 1 });
    }
}

registe_Tag('perspectivecamera', SDML_THREE_PerspectiveCamera);