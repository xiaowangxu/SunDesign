import { ALL_INPUTS_TYPES, DepGraph, Types, Collection, ExpTypes, TypesManagerSingleton, BitMask } from '../../SunDesign/Core.js';
import { parse_Constant, parse_Expression, test_IdentifierName, test_Number } from '../../SunDesign/Core.js';
import { typeCheck } from '../../SunDesign/sPARks.js';
import { SDML_Compile_CodeGen, create_Component, SDML_Compile_Error } from '../../SunDesign/Compiler.js';
import { SDML_Compiler_Visitor } from '../../SunDesign/TagVisitor.js';
import { registe_Tag } from '../../SunDesign/TagCollection.js';

// BITMASKS = [pos	, rot	, scale , children	]
// BITMASKS = [1	, 2		, 4 	, 8		]

export const TAG_THREE_Mesh_0 =
{
    name: 'component_THREE_Mesh', code: `class component_THREE_Mesh extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        const mesh = new THREE.Mesh(c.default.geometry[0], c.default.material[0]);
        mesh.position.copy(i.pos);
        mesh.rotation.copy(i.rot);
        mesh.scale.copy(i.scale);
        this.r = {
            n: { mesh: [mesh] },
            e: {}
        }
    }
    update(i, c, s) {
        let $changed = false;
        const mesh = this.r.n.mesh[0];
		if (this.b[0] & /* pos */ 1){
        	mesh.position.copy(i.pos);
		}
		if (this.b[0] & /* rot */ 2){
        	mesh.rotation.copy(i.rot);
		}
		if (this.b[0] & /* scale */ 4){
        	mesh.scale.copy(i.scale);
		}
        if (this.b[0] & /* children */ 8) {
            if (mesh.geometry !== c.default.geometry[0])
                mesh.geometry = c.default.geometry[0];
            if (mesh.material !== c.default.material[0])
                mesh.material = c.default.material[0];
        }
        return $changed;
    }
    dispose() {
        // console.log("dispose component_THREE_Mesh");
    }
}`}

class SDML_THREE_Mesh extends SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast) {
        super(scope, name, id, parent, ast, TypesManagerSingleton.param('mesh'), ['pos', 'rot', 'scale']);
        this.matched = null;
        this.geo = null;
        this.mats = [];
    }

    static entries = [];
    static inputs = {
        default: {
            default: new Types({
                geometry: 1,
                material: 1,
            })
        },
    };
    static exports = {};

    to_Mermaid(ans, link) {
        ans.push(`Node_${this.uid}(mesh id=${this.id} match=${this.matched})`);
        if (this.matched === 'default') {
            for (const sub of this.mats) {
                link.push(`Node_${sub.uid} -->|material| Node_${this.uid}`);
            }
            link.push(`Node_${this.geo.uid} -->|geometry| Node_${this.uid}`);
        }
    }

    receive_Sub(types, collection, match_type) {
        this.matched = match_type;
        switch (match_type) {
            case 'default': {
                const mats = collection.get_Class('default', 'material');
                this.mats = mats;
                this.geo = collection.get_Class('default', 'geometry')[0];
                this.scope.graph.add_Edge(this.geo, this);
                for (const node of mats) {
                    this.scope.graph.add_Edge(node, this);
                }
                break;
            }
        }
    }

    add_ToCollection(collection, param) {
        collection.add(param, 'mesh', this);
    }

    get_NewNode(codegen) {
        return codegen.registe_Template(TAG_THREE_Mesh_0);
    }

    get_NodeChildren(codegen) {
        switch (this.matched) {
            case 'default': {
                const ans = { default: { geometry: [...this.geo.get_TypeMapped('geometry')], material: [] } };
                this.mats.forEach(s => ans.default.material.push(...s.get_TypeMapped('material')));
                return ans;
            }
        }
    }

    get_Type() {
        return SDML_THREE_Mesh.type;
    }

    static get type() {
        return new Types({ mesh: 1 });
    }
}

registe_Tag('mesh', SDML_THREE_Mesh);