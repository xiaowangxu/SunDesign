export const TAG_Number_0 =
{
    name: 'component_Num', code: `class component_Num extends ComponentBase {
    constructor(i, c, s) {
        super(i ?? { n: 0 });
        this.init(c, s);
    }
    init(c, s) {
        console.log()
        this.r = {
            n: { float: [this.i.n] },
            e: {}
        }
    }
    update(i, c, s) {
        const last_inputs = this.i;
        this.i = i;
        if (inputs.n !== last_inputs.n) {
            this.r.n.float[0] = i.n;
        }
    }
    dispose() {
    }
}`}