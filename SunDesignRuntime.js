class ComponentBase {
    constructor(i, c, s) {
        this.i = i ?? {};
        this.r = s;
    }
    init(c, s) {
    }
    update(i, c, s) {
    }
    dispose() {
    }
    ref(id) {
        console.log(id);
    }
}
class component_Add extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(c, s);
    }
    init(c, s) {
        const ans = c.default.float.reduce((f, sum) => sum += f, 0);
        this.r = {
            n: { float: [ans] },
            e: {}
        }
    }
    update(i, c, s) {
        const last_inputs = this.i;
        this.i = i;
    }
    dispose() {
        console.log("dispose component_Add");
    }
}

class component_Component_3 extends ComponentBase {
    constructor(i, c, s) {
        super(i ?? { a: 0, b: undefined });
        this.r = null;
        this.node_10 = null;
        this.node_12 = null;
        this.node_13 = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_10 = s.nums;
        this.node_12 = s.nums2;
        this.node_13 = new component_Add({}, { default: { float: [...this.node_10.float, ...this.node_12.float] } }, {});
        this.r = { n: { float: [...this.node_13.r.n.float] }, e: { result: (this.i.a - this.i.b) } };
    }
    update(i, c, s) {
    }
    dispose() {
        this.node_10 = undefined;
        this.node_12 = undefined;
        this.node_13.dispose();
        console.log(`dispose component_Component_3`);
    }
    ref(id) {
        switch (id) {
        }
    }
}

class component_Num extends ComponentBase {
    constructor(i, c, s) {
        super(i ?? { n: 0 });
        this.init(c, s);
    }
    init(c, s) {
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
        console.log("dispose component_Num", this.i.n);
    }
}

class component_Component_0 extends ComponentBase {
    constructor(i, c, s) {
        super(i ?? { input2: true });
        this.r = null;
        this.node_17 = null;
        this.node_19 = null;
        this.node_21 = null;
        this.node_23 = null;
        this.node_24 = null;
        this.node_26 = null;
        this.node_27 = null;
        this.node_26_param_n = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_17 = new component_Num({ n: -1 }, {}, {});
        this.node_19 = new component_Num({ n: 46 }, {}, {});
        this.node_21 = new component_Num({ n: 1 }, {}, {});
        this.node_23 = new component_Num({ n: 44 }, {}, {});
        this.node_24 = new component_Component_3({ a: 0, b: 4 }, {}, { nums: { float: [...this.node_17.r.n.float, ...this.node_19.r.n.float] }, nums2: { float: [...this.node_21.r.n.float, ...this.node_23.r.n.float] } });
        this.node_26_param_n = (this.ref('slots').r.e.result * 2);
        this.node_26 = new component_Num({ n: this.node_26_param_n }, {}, {});
        this.node_27 = new component_Add({}, { default: { float: [...this.node_24.r.n.float, ...this.node_26.r.n.float] } }, {});
        this.r = { n: { float: [...this.node_27.r.n.float] }, e: { input0: (this.ref('slots').r.e.result - 1) } };
    }
    update(i, c, s) {
    }
    dispose() {
        this.node_17.dispose();
        this.node_19.dispose();
        this.node_21.dispose();
        this.node_23.dispose();
        this.node_24.dispose();
        this.node_26.dispose();
        this.node_27.dispose();
        console.log(`dispose component_Component_0`);
    }
    ref(id) {
        switch (id) {
            case 'slots': return this.node_24;
        }
    }
}

let a = new component_Component_0({ input2: true });
console.log(a);
// a.dispose();