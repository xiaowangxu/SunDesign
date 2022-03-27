export const TAG_THREE_Scene_0 =
{
    name: 'component_THREE_Scene', code: `class component_THREE_Scene extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        const scene = new THREE.Scene();
        c.default.object3d.forEach(o=>scene.add(o));
        scene.background = i.bg;
        this.r = {
            n: { scene: [scene] },
            e: {}
        }
    }
    update(i, c, s) {
        let $changed = false;
        const scene = this.r.n.scene[0];
        scene.clear();
        c.default.object3d.forEach(o=>scene.add(o));
        if (i.bg !== scene.background) {
            scene.background = i.bg;
            // $changed ||= true;
        }
        return $changed;
    }
    dispose() {
        // console.log("dispose component_THREE_Scene", this.r.n.vec2[0]);
    }
}`}