export const TAG_THREE_BoxGeometry_0 =
{
    name: 'component_THREE_BoxGeometry', code: `class component_THREE_BoxGeometry extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.w = null;
        this.h = null;
        this.d = null;
        this.ws = null;
        this.hs = null;
        this.ds = null;
        this.b = [0];
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.w = i.w ?? 1;
        this.h = i.h ?? 1;
        this.d = i.d ?? 1;
        this.ws = i.ws ?? 1;
        this.hs = i.hs ?? 1;
        this.ds = i.ds ?? 1;
        const geo = new THREE.BoxGeometry(this.w,this.h,this.d,this.ws,this.hs,this.ds);
        this.r = {
            n: { boxgeometry: [geo] },
            e: {}
        }
    }
    update(i, c, s) {
        this.b[0] = 0;
        const geo = this.r.n.boxgeometry[0];
        if (this.w !== i.w) { this.w = i.w; this.b[0] |= 1;}
        if (this.h !== i.h) { this.h = i.h; this.b[0] |= 2;}
        if (this.d !== i.d) { this.d = i.d; this.b[0] |= 4;}
        if (this.ws !== i.ws) { this.ws = i.ws; this.b[0] |= 8;}
        if (this.hs !== i.hs) { this.hs = i.hs; this.b[0] |= 16;}
        if (this.ds !== i.ds) { this.ds = i.ds; this.b[0] |= 32;}
        if (this.b[0] & 63) {
            geo.dispose();
            this.r.n.boxgeometry[0] = new THREE.BoxGeometry(this.w,this.h,this.d,this.ws,this.hs,this.ds);
            return true;
        }
        return false;
    }
    dispose() {
        this.r.n.boxgeometry[0].dispose();
        this.r.n.boxgeometry = [];
        // console.log("dispose component_THREE_BoxGeometry", this.r.n.object3d[0]);
    }
}`}