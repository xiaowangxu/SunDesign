import { TAG_Number_0, TAG_Number_2 } from "./Number/Number.js";
import { TAG_Add_0 } from "./Number/Add.js";
import { TAG_ComputeBase_0 } from "./Compute/ComputeBase.js";
import { TAG_CollectBase } from "./Compute/Collect.js";
import { TAG_CacheBase } from "./Compute/Cache.js";
import { TAG_THREE_Vec2_0 } from "./Three/Vec2.js";
import { TAG_THREE_Scene_0 } from "./Three/Scene.js";
import { TAG_THREE_Object3D_0 } from "./Three/Object3D.js";
import { TAG_THREE_PerspectiveCamera_0 } from "./Three/PerspectiveCamera.js";
import { TAG_THREE_BoxGeometry_0 } from "./Three/Geometry/BoxGeometry.js";
import { TAG_THREE_Mesh_0 } from "./Three/Mesh.js";
import { TAG_THREE_StandardMaterial_0 } from "./Three/Material/StandardMaterial.js";
const BASE =
    `class ComponentBase {
    constructor(i, b) {
        this.i = i;
        this.r = null;
        this.b = b;
    }
    init(c, s) {
    }
    diff(i) {
    }
    update(i, c, s) {
        return false;
    }
    dispose() {
    }
    ref(id) {
        console.log(id);
    }
}
`
export {
    BASE,
    TAG_Number_0,
    TAG_Number_2,
    TAG_Add_0,
    TAG_ComputeBase_0,
    TAG_CollectBase,
    TAG_CacheBase,
    // THREE
    TAG_THREE_Object3D_0,
    TAG_THREE_Scene_0,
    TAG_THREE_PerspectiveCamera_0,
    TAG_THREE_BoxGeometry_0,
    TAG_THREE_StandardMaterial_0,
    TAG_THREE_Vec2_0,
    TAG_THREE_Mesh_0,
}