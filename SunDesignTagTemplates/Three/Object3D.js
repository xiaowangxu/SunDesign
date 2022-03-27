export const TAG_THREE_Object3D_0 =
{
    name: 'component_THREE_Object3D', code: `class component_THREE_Object3D extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        const object3d = new THREE.Object3D();
        object3d.position.copy(i.pos);
        object3d.rotation.copy(i.rot);
        object3d.scale.copy(i.scale);
        this.r = {
            n: { object3d: [object3d] },
            e: {}
        }
    }
    update(i, c, s) {
        let $changed = false;
        const object3d = this.r.n.object3d[0];
        object3d.position.copy(i.pos);
        object3d.rotation.copy(i.rot);
        object3d.scale.copy(i.scale);
        return $changed;
    }
    dispose() {
        // console.log("dispose component_THREE_Object3D", this.r.n.object3d[0]);
    }
}`}