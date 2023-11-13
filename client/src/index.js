import {defs, tiny} from '../examples/common.js';
import {Body} from './body.js'
import {Snowball} from './snowball.js'

// Pull these names into this module's scope for convenience:
const {vec3, unsafe3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;
//outsource to constants
const MIN_MAP_X = -50
const MAX_MAP_X = 50
const MIN_MAP_Z = -50
const MAX_MAP_Z = 50
const WALL_BOUNCE_FACTOR = 0.5
const FLOOR_BOUNCE_FACTOR = 0.8


export class Simulation extends Scene {
    // **Simulation** manages the stepping of simulation time.  Subclass it when making
    // a Scene that is a physics demo.  This technique is careful to totally decouple
    // the simulation from the frame rate (see below).
    constructor(options) {
        super();
        Object.assign(this, {time_accumulator: 0, time_scale: 1, t: 0, dt: 1 / 20, bodies: [], steps_taken: 0}, options);
    }

    simulate(frame_time) {
        // simulate(): Carefully advance time according to Glenn Fiedler's
        // "Fix Your Timestep" blog post.
        // This line gives ourselves a way to trick the simulator into thinking
        // that the display framerate is running fast or slow:
        frame_time = this.time_scale * frame_time;

        // Avoid the spiral of death; limit the amount of time we will spend
        // computing during this timestep if display lags:
        this.time_accumulator += Math.min(frame_time, 0.1);
        // Repeatedly step the simulation until we're caught up with this frame:
        while (Math.abs(this.time_accumulator) >= this.dt) {
            // Single step of the simulation for all bodies:
            this.update_state(this.dt);
            for (let b of this.bodies)
                b.advance(this.dt);
            // Following the advice of the article, de-couple
            // our simulation time from our frame rate:
            this.t += Math.sign(frame_time) * this.dt;
            this.time_accumulator -= Math.sign(frame_time) * this.dt;
            this.steps_taken++;
        }
        // Store an interpolation factor for how close our frame fell in between
        // the two latest simulation time steps, so we can correctly blend the
        // two latest states and display the result.
        let alpha = this.time_accumulator / this.dt;
        for (let b of this.bodies) b.blend_state(alpha);
    }

    make_control_panel() {
        // make_control_panel(): Create the buttons for interacting with simulation time.
        this.key_triggered_button("Speed up time", ["Shift", "T"], () => this.time_scale *= 5);
        this.key_triggered_button("Slow down time", ["t"], () => this.time_scale /= 5);
        this.new_line();
        this.live_string(box => {
            box.textContent = "Time scale: " + this.time_scale
        });
        this.new_line();
        this.live_string(box => {
            box.textContent = "Fixed simulation time step size: " + this.dt
        });
        this.new_line();
        this.live_string(box => {
            box.textContent = this.steps_taken + " timesteps were taken so far."
        });
    }

    display(context, program_state) {
        // display(): advance the time and state of our whole simulation.
        if (program_state.animate)
            this.simulate(program_state.animation_delta_time);
        // Draw each shape at its current location:
        for (let b of this.bodies) {
            b.shape.draw(context, program_state, b.drawn_location, b.material);
            // console.log(b.constructor.name)
        }
    }

    update_state(dt)      // update_state(): Your subclass of Simulation has to override this abstract function.
    {
        throw "Override this"
    }
}


export class Test_Data {
    // **Test_Data** pre-loads some Shapes and Textures that other Scenes can borrow.
    constructor() {
        this.textures = {
            rgb: new Texture("assets/rgb.jpg"),
            earth: new Texture("assets/earth.gif"),
            grid: new Texture("assets/stars.png"),
            stars: new Texture("assets/stars.png"),
            text: new Texture("assets/text.png"),
        }
        this.shapes = {
            donut: new defs.Torus(15, 15, [[0, 2], [0, 1]]),
            cone: new defs.Closed_Cone(4, 10, [[0, 2], [0, 1]]),
            capped: new defs.Capped_Cylinder(4, 12, [[0, 2], [0, 1]]),
            ball: new defs.Subdivision_Sphere(3, [[0, 1], [0, 1]]),
            cube: new defs.Cube(),
            prism: new (defs.Capped_Cylinder.prototype.make_flat_shaded_version())(10, 10, [[0, 2], [0, 1]]),
            gem: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(2),
            donut2: new (defs.Torus.prototype.make_flat_shaded_version())(20, 20, [[0, 2], [0, 1]]),
        };
    }

    random_shape(shape_list = this.shapes) {
        // random_shape():  Extract a random shape from this.shapes.
        const shape_names = Object.keys(shape_list);
        return shape_list[shape_names[~~(shape_names.length * Math.random())]]
    }
}

export class Main_Demo extends Simulation {
    // ** Inertia_Demo** demonstration: This scene lets random initial momentums
    // carry several bodies until they fall due to gravity and bounce.
    constructor() {
        super({ time_scale: 0.2 ** 4 });
        this.data = new Test_Data();
        this.shapes = Object.assign({}, this.data.shapes);
        this.shapes.square = new defs.Square();
        const shader = new defs.Fake_Bump_Map(1);
        this.material = new Material(shader, {
            color: color(.4, .8, .4, 1),
            ambient: .4, texture: this.data.textures.stars
        })
        this.snowballMtl = new Material(new defs.Phong_Shader(), {
            color: color(1, 1, 1, 1),
            ambient: 0.8, 
        })

        this.inactive_color = new Material(shader, {
            color: color(.5, .5, .5, 1), ambient: .2,
            texture: this.data.textures.rgb
        });
        this.active_color = this.inactive_color.override({color: color(.5, 0, 0, 1), ambient: .5});

        this.colliders = [
            {intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(1), leeway: .5},
            {intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(2), leeway: .3},
            {intersect_test: Body.intersect_cube, points: new defs.Cube(), leeway: .1}
        ];
        this.requestThrowSnowball = false
        this.camera_transform = Mat4.identity()

        window.addEventListener('keydown', e => this.handleKeydown(e))
        window.addEventListener('keyup', e => this.handleKeyup(e))
        window.addEventListener('mousedown', e => this.handleMousedown(e))
        window.addEventListener('mousemove', e => this.handleMousemove(e))
        window.addEventListener('mouseup', e => this.handleKeyup({ key: 'mouse' }))

        this.moveActive = false
        this.downKeys = {}
        this.mouseMovementAmt = [0, 0]
        this.cameraRotation = [0, 0]
        this.userMovementAmt = [0, 0, 0]
        this.userPos = [0, 0, 40]
        this.userVel = [0, 0, 0]
        this.userCanJump = true
    }

    handleKeydown(e) {
        if (e.key === 'q') {
            console.log('throwing snowball')
            this.requestThrowSnowball = true
        }
        if (e.key === 'p') {
            const canvas = document.getElementsByTagName('canvas')?.[0]
            canvas.requestFullscreen()
        }
        if (['w', 'a', 's', 'd', ' '].includes(e.key))
            this.downKeys[e.key] = true
    }

    handleKeyup(e) {
        if (['w', 'a', 's', 'd', ' ', 'mouse'].includes(e.key) && this.downKeys[e.key]) {
            delete this.downKeys[e.key]
        }
    }

    handleMousedown(e) {
        this.moveActive = true
        this.downKeys['mouse'] = true
        e.target?.requestPointerLock()
    }

    handleMousemove(e) {
        if (!this.moveActive)
            return
        // console.log(e.movementX, e.movementY)
        this.mouseMovementAmt[0] += e.movementX
        this.mouseMovementAmt[1] += e.movementY
    }

    checkAllDownKeys() {
        if (this.downKeys['w'] || this.downKeys['s'])
            this.userMovementAmt[1] = (this.downKeys['w'] ? 1 : -1)
        else 
            this.userMovementAmt[1] = 0

        if (this.downKeys['a'] && !this.downKeys['d'])
            this.userMovementAmt[0] = -1
        else if (this.downKeys['d'] && !this.downKeys['a'])
            this.userMovementAmt[0] = 1
        else
            this.userMovementAmt[0] = 0

        if (this.downKeys[' '] && this.userCanJump) {
            this.userMovementAmt[2] = 1
            this.userCanJump = false
            setTimeout(() => this.userCanJump = true, 700)
        }

        if (this.downKeys['mouse'])
            this.requestThrowSnowball = true
    }

    random_color() {
        return this.material.override(color(.6, .6 * Math.random(), .6 * Math.random(), 1));
    }

    update_state(dt) {
        if (this.bodies.length === 0) { //bodies[0] is always the cube
            this.bodies.push(
                new Body(
                    this.data.shapes.cube, 
                    this.inactive_color, 
                    vec3(2, 2, 2)
                ).emplace(
                    Mat4.translation(...vec3(0, 0, 0)),
                    vec3(0, 0, 0), // vec3(0, -1, 0).randomized(2).normalized().times(3), 
                    0
                )
            );
        }

        if (this.requestThrowSnowball) {
            const s = 70
            const userDirection = [-this.camera_transform[0][2], -this.camera_transform[1][2], -this.camera_transform[2][2]]
            console.log(this.camera_transform)
            this.requestThrowSnowball = false
            this.bodies.push(
                new Snowball(
                    this.data.shapes.ball, 
                    this.snowballMtl, 
                    vec3(0.7, 0.7, 0.7),
                    "player1"
                ).emplace(
                    Mat4.translation(...userDirection.map(v => 5 * v)).times(this.camera_transform),
                    vec3(...userDirection.map(v => s * v)), // vec3(0, -1, 0).randomized(2).normalized().times(3), 
                    0
                )
            )
        }

        this.bodies[0].inverse = Mat4.inverse(this.bodies[0].drawn_location)
        let targetCollide = false
        for (let i = 1; i < this.bodies.length; i++) {
            const b = this.bodies[i]
            // Gravity on Earth, where 1 unit in world space = 1 meter:
            b.linear_velocity[1] += dt * -9.8;

            // If about to fall through floor, reverse y velocity:
            if (b.center[1] < -1 && b.linear_velocity[1] < 0)
                b.linear_velocity[1] *= -FLOOR_BOUNCE_FACTOR;

            // Don't make snowballs bounce off walls
            if(b.constructor.name !== "Snowball") {
                if ((b.center[0] < MIN_MAP_X && b.linear_velocity[0] < 0) || (b.center[0] > MAX_MAP_X && b.linear_velocity[0] > 0))
                    b.linear_velocity[0] *= -WALL_BOUNCE_FACTOR;
                if ((b.center[2] < MIN_MAP_Z && b.linear_velocity[2] < 0) || (b.center[2] > MAX_MAP_Z && b.linear_velocity[2] > 0))
                    b.linear_velocity[2] *= -WALL_BOUNCE_FACTOR;
            }

            if (targetCollide)
                continue
            //bodies[0] is the cube
            if (this.bodies[0].check_if_colliding(b, this.colliders[0])) {
                targetCollide = true
                console.log("Collision with cube");

                // Snowballs just disappear upon colliding with a cube
                if(b.constructor.name === "Snowball")
                {
                    this.bodies.splice(i, i);
                    i--;
                }
            }
            else 
                targetCollide = false
        }
        this.bodies[0].material = targetCollide ? this.active_color : this.inactive_color
        // Delete bodies that stop or stray too far away:
        // this.bodies = this.bodies.filter(b => b.center.norm() < 70 && b.linear_velocity.norm() > 0.2);
    }

    display(context, program_state) {
        // display(): Draw everything else in the scene besides the moving bodies.
        super.display(context, program_state);

        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            program_state.set_camera(Mat4.translation(0, 0, -50));    // Locate the camera here (inverted matrix).
            // this.children.push(new defs.Program_State_Viewer());
        }
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 500);
        program_state.lights = [
            new Light(vec4(0, -100, 0, 1), color(0, 0, 1, 1), 10000),
            new Light(vec4(0, 160, 0, 1), color(1, 1, 1, 1), 100000)
        ];
        // Draw the ground
        this.shapes.square.draw(
            context, program_state, 
            Mat4.translation(0, -2, 0)
                .times(Mat4.rotation(Math.PI / 2, 1, 0, 0))
                .times(Mat4.scale(50, 50, 1)),
            this.material.override(this.data.textures.earth)
        )
        // border walls
        for (let i = 0; i < 4; i++) {
            const translation = [
                [-50, 0, 0],
                [50, 0, 0],
                [0, 0, -50],
                [0, 0, 50]
            ][i]
            const rotation = (i < 2 ? [0, 1, 0] : [0, 0, 1])
            this.shapes.square.draw(
                context, program_state,
                Mat4.translation(...translation)
                    .times(Mat4.rotation(Math.PI / 2, ...rotation))
                    .times(Mat4.scale(50, 50, 1)),
                this.snowballMtl.override({ color: color(0.2, 0.2, 0.2, 1) })
            )
        }

        // outsource to contants
        const USER_ROTATION_SPEED_X = 0.005
        const USER_ROTATION_SPEED_Y = 0.005
        const USER_FWD_MOVE_SPEED = 0.6
        const USER_SIDE_MOVE_SPEED = 0.3
        const USER_BACK_MOVE_SPEED = 0.3

        this.checkAllDownKeys()

        this.cameraRotation[0] += USER_ROTATION_SPEED_X * this.mouseMovementAmt[0]
        this.cameraRotation[1] += USER_ROTATION_SPEED_Y * this.mouseMovementAmt[1]
        this.mouseMovementAmt = [0, 0]
        
        // calculate new user position
        if (this.userMovementAmt[0]) {
            this.userPos[0] += this.userMovementAmt[0] * USER_SIDE_MOVE_SPEED * Math.cos(this.cameraRotation[0]);
            this.userPos[2] += this.userMovementAmt[0] * USER_SIDE_MOVE_SPEED * Math.sin(this.cameraRotation[0]);
        }
        if (this.userMovementAmt[1]) {
            const speed = this.userMovementAmt[1] === 1 ? USER_FWD_MOVE_SPEED : USER_BACK_MOVE_SPEED
            this.userPos[0] -= this.userMovementAmt[1] * speed * Math.cos(this.cameraRotation[0] + Math.PI / 2);
            this.userPos[2] -= this.userMovementAmt[1] * speed * Math.sin(this.cameraRotation[0] + Math.PI / 2);
        }
        if (this.userMovementAmt[2]) {
            this.userVel[1] += 0.15
            this.userMovementAmt[2] = 0
        }
        else this.userVel[1] += 0.001 * -9.8 //use some animation time? look at simulation class.

        // check if user is out of bounds
        if (this.userPos[0] < MIN_MAP_X)
            this.userPos[0] = MIN_MAP_X
        else if (this.userPos[0] > MAX_MAP_X)
            this.userPos[0] = MAX_MAP_X
        if (this.userPos[2] < MIN_MAP_Z)
            this.userPos[2] = MIN_MAP_Z
        else if (this.userPos[2] > MAX_MAP_Z)
            this.userPos[2] = MAX_MAP_Z
        if (this.userPos[1] < -1 && this.userVel[1] < 0 && this.userVel[1] > -0.05) {
            this.userPos[1] = -1
            this.userVel[1] = 0
        }
        else if (this.userPos[1] < -1 && this.userVel[1] < 0)
            this.userVel[1] *= -.3;

        this.userPos[1] += this.userVel[1]
        // this.userMovementAmt = [0, 0]

        program_state.camera_transform = Mat4.rotation(-this.cameraRotation[0], 0, 1, 0)
            .times(Mat4.rotation(-this.cameraRotation[1], 1, 0, 0));
        program_state.camera_inverse = Mat4.rotation(+this.cameraRotation[1], 1, 0, 0)
            .times(Mat4.rotation(+this.cameraRotation[0], 0, 1, 0));

        program_state.camera_transform.pre_multiply(Mat4.translation(...this.userPos));
        program_state.camera_inverse.post_multiply(Mat4.translation(...this.userPos.map(v => -v)));

        // program_state.camera_transform = (Mat4.rotation(-this.cameraRotation[1], 1, 0, 0));
        // program_state.camera_inverse = (Mat4.rotation(+this.cameraRotation[1], 1, 0, 0));
    
                    
        // console.log(program_state.camera_transform)
        this.camera_transform = program_state.camera_transform
    }
}