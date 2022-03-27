export const TAG_THREE_Mesh_0 =
{
    name: 'component_THREE_Mesh', code: `class component_THREE_Mesh extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        const mesh = new THREE.Mesh(c.default.geometry[0], c.default.material[0]);
        mesh.position.copy(i.pos);
        mesh.rotation.copy(i.rot);
        mesh.scale.copy(i.scale);
        this.r = {
            n: { mesh: [mesh] },
            e: {}
        }
    }
    update(i, c, s) {
        let $changed = false;
        const mesh = this.r.n.mesh[0];
        mesh.position.copy(i.pos);
        mesh.rotation.copy(i.rot);
        mesh.scale.copy(i.scale);
        if (mesh.geometry !== c.default.geometry[0])
            mesh.geometry = c.default.geometry[0];
        if (mesh.material !== c.default.material[0]) {
            mesh.material = c.default.material[0];
        }
        return $changed;
    }
    dispose() {
        // console.log("dispose component_THREE_Mesh");
    }
}`}