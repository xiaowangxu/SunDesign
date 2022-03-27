export const TAG_THREE_Vec2_0 =
{
    name: 'component_THREE_Vec2', code: `class component_THREE_Vec2 extends ComponentBase {
    constructor(i, c, s) {
        super();
        this.init(i, c, s);
    }
    init(i, c, s) {
        this.r = {
            n: { vec2: [new THREE.Vector2(i.x, i.y)] },
            e: {}
        }
    }
    update(i, c, s) {
        let $changed = false;
        if (i.x !== this.r.n.vec2[0].x) {
            this.r.n.vec2[0].x = i.x;
            $changed ||= true;
        }
        if (i.y !== this.r.n.vec2[0].y) {
            this.r.n.vec2[0].y = i.y;
            $changed ||= true;
        }
        return $changed;
    }
    dispose() {
        // console.log("dispose component_THREE_Vec2", this.r.n.vec2[0]);
    }
}`}