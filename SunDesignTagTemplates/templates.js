import { TAG_Number_0 } from "./Number/Number.js";
import { TAG_Add_0 } from "./Number/Add.js";
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
}`
export {
    // TAG_Number
    BASE,
    TAG_Number_0,
    TAG_Add_0,
}