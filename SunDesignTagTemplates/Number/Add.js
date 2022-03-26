export const TAG_Add_0 =
{
    name: 'component_Add', code: `class component_Add extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(c, s);
    }
    init(c, s) {
        const ans = c.default.number.reduce((f, sum) => sum += f, 0);
        this.r = {
            n: { number: [ans] },
            e: { result: ans }
        }
    }
    update(i, c, s) {
        const ans = c.default.number.reduce((f, sum) => sum += f, 0);
        if (ans !== this.r.n.number[0]) {
            this.r.n.number[0] = ans;
            this.r.e.result = ans;
            return true;
        }
        return false;
    }
    dispose() {
        // console.log("dispose component_Add");
    }
}`}