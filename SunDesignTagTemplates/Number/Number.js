export const TAG_Number_0 =
{
    name: 'component_Num', code: `class component_Num extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.r = {
            n: { number: [i.n] },
            e: {}
        }
    }
    update(i, c, s) {
        if (i.n !== this.r.n.number[0]) {
            this.r.n.number[0] = i.n;
            return true;
        }
        return false;
    }
    dispose() {
        // console.log("dispose component_Num", this.r.n.number[0]);
    }
}`}

export const TAG_Number_2 =
{
    name: 'component_Num2', code: `class component_Num2 extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.r = {
            n: { int: [i.int], float: [i.float]},
            e: {}
        }
    }
    update(i, c, s) {
        let $changed = false;
        if (i.int !== this.r.n.int[0]) {
            this.r.n.int[0] = i.int;
            $changed ||= true;
        }
        if (i.float !== this.r.n.float[0]) {
            this.r.n.float[0] = i.float;
            $changed ||= true;
        }
        return $changed;
    }
    dispose() {
        // console.log("dispose component_Num2", this.r.n.int[0]);
    }
}`}