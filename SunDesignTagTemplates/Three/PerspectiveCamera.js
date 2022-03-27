export const TAG_THREE_PerspectiveCamera_0 =
{
    name: 'component_THREE_PerspectiveCamera', code: `class component_THREE_PerspectiveCamera extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
        this.b = [0];
    }
    init(i, c, s) {
        const perspectivecamera = new THREE.PerspectiveCamera(i.fov, 1, i.near, i.far);
        perspectivecamera.position.copy(i.pos);
        perspectivecamera.rotation.copy(i.rot);
        perspectivecamera.scale.copy(i.scale);
        this.r = {
            n: { perspectivecamera: [perspectivecamera] },
            e: {}
        }
    }
    update(i, c, s) {
        this.b[0] = 0;
        let $changed = false;
        const perspectivecamera = this.r.n.perspectivecamera[0];
        perspectivecamera.position.copy(i.pos);
        perspectivecamera.rotation.copy(i.rot);
        perspectivecamera.scale.copy(i.scale);
        if (i.fov !== perspectivecamera.fov) {
            perspectivecamera.fov = i.fov;
            this.b[0] |= 1;
            // $changed ||= true;
        }
        if (i.near !== perspectivecamera.near) {
            perspectivecamera.near = i.near;
            this.b[0] |= 2;
            // $changed ||= true;
        }
        if (i.far !== perspectivecamera.far) {
            perspectivecamera.far = i.far;
            this.b[0] |= 4;
            // $changed ||= true;
        }
        if (this.b[0] & 7) {
            perspectivecamera.updateProjectionMatrix();
        }
        return $changed;
    }
    dispose() {
        // console.log("dispose component_THREE_Object3D", this.r.n.object3d[0]);
    }
}`}