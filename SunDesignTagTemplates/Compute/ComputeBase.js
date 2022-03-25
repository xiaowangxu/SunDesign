export const TAG_ComputeBase_0 =
{
    name: 'component_ComputeBase', code: `class component_ComputeBase extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.r = {
            n: {},
            e: {result: i.exp}
        }
    }
    update(i, c, s) {
        if (i.exp !== this.r.e.result) {
            this.r.e.result = i.exp;
            return true;
        }
        return false;
    }
    dispose() {
        // console.log("dispose component_Num");
    }
}`}