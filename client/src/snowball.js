import {Body} from './body.js';
import {defs, tiny} from '../examples/common.js';
import {Test_Data} from './materials.js'

// Why do I have to redeclare this when I already imported body.js??
// Pull these names into this module's scope for convenience:
const {vec3, unsafe3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

export class Snowball extends Body {
    #collidedWithTarget;

    // **Body** can store and update the properties of a 3D body that incrementally
    // moves from its previous place due to velocities.  It conforms to the
    // approach outlined in the "Fix Your Timestep!" blog post by Glenn Fiedler.
    constructor(shape, material, size, throwerID) {
        super(shape, material, size)

        this.throwerID = throwerID; //Identifies the player that threw the snowball
        this.#collidedWithTarget = false;
        this.test_data = new Test_Data();

        Object.assign(this,
            {shape, material, size})

    }

    timeSinceCollision(){
        if(this.#collidedWithTarget) {
            return this.material.localTime;
        }

        else
            return 0.0;
    }

    hasCollided() {
        return this.#collidedWithTarget;
    }
    indicateCollision()//Call this when a snowball hits a target, to indicate it should explode
    {
        this.#collidedWithTarget = true;

        //TODO: change to shape to flat-shaded sphere and material to the explosion material
        this.shape = this.test_data.shapes.snowball_flatshaded;
        this.material = this.test_data.materials.snowballExplosionMtl.override({localTime: 0.0});
    }
    getThrower()
    {
        return this.throwerID;
    }

    // (within some margin of distance).
    static intersect_cube(p, margin = 0) {
        return p.every(value => value >= -1 - margin && value <= 1 + margin)
    }

    static intersect_sphere(p, margin = 0) {
        return p.dot(p) < 1 + margin;
    }

    slow_snowball()
    {
        this.linear_velocity = this.linear_velocity.times(0.0);
    }
    emplace(location_matrix, linear_velocity, angular_velocity, spin_axis = vec3(0, 0, 0).randomized(1).normalized()) {                               // emplace(): assign the body's initial values, or overwrite them.
        this.center = location_matrix.times(vec4(0, 0, 0, 1)).to3();
        this.rotation = Mat4.translation(...this.center.times(-1)).times(location_matrix);
        this.previous = {center: this.center.copy(), rotation: this.rotation.copy()};
        // drawn_location gets replaced with an interpolated quantity:
        this.drawn_location = location_matrix;
        this.temp_matrix = Mat4.identity();
        return Object.assign(this, {linear_velocity, angular_velocity, spin_axis})
    }

    advance(time_amount) {
        // advance(): Perform an integration (the simplistic Forward Euler method) to
        // advance all the linear and angular velocities one time-step forward.
        this.previous = {center: this.center.copy(), rotation: this.rotation.copy()};
        // Apply the velocities scaled proportionally to real time (time_amount):
        // Linear velocity first, then angular:
        this.center = this.center.plus(this.linear_velocity.times(time_amount));
        this.rotation.pre_multiply(Mat4.rotation(time_amount * this.angular_velocity, ...this.spin_axis));

        // this.material.localTime += time_amount;
    }

    // The following are our various functions for testing a single point,
    // p, against some analytically-known geometric volume formula

    blend_rotation(alpha) {
        // blend_rotation(): Just naively do a linear blend of the rotations, which looks
        // ok sometimes but otherwise produces shear matrices, a wrong result.

        // TODO:  Replace this function with proper quaternion blending, and perhaps
        // store this.rotation in quaternion form instead for compactness.
        return this.rotation.map((x, i) => vec4(...this.previous.rotation[i]).mix(x, alpha));
    }

    blend_state(alpha) {
        // blend_state(): Compute the final matrix we'll draw using the previous two physical
        // locations the object occupied.  We'll interpolate between these two states as
        // described at the end of the "Fix Your Timestep!" blog post.
        this.drawn_location = Mat4.translation(...this.previous.center.mix(this.center, alpha))
            .times(this.blend_rotation(alpha))
            .times(Mat4.scale(...this.size));
    }

    check_if_colliding(b, collider) {
        // check_if_colliding(): Collision detection function.
        // DISCLAIMER:  The collision method shown below is not used by anyone; it's just very quick
        // to code.  Making every collision body an ellipsoid is kind of a hack, and looping
        // through a list of discrete sphere points to see if the ellipsoids intersect is *really* a
        // hack (there are perfectly good analytic expressions that can test if two ellipsoids
        // intersect without discretizing them into points).
        if (this == b)
            return false;
        // Nothing collides with itself.
        // Convert sphere b to the frame where a is a unit sphere:
        const T = this.inverse.times(b.drawn_location, this.temp_matrix);

        const {intersect_test, points, leeway} = collider;
        // For each vertex in that b, shift to the coordinate frame of
        // a_inv*b.  Check if in that coordinate frame it penetrates
        // the unit sphere at the origin.  Leave some leeway.
        // console.log(points.arrays)
        return points.arrays.position.some(p =>
            intersect_test(T.times(p.to4(1)).to3(), leeway));
    }
}