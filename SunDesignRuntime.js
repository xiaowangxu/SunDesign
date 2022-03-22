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

class closure_For_9 extends ComponentBase {
    constructor(i = {}, c, s) {
        super({ num: null, ...i }, [0]);
        this.r = null;
        this.node_13 = null;
        this.node_13_param_n = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_13_param_n = this.i.num;
        this.node_13 = new component_Num({ n: this.node_13_param_n }, {}, {});
        this.r = { n: { float: [...this.node_13.r.n.float] }, e: {} };
    }
    diff(i) {
        this.b = [0];
        if (i.num !== undefined && i.num !== this.i.num) {
            this.i.num = i.num;
            this.b[0] |= 1;
        }
    }
    update(i, c, s) {
        this.diff(i);
        let $changed = false;
        if (this.b[0] & 1) {
            this.node_13_param_n = this.i.num;
            this.b[0] |= 4;
        }
        if (this.b[0] & 4) {
            this.b[0] |= 2 & (this.node_13.update({ n: this.node_13_param_n }, {}, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 2) {
            $changed ||= true;
            this.r.n.float = [...this.node_13.r.n.float];
        }
        return $changed;
    }
    dispose() {
        this.node_13.dispose();
    }
    ref(id) {
        switch (id) {
        }
    }
}

class component_For_9 extends ComponentBase {
    constructor(i = {}, c, s) {
        super({ $array: [], ...i }, [0]);
        this.r = null;
        this.nodes_array = [];
        this.array = null;
        this.init(c, s);
    }
    init(c, s) {
        this.array = this.i.$array;
        this.r = { n: { float: [] }, e: {} };
        for (const iter of this.array) {
            const node = new closure_For_9({ num: iter }, {}, {});
            this.nodes_array.push(node);
            this.r.n.float.push(...node.r.n.float);
        }
    }
    diff(i) {
        if (this.i.$array.length !== i.$array.length) {
            this.array = i.$array;
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
            this.r.n.float = [];
            let $idx = 0;
            while ($idx < $len) {
                const iter = this.array[$idx];
                const node = this.nodes_array[$idx];
                if (node === undefined) {
                    $changed = true;
                    const _node = new closure_For_9({ num: iter }, {}, {});
                    this.nodes_array.push(_node);
                    this.r.n.float.push(..._node.r.n.float);
                }
                else {
                    $changed ||= node.update({ num: iter }, {}, {});
                    this.r.n.float.push(...node.r.n.float);
                }
                $idx++;
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

class component_Component_0 extends ComponentBase {
    constructor(i = {}, c, s) {
        super({ number1: 5, test: true, ...i }, [0]);
        this.r = null;
        this.node_7 = null;
        this.node_9 = null;
        this.node_14 = null;
        this.node_7_param_n = null;
        this.node_9_param_$array = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_7_param_n = this.i.number1;
        this.node_7 = new component_Num({ n: this.node_7_param_n }, {}, {});
        this.node_9_param_$array = (this.i.test ? [1, 2, 3] : [1]);
        this.node_9 = new component_For_9({ $array: this.node_9_param_$array }, {}, {});
        this.node_14 = new component_Add({}, { default: { float: [...this.node_7.r.n.float, ...this.node_9.r.n.float] } }, {});
        this.r = { n: { float: [...this.node_14.r.n.float] }, e: { input0: (this.ref('add').r.e.result - 1) } };
    }
    diff(i) {
        this.b = [0];
        if (i.number1 !== undefined && i.number1 !== this.i.number1) {
            this.i.number1 = i.number1;
            this.b[0] |= 1;
        }
        if (i.test !== undefined && i.test !== this.i.test) {
            this.i.test = i.test;
            this.b[0] |= 2;
        }
    }
    update(i, c, s) {
        this.diff(i);
        let $changed = false;
        if (this.b[0] & 1) {
            this.node_7_param_n = this.i.number1;
            this.b[0] |= 8;
        }
        if (this.b[0] & 8) {
            this.b[0] |= 4 & (this.node_7.update({ n: this.node_7_param_n }, {}, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 2) {
            this.node_9_param_$array = (this.i.test ? [1, 2, 3] : [1]);
            this.b[0] |= 32;
        }
        if (this.b[0] & 32) {
            this.b[0] |= 16 & (this.node_9.update({ $array: this.node_9_param_$array }, {}, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 20) {
            this.b[0] |= 64 & (this.node_14.update({}, { default: { float: [...this.node_7.r.n.float, ...this.node_9.r.n.float] } }, {}) ? 2147483647 : 0);
        }
        if (this.b[0] & 64) {
            $changed ||= true;
            this.r.e.input0 = (this.ref('add').r.e.result - 1);
        }
        if (this.b[0] & 64) {
            $changed ||= true;
            this.r.n.float = [...this.node_14.r.n.float];
        }
        return $changed;
    }
    dispose() {
        this.node_7.dispose();
        this.node_9.dispose();
        this.node_14.dispose();
    }
    ref(id) {
        switch (id) {
            case 'add': return this.node_14;
        }
    }
}