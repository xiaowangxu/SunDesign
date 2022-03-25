export const TAG_Number_0 =
{
    name: 'component_Num', code: `class component_Num extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.r = {
            n: { float: [i.n] },
            e: {}
        }
    }
    update(i, c, s) {
        if (i.n !== this.r.n.float[0]) {
            this.r.n.float[0] = i.n;
            return true;
        }
        return false;
    }
    dispose() {
        // console.log("dispose component_Num", this.r.n.float[0]);
    }
}`}