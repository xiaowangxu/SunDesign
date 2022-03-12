// const NOOP = Symbol("noop");

// class ComponentBase {
//     constructor(inputs, slots) {
//         this.inputs = inputs;
//         this.bitmasks = [0];
//         this.result;
//     }

//     init() {

//     }

//     update(inputs, children, slots) {
//         //1. make dirty
//         //2. topo update
//     }

//     dispose() {

//     }
// }

// class component_Num extends ComponentBase {
//     constructor(inputs, children, slots) {
//         super({ number: 0 });
//         this.result = null;
//         this.init();
//     }

//     init(children) {
//         this.result = {
//             nodes: { int: [this.inputs.number] },
//             exports: {}
//         }
//     }

//     update(inputs, children, slots) {
//         const last_inputs = this.inputs;
//         this.inputs = inputs;
//         if (inputs.number !== last_inputs.number) {
//             this.result.nodes.int[0] = inputs.number;
//             // console.log(">>>> update", this)
//         }
//     }

//     dispose() {
//         console.log("dispose number", this.result.nodes.int);
//     }
// }

// class component_Num2 extends ComponentBase {
//     constructor(inputs, children, slots) {
//         super({ num1: 0, num2: 0 });
//         this.result = null;
//         this.init();
//     }

//     init(children) {
//         this.result = {
//             nodes: { int: [this.inputs.num1, this.inputs.num2] },
//             exports: {}
//         }
//     }

//     update(inputs, children, slots) {
//         const last_inputs = this.inputs;
//         this.inputs = inputs;
//         if (inputs.num1 !== last_inputs.num1) {
//             this.result.nodes.int[0] = inputs.num1;
//             // console.log(">>>> update num1")
//         }
//         if (inputs.num2 !== last_inputs.num2) {
//             this.result.nodes.int[1] = inputs.num2;
//             // console.log(">>>> update num2")
//         }
//     }

//     dispose() {
//         console.log("dispose number2", this.result.nodes.int);
//     }
// }

// class component_Add extends ComponentBase {
//     constructor(inputs, children, slots) {
//         super({ num1: 0, num2: 0 });
//         this.result = null;
//         this.init(children, slots);
//     }

//     init(children, slots) {
//         this.result = {
//             nodes: { int: [children.default.int[0] + children.default.int[1]] },
//             exports: {}
//         }
//     }

//     update(inputs, children, slots) {
//         const last_inputs = this.inputs;
//         this.inputs = inputs;
//         this.result.nodes.int[0] = children.default.int[0] + children.default.int[1];
//         console.log(this.result.nodes.int);
//     }

//     dispose() {
//         console.log("dispose add", this.result.nodes.int);
//     }
// }

// class component_Add_Paramed extends ComponentBase {
//     constructor(inputs, children, slots) {
//         super({ num1: 0, num2: 0 });
//         this.result = null;
//         this.init(children, slots);
//     }

//     init(children, slots) {
//         this.result = {
//             nodes: { int: [children.a.int[0] + children.b.int[0]] },
//             exports: {}
//         }
//     }

//     update(inputs, children, slots) {
//         const last_inputs = this.inputs;
//         this.inputs = inputs;
//         this.result.nodes.int[0] = children.a.int[0] + children.b.int[0];
//         console.log(this.result.nodes.int);
//     }

//     dispose() {
//         console.log("dispose add", this.result.nodes.int);
//     }
// }

// class component_A extends ComponentBase {
//     constructor() {
//         super({ num1: 0, num2: 1 });
//         this.node_1 = null;
//         this.node_2 = null;
//         this.node_3 = null;
//         this.init();
//     }

//     init() {
//         this.node_1 = new component_Num({ number: this.inputs.num1 });
//         this.node_2 = new component_Num({ number: this.inputs.num2 });
//         this.node_3 = new component_Add({}, { default: { int: [...this.node_1.result.nodes.int, ...this.node_2.result.nodes.int] } });
//     }

//     update(inputs, children, slots) {
//         const last_inputs = this.inputs;
//         this.inputs = inputs;
//         if (inputs.num1 !== last_inputs.num1) {
//             // this.node_1?.dispose();
//             this.node_1.update({ number: this.inputs.num1 });
//         }
//         if (inputs.num2 !== last_inputs.num2) {
//             // this.node_2?.dispose();
//             this.node_2.update({ number: this.inputs.num2 });
//             // this.node_2 = create_NumberNode({ number: this.inputs.num2 });
//         }
//         if (inputs.num1 !== last_inputs.num1 || inputs.num2 !== last_inputs.num2) {
//             // this.node_3?.dispose();
//             this.node_3.update(null, { default: { int: [...this.node_1.result.nodes.int, ...this.node_2.result.nodes.int] } });
//             // this.node_3 = create_AddNode({}, { int: [...this.node_1.nodes.int, ...this.node_2.nodes.int] });
//         }
//     }

