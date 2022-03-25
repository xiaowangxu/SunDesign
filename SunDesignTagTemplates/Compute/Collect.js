export const TAG_CollectBase = (type) => {
    return {
        name: `component_CollectBase_${type}`, code: `class component_CollectBase_${type} extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.r = {
            n: {},
            e: {result: [...c.default.${type}]}
        }
    }
    update(i, c, s) {
        this.r.e.result = [...c.default.${type}];
        return true;
    }
    dispose() {
        // console.log("dispose component_CollectBase_${type}");
    }
}`}
}