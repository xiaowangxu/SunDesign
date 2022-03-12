class ComponentBase {
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
}
class component_Num extends ComponentBase {
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
}

class closure_For_7 extends ComponentBase {
    constructor(i, c, s) {
        super(i ?? { input0: 2, input2: true, num: null });
        this.r = null;
        this.node_11 = null;
        this.node_11_param_n = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_11_param_n = (this.i.num * 2);
        this.node_11 = new component_Num({ n: this.node_11_param_n }, {}, {});
        this.r = { n: { float: [...this.node_11.r.n.float] }, e: {} };
    }
    update(i, c, s) {
    }
    dispose() {
        this.node_11.dispose()
    }
}

class component_For_7 extends ComponentBase {
    constructor(i, c, s) {
        super(i ?? { array: [] });
        this.r = null;
        this.nodes_array = [];
        this.array = null;
        this.init(c, s);
    }
    init(c, s) {
        this.array = this.i.array;
        this.r = { n: { float: [] }, e: {} };
        for (const iter of this.array) {
            const node = new closure_For_7({ ...this.i, num: iter }, {}, {})
            this.nodes_array.push(node);
            this.r.n.float.push(...node.r.n.float);
        };
    }
    update(i, c, s) {
    }
    dispose() {
        for (const node of this.nodes_array) {
            node.dispose()
        }
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
    }
}

class component_Component_0 extends ComponentBase {
    constructor(i, c, s) {
        super(i ?? { input0: 2, input2: true });
        this.r = null;
        this.node_7 = null;
        this.node_13 = null;
        this.node_14 = null;
        this.node_7_param_array = null;
        this.node_13_param_n = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_7_param_array = [1, this.i.input0];
        this.node_13_param_n = 4;
        this.node_7 = new component_For_7({ array: this.node_7_param_array }, {}, {});
        this.node_13 = new component_Num({ n: this.node_13_param_n }, {}, {});
        this.node_14 = new component_Add({}, { default: { float: [...this.node_7.r.n.float, ...this.node_13.r.n.float] } }, {});
        this.r = { n: { float: [...this.node_14.r.n.float] }, e: {} };
    }
    update(i, c, s) {
    }
    dispose() {
        this.node_7.dispose()
        this.node_13.dispose()
        this.node_14.dispose()
    }
}

console.log(new component_Component_0());