import { ALL_INPUTS_TYPES, DepGraph, Types, Collection, ExpTypes, TypesManagerSingleton, BitMask } from '../../SunDesign/Core.js';
import { parse_Constant, parse_Expression, test_IdentifierName, test_Number } from '../../SunDesign/Core.js';
import { typeCheck } from '../../SunDesign/sPARks.js';
import { SDML_Compile_CodeGen, create_Component, SDML_Compile_Error } from '../../SunDesign/Compiler.js';
import { SDML_Compiler_Visitor } from '../../SunDesign/TagVisitor.js';
import { registe_Tag } from '../../SunDesign/TagCollection.js';

// BITMASKS = [pos	, rot	, scale , bg    , children	]
// BITMASKS = [1	, 2		, 4 	, 8     , 16		]

export const TAG_THREE_Scene_0 =
{
    name: 'component_THREE_Scene', code: `class component_THREE_Scene extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.b = [0];
        this.init(i, c, s);
    }
    init(i, c, s) {
        const scene = new THREE.Scene();
        scene.position.copy(i.pos);
        scene.rotation.copy(i.rot);
        scene.scale.copy(i.scale);
        c.default.object3d.forEach(o=>scene.add(o));
        scene.background = i.bg;
        this.r = {
            n: { scene: [scene] },
            e: {}
        }
    }
    update(i, c, s) {
        let $changed = false;
        const scene = this.r.n.scene[0];
		if (this.b[0] & /* pos */ 1){
        	scene.position.copy(i.pos);
		}
		if (this.b[0] & /* rot */ 2){
        	scene.rotation.copy(i.rot);
		}
		if (this.b[0] & /* scale */ 4){
        	scene.scale.copy(i.scale);
		}
        if (this.b[0] & /* bg */ 8) {
            scene.background = i.bg;
        }
        if (this.b[0] & /* children */ 16) {
            scene.clear();
            c.default.object3d.forEach(o=>scene.add(o));
        }
        return $changed;
    }
    dispose() {
        // console.log("dispose component_THREE_Scene");
    }
}`}

class SDML_THREE_Scene extends SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast) {
        super(scope, name, id, parent, ast, TypesManagerSingleton.param('scene'), ['pos', 'rot', 'scale', 'bg']);
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
        ans.push(`Node_${this.uid}(scene id=${this.id} match=${this.matched})`);
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
        collection.add(param, 'scene', this);
    }

    get_NewNode(codegen) {
        return codegen.registe_Template(TAG_THREE_Scene_0);
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
        return SDML_THREE_Scene.type;
    }

    static get type() {
        return new Types({ scene: 1 });
    }
}

registe_Tag('scene', SDML_THREE_Scene);
