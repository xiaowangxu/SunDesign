import { ALL_INPUTS_TYPES, DepGraph, Types, Collection, ExpTypes, TypesManagerSingleton, BitMask } from '../../SunDesign/Core.js';
import { parse_Constant, parse_Expression, test_IdentifierName, test_Number } from '../../SunDesign/Core.js';
import { typeCheck } from '../../SunDesign/sPARks.js';
import { SDML_Compile_CodeGen, create_Component, SDML_Compile_Error } from '../../SunDesign/Compiler.js';
import { SDML_Compiler_Visitor } from '../../SunDesign/TagVisitor.js';
import { registe_Tag } from '../../SunDesign/TagCollection.js';

// BITMASKS = [pos	, rot	, scale , children	]
// BITMASKS = [1	, 2		, 4 	, 8		]

export const TAG_THREE_Object3D_0 =
{
    name: 'component_THREE_Object3D', code: `class component_THREE_Object3D extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.b = [0];
        this.init(i, c, s);
    }
    init(i, c, s) {
        const object3d = new THREE.Object3D();
        object3d.position.copy(i.pos);
        object3d.rotation.copy(i.rot);
        object3d.scale.copy(i.scale);
        c.default.object3d.forEach(o=>object3d.add(o));
        this.r = {
            n: { object3d: [object3d] },
            e: {}
        }
    }
    update(i, c, s) {
        let $changed = false;
        const object3d = this.r.n.object3d[0];
		if (this.b[0] & /* pos */ 1){
        	object3d.position.copy(i.pos);
		}
		if (this.b[0] & /* rot */ 2){
        	object3d.rotation.copy(i.rot);
		}
		if (this.b[0] & /* scale */ 4){
        	object3d.scale.copy(i.scale);
		}
        if (this.b[0] & /* children */ 8) {
            object3d.clear();
            c.default.object3d.forEach(o=>object3d.add(o));
        }
        return $changed;
    }
    dispose() {
        // console.log("dispose component_THREE_Object3D", this.r.n.object3d[0]);
    }
}`}

class SDML_THREE_Object3D extends SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast) {
        super(scope, name, id, parent, ast, TypesManagerSingleton.param('object3d'), ['pos', 'rot', 'scale']);
        this.matched = null;
        this.subs = [];
    }

    static entries = [];
    static inputs = {
        default: {
            default: new Types({
                object3d: Infinity
            })
        },
    };
    static exports = {};

    to_Mermaid(ans, link) {
        ans.push(`Node_${this.uid}(object3d id=${this.id} match=${this.matched})`);
        if (this.matched === 'default')
            for (const sub of this.subs) {
                link.push(`Node_${sub.uid} -->|object3d| Node_${this.uid}`);
            }
    }

    receive_Sub(types, collection, match_type) {
        this.matched = match_type;
        switch (match_type) {
            case 'default': {
                const defaults = collection.get_Class('default', 'object3d');
                this.subs = defaults;
                for (const node of defaults) {
                    this.scope.graph.add_Edge(node, this);
                }
                break;
            }
        }
    }

    add_ToCollection(collection, param) {
        collection.add(param, 'object3d', this);
    }

    get_NewNode(codegen) {
        return codegen.registe_Template(TAG_THREE_Object3D_0);
    }

    get_NodeChildren(codegen) {
        switch (this.matched) {
            case 'default': {
                const ans = { default: { object3d: [] } };
                this.subs.forEach(s => ans.default.object3d.push(...s.get_TypeMapped('object3d')));
                return ans;
            }
        }
    }

    get_Type() {
        return SDML_THREE_Object3D.type;
    }

    static get type() {
        return new Types({ object3d: 1 });
    }
}

registe_Tag('object3d', SDML_THREE_Object3D);