// }

// class component_A2 extends ComponentBase {
//     constructor() {
//         super({ num1: 0, num2: 1 });
//         this.node_1 = null;
//         this.node_2 = null;
//         this.init();
//     }

//     init() {
//         this.node_1 = new component_Num2({ num1: this.inputs.num1, num2: this.inputs.num2 });
//         this.node_2 = new component_Add({}, { default: { int: [...this.node_1.result.nodes.int] } });
//     }

//     update(inputs, children, slots) {
//         const last_inputs = this.inputs;
//         this.inputs = inputs;
//         if (inputs.num1 !== last_inputs.num1 || inputs.num2 !== last_inputs.num2) {
//             // this.node_1?.dispose();
//             this.node_1.update({ num1: this.inputs.num1, num2: this.inputs.num2 });
//         }
//         if (inputs.num1 !== last_inputs.num1 || inputs.num2 !== last_inputs.num2) {
//             // this.node_3?.dispose();
//             this.node_2.update(null, { default: { int: [...this.node_1.result.nodes.int] } });
//             // this.node_3 = create_AddNode({}, { int: [...this.node_1.nodes.int, ...this.node_2.nodes.int] });
//         }
//     }

// }

// class component_$A3 extends ComponentBase {
//     constructor(children, slots) {
//         super({ num1: 0, num2: 1 });
//         this.init(children, slots);
//     }

//     init(children, slots) {
//         this.node_2 = new component_Add({}, { default: { int: [...slots.slot1.int] } });
//     }

//     update(inputs, children, slots) {
//         const last_inputs = this.inputs;
//         this.inputs = inputs;
//         // this.node_3?.dispose();
//         this.node_2.update(null, { default: { int: [...slots.slot1.int] } });
//         // this.node_3 = create_AddNode({}, { int: [...this.node_1.nodes.int, ...this.node_2.nodes.int] });
//     }
// }

// class component_A3 extends ComponentBase {
//     constructor() {
//         super({ num1: 0, num2: 1 });
//         this.node_1 = null;
//         this.node_2 = null;
//         this.node_3 = null;
//         this.init();
//     }

//     init() {
//         this.node_1 = new component_Num({ number: this.inputs.num1 });
//         this.node_2 = new component_Num({ number: this.inputs.num2 });
//         this.node_3 = new component_$A3({}, { slot1: { int: [...this.node_1.result.nodes.int, ...this.node_2.result.nodes.int] } });
//     }

//     update(inputs, children, slots) {
//         const last_inputs = this.inputs;
//         this.inputs = inputs;
//         let $$_slot1_changed = false;
//         if (inputs.num1 !== last_inputs.num1) {
//             // this.node_1?.dispose();
//             this.node_1.update({ number: this.inputs.num1 });
//             $$_slot1_changed |= true;
//         }
//         if (inputs.num2 !== last_inputs.num2) {
//             // this.node_2?.dispose();
//             this.node_2.update({ number: this.inputs.num2 });
//             // this.node_2 = create_NumberNode({ number: this.inputs.num2 });
//             $$_slot1_changed |= true;
//         }
//         if ($$_slot1_changed) {
//             // this.node_3?.dispose();
//             this.node_3.update(null, {}, { slot1: { int: [...this.node_1.result.nodes.int, ...this.node_2.result.nodes.int] } });
//             // this.node_3 = create_AddNode({}, { int: [...this.node_1.nodes.int, ...this.node_2.nodes.int] });
//         }
//     }
// }

// class component_A4 extends ComponentBase {
//     constructor() {
//         super({ num1: 0, num2: 1 });
//         this.node_1 = null;
//         this.node_2 = null;
//         this.node_3 = null;
//         this.init();
//     }

//     init() {
//         this.node_1 = new component_Num({ number: this.inputs.num1 });
//         this.node_2 = new component_Num({ number: this.inputs.num2 });
//         this.node_3 = new component_Add_Paramed({}, { a: { int: [...this.node_1.result.nodes.int] }, b: { int: [...this.node_2.result.nodes.int] } });
//     }

