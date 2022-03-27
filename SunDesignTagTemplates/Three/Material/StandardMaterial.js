export const TAG_THREE_StandardMaterial_0 =
{
    name: 'component_THREE_StandardMaterial', code: `class component_THREE_StandardMaterial extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.color = null;
        this.emissive = null;
        this.roughness = null;
        this.metalness = null;
        this.flat = null;
        this.wireframe = null;
        this.b = [0];
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.color = i.color ?? new THREE.Color(0xff0000);
        this.emissive = i.emissive ??  new THREE.Color(0x000000);
        this.roughness = i.roughness ?? 0;
        this.metalness = i.metalness ?? 0;
        this.flat = i.flat ?? false;
        this.wireframe = i.wireframe ?? false;
        const mat = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: this.emissive,
            roughness: this.roughness,
            metalness: this.metalness,
            flatShading: this.flat,
            wireframe: this.wireframe,
        });
        this.r = {
            n: { standardmaterial: [mat] },
            e: {}
        }
    }
    update(i, c, s) {
        this.b[0] = 0;
        const mat = this.r.n.standardmaterial[0];
        if (this.color !== i.color) { this.color = mat.color = i.color; this.b[0] |= 1;}
        if (this.emissive !== i.emissive) { this.emissive = mat.emissive = i.emissive; this.b[0] |= 2;}
        if (this.roughness !== i.roughness) { this.roughness = mat.roughness = i.roughness; this.b[0] |= 4;}
        if (this.metalness !== i.metalness) { this.metalness = mat.metalness = i.metalness; this.b[0] |= 8;}
        if (this.flat !== i.flat) { this.flat = mat.flatShading = i.flat; this.b[0] |= 16;}
        if (this.wireframe !== i.wireframe) { this.wireframe = mat.wireframe = i.wireframe; this.b[0] |= 32;}
        if (this.b[0] & 63) {
            mat.needsUpdate = true;
        }
        return false;
    }
    dispose() {
        this.r.n.standardmaterial[0].dispose();
        this.r.n.standardmaterial = [];
        // console.log("dispose component_THREE_BoxGeometry", this.r.n.object3d[0]);
    }
}`}