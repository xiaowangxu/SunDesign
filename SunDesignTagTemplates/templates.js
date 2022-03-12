import { TAG_Number_0 } from "./Number/Number.js";
import { TAG_Add_0 } from "./Number/Add.js";
const BASE =
    `class ComponentBase {
    constructor(i, c, s) {
        this.i = i ?? {};
        this.r = null;
    }

    init(c, s) {
    }

    update(i, c, s) {
    }

    dispose() {
    }
}`

export {
    // TAG_Number
    BASE,
    TAG_Number_0,
    TAG_Add_0,
}