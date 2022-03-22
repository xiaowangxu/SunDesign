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

class component_Component_5 extends ComponentBase {
    constructor(i = {}, c, s) {
        super({ ...i }, [0]);
        this.r = null;
        this.node_9 = null;
        this.node_10 = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_9 = s.default;
        this.node_10 = new component_Add({}, { default: { float: [...this.node_9.float] } }, {});
        this.r = { n: { float: [...this.node_10.r.n.float] }, e: {} };
    }
    diff(i) {
        this.b = [0];
    }
    update(i, c, s) {
        this.diff(i);
        let $changed = false;
        this.b[0] |= 1;
        this.node_9 = s.default;
        if (this.b[0] & 1) {
            this.b[0] |= 2 & (this.node_10.update({}, { default: { float: [...this.node_9.float] } }, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 2) {
            $changed ||= true;
            this.r.n.float = [...this.node_10.r.n.float];
        }
        return $changed;
    }
    dispose() {
        this.node_9 = undefined;
        this.node_10.dispose();
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
        // console.log("dispose component_Num");
    }
}

class closure_For_13 extends ComponentBase {
    constructor(i = {}, c, s) {
        super({ num: null, number2: 2, ...i }, [0]);
        this.r = null;
        this.node_17 = null;
        this.node_17_param_n = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_17_param_n = (this.i.num * this.i.number2);
        this.node_17 = new component_Num({ n: this.node_17_param_n }, {}, {});
        this.r = { n: { float: [...this.node_17.r.n.float] }, e: {} };
    }
    diff(i) {
        this.b = [0];
        if (i.num !== undefined && i.num !== this.i.num) {
            this.i.num = i.num;
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
        if (this.b[0] & 3) {
            this.node_17_param_n = (this.i.num * this.i.number2);
            this.b[0] |= 8;
        }
        if (this.b[0] & 8) {
            this.b[0] |= 4 & (this.node_17.update({ n: this.node_17_param_n }, {}, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 4) {
            $changed ||= true;
            this.r.n.float = [...this.node_17.r.n.float];
        }
        return $changed;
    }
    dispose() {
        this.node_17.dispose();
    }
    ref(id) {
        switch (id) {
        }
    }
}

class component_For_13 extends ComponentBase {
    constructor(i = {}, c, s) {
        super({ $array: [], number2: 2, ...i }, []);
        this.r = null;
        this.nodes_array = [];
        this.array = null;
        this.init(c, s);
    }
    init(c, s) {
        this.array = this.i.$array;
        this.r = { n: { float: [] }, e: {} };
        for (const iter of this.array) {
            const node = new closure_For_13({ ...this.i, num: iter }, {}, {});
            this.nodes_array.push(node);
            this.r.n.float.push(...node.r.n.float);
        }
    }
    diff(i) {
        if (this.i.$array !== i.$array) {
            this.b[0] |= 1;
        }
    }
    update(i, c, s) {
        this.diff(i);
        if (this.b[0] & 1) {
            this.array = this.i.$array;
            const $len = this.array.length;
            this.nodes_array.splice($len, Infinity).forEach(n => n.dispose());
            let $changed = false;
            this.r.float = [];
            let $idx = 0;
            while ($idx < $len) {
                const iter = this.array[$idx];
                const node = this.array[$idx];

                if (node === undefined) {
                    $changed = true;
                    const _node = new closure_For_13({ ...this.i, num: iter }, {}, {});
                    this.nodes_array.push(_node);
                    this.r.n.float.push(...node.r.n.float);
                }
                else {
                    $changed ||= this.nodes_array.update({ ...this.i, num: iter }, {}, {});
                    this.r.n.float.push(...node.r.n.float);
                }
                $idx++;
            }
            return $changed;
        }
        if (this.b[0] & 2) {
            let $changed = false;
            this.r.float = [];
            for (const node of this.nodes_array) {
                $changed ||= node.update({ ...this.i, num: iter }, {}, {});
                this.r.n.float.push(...node.r.n.float);
            }
            return $changed;
        }
    }
    dispose() {
        for (const node of this.nodes_array) {
            node.dispose();
        }
        this.nodes_array = [];
    }
    ref(id) {
        switch (id) {
        }
    }
}

class component_Component_0 extends ComponentBase {
    constructor(i = {}, c, s) {
        super({ number2: 2, ...i }, [0]);
        this.r = null;
        this.node_13 = null;
        this.node_18 = null;
        this.node_21 = null;
        this.node_23 = null;
        this.node_24 = null;
        this.node_21_param_n = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_13 = new component_For_13({ number2: this.i.number2, $array: [1, 2, 3] }, {}, {});
        this.node_18 = new component_Add({}, { default: { float: [...this.node_13.r.n.float] } }, {});
        this.node_21_param_n = (100 * this.i.number2);
        this.node_21 = new component_Num({ n: this.node_21_param_n }, {}, {});
        this.node_23 = new component_Num({ n: 200 }, {}, {});
        this.node_24 = new component_Component_5({}, {}, { default: { float: [...this.node_21.r.n.float, ...this.node_23.r.n.float] } });
        this.r = { n: { float: [...this.node_18.r.n.float, ...this.node_24.r.n.float] }, e: { input0: (this.ref('add').r.e.result - 1) } };
    }
    diff(i) {
        this.b = [0];
        if (i.number2 !== undefined && i.number2 !== this.i.number2) {
            this.i.number2 = i.number2;
            this.b[0] |= 1;
        }
    }
    update(i, c, s) {
        this.diff(i);
        let $changed = false;
        if (this.b[0] & 1) {
            this.b[0] |= 2 & (this.node_13.update({ number2: this.i.number2, $array: [1, 2, 3] }, {}, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 2) {
            this.b[0] |= 4 & (this.node_18.update({}, { default: { float: [...this.node_13.r.n.float] } }, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 1) {
            this.node_21_param_n = (100 * this.i.number2);
            this.b[0] |= 16;
        }
        if (this.b[0] & 16) {
            this.b[0] |= 8 & (this.node_21.update({ n: this.node_21_param_n }, {}, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 40) {
            this.b[0] |= 64 & (this.node_24.update({}, {}, { default: { float: [...this.node_21.r.n.float, ...this.node_23.r.n.float] } }) ? 2147483647 : 0);
        }
        if (this.b[0] & 4) {
            $changed ||= true;
            this.r.e.input0 = (this.ref('add').r.e.result - 1);
        }
        if (this.b[0] & 68) {
            $changed ||= true;
            this.r.n.float = [...this.node_18.r.n.float, ...this.node_24.r.n.float];
        }
        return $changed;
    }
    dispose() {
        this.node_13.dispose();
        this.node_18.dispose();
        this.node_21.dispose();
        this.node_23.dispose();
        this.node_24.dispose();
    }
    ref(id) {
        switch (id) {
            case 'add': return this.node_18;
        }
    }
}