//     update(inputs, children, slots) {
//         const last_inputs = this.inputs;
//         this.inputs = inputs;
//         if (inputs.num1 !== last_inputs.num1) {
//             // this.node_1?.dispose();
//             this.node_1.update({ number: this.inputs.num1 });
//         }
//         if (inputs.num2 !== last_inputs.num2) {
//             // this.node_2?.dispose();
//             this.node_2.update({ number: this.inputs.num2 });
//             // this.node_2 = create_NumberNode({ number: this.inputs.num2 });
//         }
//         if (inputs.num1 !== last_inputs.num1 || inputs.num2 !== last_inputs.num2) {
//             // this.node_3?.dispose();
//             this.node_3.update(null, { a: { int: [...this.node_1.result.nodes.int] }, b: { int: [...this.node_2.result.nodes.int] } });
//             // this.node_3 = create_AddNode({}, { int: [...this.node_1.nodes.int, ...this.node_2.nodes.int] });
//         }
//     }
// }

// // console.log(">>> SD Runtime");
// // const a = new component_A();
// // const a2 = new component_A2();
// // const a3 = new component_A3();
// // const a4 = new component_A4();
// // console.log(
// //     `<add>
// //     <num number="num1">
// //     <num number="num2">
// // </add>`)
// // // console.time("update");
// // a.update({ num1: 2, num2: 3 });
// // // console.timeEnd("update");
// // a.update({ num1: 3, num2: 3 });
// // a.update({ num1: 3, num2: 4 });
// // a.update({ num1: 3, num2: 4 });
// // console.log(
// //     `<add>
// //     <num2 num1="num1" num2="num2">
// // </add>`)
// // // console.time("update");
// // a2.update({ num1: 2, num2: 3 });
// // // console.timeEnd("update");
// // a2.update({ num1: 3, num2: 3 });
// // a2.update({ num1: 3, num2: 4 });
// // a2.update({ num1: 3, num2: 4 });
// // console.log(
// //     `<A3>
// //     <slot1>
// //         <num number="num1">
// //         <num number="num2">
// //     </slot1>
// // </A3>
// // <A3 template>
// //     <add>
// //         <slot1/>
// //     </add>
// // </A3 template>`)
// // // console.time("update");
// // a3.update({ num1: 2, num2: 3 });
// // // console.timeEnd("update");
// // a3.update({ num1: 3, num2: 3 });
// // a3.update({ num1: 3, num2: 4 });
// // a3.update({ num1: 3, num2: 4 });
// // console.log(
// //     `<add>
// //     <a param>
// //         <num number="num1">
// //     </a>
// //     <b param>
// //         <num number="num2">
// //     </b>
// // </add>`)
// // // console.time("update");
// // a4.update({ num1: 2, num2: 3 });
// // // console.timeEnd("update");
// // a4.update({ num1: 3, num2: 3 });
// // a4.update({ num1: 3, num2: 4 });
// // a4.update({ num1: 3, num2: 4 });
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
        super(i ?? { input0: 1 });
        this.result = null;
        this.node_7 = null;
        this.node_9 = null;
        this.node_11 = null;
        this.node_13 = null;
        this.node_14 = null;
        this.node_16 = null;
        this.node_17 = null;
        this.node_7_param_n = null;
        this.node_9_param_n = null;
        this.node_11_param_n = null;
        this.node_13_param_n = null;
        this.node_16_param_n = null;
        this.init(c, s);
    }
    init(c, s) {
        this.node_7_param_n = this.i.input0;
        this.node_9_param_n = (this.i.input0 + 1);
        this.node_11_param_n = (this.i.input0 + 2);
        this.node_13_param_n = (this.i.input0 + 3);
        this.node_16_param_n = 100;
        this.node_7 = new component_Num({ n: this.node_7_param_n }, {}, {});
        this.node_9 = new component_Num({ n: this.node_9_param_n }, {}, {});
        this.node_11 = new component_Num({ n: this.node_11_param_n }, {}, {});
        this.node_13 = new component_Num({ n: this.node_13_param_n }, {}, {});
        this.node_14 = new component_Add({}, { default: { float: [...this.node_7.r.n.float, ...this.node_9.r.n.float, ...this.node_11.r.n.float, ...this.node_13.r.n.float] } }, {});
        this.node_16 = new component_Num({ n: this.node_16_param_n }, {}, {});
        this.node_17 = new component_Add({}, { default: { float: [...this.node_14.r.n.float, ...this.node_16.r.n.float] } }, {});
        this.r = { n: { float: [...this.node_17.r.n.float] }, e: {} };
    }
    update(i, c, s) {
    }
    dispose() {

    }
}

const a = new component_Component_0();
console.log(a);