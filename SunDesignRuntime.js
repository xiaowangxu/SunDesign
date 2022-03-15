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
        super(i ?? {});
        this.r = null;
        this.node_7 = null;
        this.node_9 = null;
        this.node_10 = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_7 = s.nums;
        this.node_9 = s.nums2;
        this.node_10 = new component_Add({}, { default: { float: [...this.node_7.float, ...this.node_9.float] } }, {});
        this.r = { n: { float: [...this.node_10.r.n.float] }, e: {} };
    }
    update(i, c, s) {
    }
    dispose() {
        this.node_7 = undefined;
        this.node_9 = undefined;
        this.node_10.dispose();
        console.log(`dispose component_Component_3`);
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

class closure_For_37 extends ComponentBase {
    constructor(i, c, s) {
        super(i ?? { input2: true, idx: null });
        this.r = null;
        this.node_41 = null;
        this.node_41_param_n = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_41_param_n = this.i.idx;
        this.node_41 = new component_Num({ n: this.node_41_param_n }, {}, {});
        this.r = { n: { float: [...this.node_41.r.n.float] }, e: {} };
    }
    update(i, c, s) {
    }
    dispose() {
        this.node_41.dispose();
        console.log(`dispose closure_For_37`);
    }
}

class component_For_37 extends ComponentBase {
    constructor(i, c, s) {
        super(i ?? { $array: [] });
        this.r = null;
        this.nodes_array = [];
        this.array = null;
        this.init(c, s);
    }
    init(c, s) {
        this.array = this.i.$array;
        this.r = { n: { float: [] }, e: {} };
        for (const iter of this.array) {
            const node = new closure_For_37({ ...this.i, idx: iter }, {}, {})
            this.nodes_array.push(node);
            this.r.n.float.push(...node.r.n.float);
        }
    }
    update(i, c, s) {
    }
    dispose() {
        for (const node of this.nodes_array) {
            node.dispose()
        }
    }
}

class closure_If_True_24 extends ComponentBase {
    constructor(i, c, s) {
        super(i ?? { input2: true });
        this.r = null;
        this.node_28 = null;
        this.node_30 = null;
        this.node_32 = null;
        this.node_34 = null;
        this.node_35 = null;
        this.node_37 = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_28 = new component_Num({ n: -1 }, {}, {});
        this.node_30 = new component_Num({ n: 46 }, {}, {});
        this.node_32 = new component_Num({ n: 1 }, {}, {});
        this.node_34 = new component_Num({ n: 44 }, {}, {});
        this.node_35 = new component_Component_3({}, {}, { nums: { float: [...this.node_28.r.n.float, ...this.node_30.r.n.float] }, nums2: { float: [...this.node_32.r.n.float, ...this.node_34.r.n.float] } });
        this.node_37 = new component_For_37({ ...this.i, $array: [1, 2] }, {}, {});
        this.r = { n: { float: [...this.node_35.r.n.float, ...this.node_37.r.n.float] }, e: {} };
    }
    update(i, c, s) {
    }
    dispose() {
        this.node_28.dispose();
        this.node_30.dispose();
        this.node_32.dispose();
        this.node_34.dispose();
        this.node_35.dispose();
        this.node_37.dispose();
        console.log(`dispose closure_If_True_24`);
    }
}

class component_If_24 extends ComponentBase {
    constructor(i, c, s) {
        super(i ?? { $test: false });
        this.r = null;
        this.condition = null;
        this.if_nodes = null;
        this.init(c, s);
    }
    init(c, s) {
        this.condition = this.i.$test;
        this.r = { n: { float: [] }, e: {} };
        if (this.condition) {
            const node = new closure_If_True_24({ ...this.i }, {}, {})
            this.if_nodes = node;
            this.r.n.float.push(...node.r.n.float);
        }
    }
    update(i, c, s) {
    }
    dispose() {
        if (this.if_nodes !== null) this.if_nodes.dispose();
        console.log("dispose component_If_24")
    }
}

class component_Component_0 extends ComponentBase {
    constructor(i, c, s) {
        super(i ?? { input2: true });
        this.r = null;
        this.node_15 = null;
        this.node_17 = null;
        this.node_19 = null;
        this.node_21 = null;
        this.node_22 = null;
        this.node_24 = null;
        this.node_42 = null;
        this.node_24_param_$test = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_24_param_$test = this.i.input2;
        this.node_15 = new component_Num({ n: -1 }, {}, {});
        this.node_17 = new component_Num({ n: 46 }, {}, {});
        this.node_19 = new component_Num({ n: 1 }, {}, {});
        this.node_21 = new component_Num({ n: 44 }, {}, {});
        this.node_22 = new component_Component_3({}, {}, { nums: { float: [...this.node_15.r.n.float, ...this.node_17.r.n.float] }, nums2: { float: [...this.node_19.r.n.float, ...this.node_21.r.n.float] } });
        this.node_24 = new component_If_24({ ...this.i, $test: this.node_24_param_$test }, {}, {});
        this.node_42 = new component_Add({}, { default: { float: [...this.node_22.r.n.float, ...this.node_24.r.n.float] } }, {});
        this.r = { n: { float: [...this.node_42.r.n.float] }, e: {} };
    }
    update(i, c, s) {
    }
    dispose() {
        this.node_15.dispose();
        this.node_17.dispose();
        this.node_19.dispose();
        this.node_21.dispose();
        this.node_22.dispose();
        this.node_24.dispose();
        this.node_42.dispose();
        console.log(`dispose component_Component_0`);
    }
}

let a = new component_Component_0({ input2: true });
console.log(a);
a.dispose();