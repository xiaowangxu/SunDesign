import { TAG_Number_0 } from "./Number/Number.js";
import { TAG_Add_0 } from "./Number/Add.js";
import { TAG_ComputeBase_0 } from "./Compute/ComputeBase.js";
import { TAG_CollectBase } from "./Compute/Collect.js";
import { TAG_CacheBase } from "./Compute/Cache.js";
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
    TAG_Add_0,
    TAG_ComputeBase_0,
    TAG_CollectBase,
    TAG_CacheBase,
}