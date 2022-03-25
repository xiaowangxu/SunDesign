export const TAG_CacheBase = (type) => {
    return {
        name: `component_CacheBase_${type}`, code: `class component_CacheBase_${type} extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.r = {
            n: {},
            e: {result: c.default.${type}[0]}
        }
    }
    update(i, c, s) {
        this.r.e.result = c.default.${type}[0];
        return true;
    }
    dispose() {
        // console.log("dispose component_CacheBase_${type}");
    }
}`}
}