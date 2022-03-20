class ComponentBase {
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
            e: { result: ans }
        }
    }
    update(i, c, s) {
        const ans = c.default.float.reduce((f, sum) => sum += f, 0);
        if (ans !== this.r.n.float[0]) {
            this.r.n.float[0] = ans;
            this.r.e.result = ans;
            return true;
        }
        return false;
    }
    dispose() {
        console.log("dispose component_Add");
    }
}

class component_Component_4 extends ComponentBase {
    constructor(i = {}, c, s) {
        super({ a: 0, b: null, ...i }, [0]);
        this.r = null;
        this.node_11 = null;
        this.node_13 = null;
        this.node_14 = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_11 = s.nums;
        this.node_13 = s.nums2;
        this.node_14 = new component_Add({}, { default: { float: [...this.node_11.float, ...this.node_13.float] } }, {});
        this.r = { n: { float: [...this.node_14.r.n.float] }, e: { result: (this.i.a - this.i.b) } };
    }
    diff(i) {
        this.b = [0];
        if (i.a !== undefined && i.a !== this.i.a) {
            this.i.a = i.a;
            this.b[0] |= 1;
        }
        if (i.b !== undefined && i.b !== this.i.b) {
            this.i.b = i.b;
            this.b[0] |= 2;
        }
    }
    update(i, c, s) {
        this.diff(i);
        let $changed = false;
        this.node_11 = s.nums;
        this.node_13 = s.nums2;
        if (this.b[0] & 12) {
            this.b[0] |= 16 & (this.node_14.update({}, { default: { float: [...this.node_11.float, ...this.node_13.float] } }, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 3) {
            $changed ||= true;
            this.r.e.result = (this.i.a - this.i.b);
        }
        if (this.b[0] & 16) {
            $changed ||= true;
            this.r.n.float = [...this.node_14.r.n.float];
        }
        return $changed;
    }
    dispose() {
        this.node_11 = undefined;
        this.node_13 = undefined;
        this.node_14.dispose();
        console.log(`dispose component_Component_4`);
    }
    ref(id) {
        switch (id) {
        }
    }
}

class component_Num extends ComponentBase {
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
        console.log("dispose component_Num", this.i.n);
    }
}

class component_Component_0 extends ComponentBase {
    constructor(i = {}, c, s) {
        super({ number1: 5, number2: 2, ...i }, [0]);
        this.r = null;
        this.node_18 = null;
        this.node_20 = null;
        this.node_22 = null;
        this.node_24 = null;
        this.node_25 = null;
        this.node_26 = null;
        this.node_18_param_n = null;
        this.node_22_param_n = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_18_param_n = this.i.number1;
        this.node_18 = new component_Num({ n: this.node_18_param_n }, {}, {});
        this.node_20 = new component_Num({ n: 0 }, {}, {});
        this.node_22_param_n = this.i.number2;
        this.node_22 = new component_Num({ n: this.node_22_param_n }, {}, {});
        this.node_24 = new component_Num({ n: 0 }, {}, {});
        this.node_25 = new component_Component_4({ a: 0, b: 0 }, {}, { nums: { float: [...this.node_18.r.n.float, ...this.node_20.r.n.float] }, nums2: { float: [...this.node_22.r.n.float, ...this.node_24.r.n.float] } });
        this.node_26 = new component_Add({}, { default: { float: [...this.node_25.r.n.float] } }, {});
        this.r = { n: { float: [...this.node_26.r.n.float] }, e: { input0: (this.ref('add').r.e.result - 1) } };
    }
    diff(i) {
        this.b = [0];
        if (i.number1 !== undefined && i.number1 !== this.i.number1) {
            this.i.number1 = i.number1;
            this.b[0] |= 1;
        }
        if (i.number2 !== undefined && i.number2 !== this.i.number2) {
            this.i.number2 = i.number2;
            this.b[0] |= 2;
        }
    }
    update(i, c, s) {
        this.diff(i);
        let $changed = false;
        if (this.b[0] & 1) {
            this.node_18_param_n = this.i.number1;
            this.b[0] |= 8;
        }
        if (this.b[0] & 8) {
            this.b[0] |= 4 & (this.node_18.update({ n: this.node_18_param_n }, {}, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 2) {
            this.node_22_param_n = this.i.number2;
            this.b[0] |= 64;
        }
        if (this.b[0] & 64) {
            this.b[0] |= 32 & (this.node_22.update({ n: this.node_22_param_n }, {}, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 180) {
            this.b[0] |= 256 & (this.node_25.update({ a: 0, b: 0 }, {}, { nums: { float: [...this.node_18.r.n.float, ...this.node_20.r.n.float] }, nums2: { float: [...this.node_22.r.n.float, ...this.node_24.r.n.float] } }) ? 2147483647 : 0);
        }
        if (this.b[0] & 256) {
            this.b[0] |= 512 & (this.node_26.update({}, { default: { float: [...this.node_25.r.n.float] } }, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 512) {
            $changed ||= true;
            this.r.e.input0 = (this.ref('add').r.e.result - 1);
        }
        if (this.b[0] & 512) {
            $changed ||= true;
            this.r.n.float = [...this.node_26.r.n.float];
        }
        return $changed;
    }
    dispose() {
        this.node_18.dispose();
        this.node_20.dispose();
        this.node_22.dispose();
        this.node_24.dispose();
        this.node_25.dispose();
        this.node_26.dispose();
        console.log(`dispose component_Component_0`);
    }
    ref(id) {
        switch (id) {
            case 'add': return this.node_26;
        }
    }
}