// Shadows use code from: https://github.com/Robert-Lu/tiny-graphics-shadow_demo

import {defs, tiny} from '../examples/common.js';
import {Body} from './body.js'
import {Snowball} from './snowball.js'
import {Player} from "./player.js";
import {Particle_Shader} from "./particleshader.js";
import { Shape_From_File } from './shapefromfile.js';
import { mapComponents, genRandomStartingPos, genRandomPowerupPos } from './map.js';
import { checkMapComponentCollisions } from './collisions.js';
import { CONST } from './constants.js'
import {Test_Data} from './materials.js'
import {Buffered_Texture, Shadow_Textured_Phong_Shader, Depth_Texture_Shader_2D, Color_Phong_Shader, LIGHT_DEPTH_TEX_SIZE} from './shadowshaders.js'
// Pull these names into this module's scope for convenience:
const {vec3, unsafe3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;


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
            for (let b of this.bodies) {
                b.advance(this.dt);

                //Jankily update snowball time:
                if(b.material.hasOwnProperty('localTime')) {
                    // console.log("Snowball's localTime is " + b.material.localTime);
                    b.material.localTime += this.dt;
                }
            }

            for(let s of this.snowflakes) {
                s.material.localTime += this.dt;
            }

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

        for (let s of this.snowflakes) s.blend_state(alpha); //Very important to allow snowflakes to move
    }

    make_control_panel() {
        // make_control_panel(): Create the buttons for interacting with simulation time.
        // this.key_triggered_button("Speed up time", ["Shift", "T"], () => this.time_scale *= 5);
        // this.key_triggered_button("Slow down time", ["t"], () => this.time_scale /= 5);
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
        if (program_state.animate)
            this.simulate(program_state.animation_delta_time);
        for (let b of this.bodies) {
            b.shape.draw(context, program_state, b.drawn_location, b.material);
        }

        if(this.use_snowflakes)
        {
            for(let s of this.snowflakes) {
                s.shape.draw(context, program_state, s.drawn_location, s.material);
            }
        }


    }

    update_state(dt)      // update_state(): Your subclass of Simulation has to override this abstract function.
    {
        throw "Override this"
    }
}


export class Main_Demo extends Simulation {
    // ** Inertia_Demo** demonstration: This scene lets random initial momentums
    // carry several bodies until they fall due to gravity and bounce.
    constructor() {
        super({ time_scale: 0.2 ** 4 });

        this.initWebSocket();
        this.players = new Map();
        this.id = null;

        this.data = new Test_Data();
        this.shapes = Object.assign({}, this.data.shapes);
        this.shapes.square = new defs.Square();
        this.shapes.cube = new defs.Cube();
        // this.shapes.snowman = new Shape_From_File("assets/snowman.obj");
        this.shapes.snowman = new Shape_From_File("assets/snow.obj");
        this.shapes.boots = new Shape_From_File("assets/boots.obj");
        this.shapes.gun = new Shape_From_File("assets/gun.obj");
        const shader = new defs.Fake_Bump_Map(1);

        this.materials = Object.assign({}, this.data.materials);

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
        window.addEventListener('mouseup', e => this.handleMouseup(e))

        this.moveActive = false
        this.downKeys = {}
        this.mouseMovementAmt = [0, 0]
        this.userMovementAmt = [0, 0, 0]
        this.userPos = genRandomStartingPos()
        this.cameraRotation = [this.userPos[2] < 0 ? Math.PI : 0, 0]
        this.userVel = [0, 0, 0]
        this.userCanJump = true


        //Initialize player class

        let defaultFireSpeed= vec3(0, 6, 70); //deprecated
        let defaultMoveSpeed = vec3(2, 1, 1);
        // let defaultMoveSpeed = vec3(10, 10, 10); // NOTE: made this faster for testing purposes
        this.playerId = `P${Math.floor(Math.random() * 9000 + 1000)}` //P1000 - P9999
        this.player = new Player(this.playerId, defaultMoveSpeed, 1, defaultFireSpeed); //1 = fireRate

        this.chargeTime = 0.0; // How long the user has been charging a snowball shot for
        this.charging = false;

        // Initialize snowflakes to create snowfall effect
        this.snowflakes = [];

        //powerups
        this.powerupPos = null // null | [x, y, z]
        this.powerupType = 0 // 0: none, 1: firerate, 2: jump
        this.activePowerup = 0 //0: none, 1: firerate: 2: jump


        //menu
        const slider = document.getElementById("slider");
        slider.addEventListener("input", function() {
            const sliderValue = slider.value;
            document.getElementById('slider-label').innerText = `Sensitivity: ${sliderValue}`
            CONST.USER_ROTATION_SPEED_X = sliderValue * 2 * 0.003
            CONST.USER_ROTATION_SPEED_Y = sliderValue * 2 * 0.003
        });
        const skinPicker = document.getElementById('skin-picker')
        skinPicker.addEventListener('click', (e) => {
            const value = e.target.getAttribute('value')
            if (value) {
                this.userSkin = value
                document.getElementById('skin-text').style.color = value
            }
        })
        const sbtn = document.getElementById('shadow-btn')
        sbtn.addEventListener('click', e => {
            this.use_shadows = !this.use_shadows 
            sbtn.innerText = this.use_shadows ? 'Shadow mode: on' : 'Shadow mode: off'
        })
        const sfbtn = document.getElementById('snowflake-btn')
        sfbtn.addEventListener('click', e => {
            console.log(this.use_snowflakes)
            this.use_snowflakes = !this.use_snowflakes 
            sfbtn.innerText = this.use_snowflakes ? 'Snowflakes: on' : 'Snowflakes: off'
        })

        // Initialize textures for shadows

        // For the floor and wall obstacles
        this.floor = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: color(1, 1, 1, 1), ambient: .3, diffusivity: 0.6, specularity: 0.1, smoothness: 64,
            // color_texture: null,
            color_texture: new Texture("assets/snow.jpg"),
            light_depth_texture: null
        })

        // For the first pass
        this.pure = new Material(new Color_Phong_Shader(), {
        })

        // For light source
        this.light_src = new Material(new defs.Phong_Shader(), {
            color: color(1, 1, 1, 0.5), ambient: 1, diffusivity: 0, specularity: 0
        });
        // this.light_src = new Material(new defs.Textured_Phong(), {
        //     // color: color(0, 0, 0, 1),
        //     ambient: 1.0,
        //     texture: new Texture("assets/discoballtexture.jpg", "NEAREST")
        // });

        // For depth texture display
        this.depth_tex =  new Material(new Depth_Texture_Shader_2D(), {
            color: color(0, 0, .0, 1),
            ambient: 1, diffusivity: 0, specularity: 0, texture: null
        });

        // To make sure texture initialization only does once
        this.init_ok = false;

        this.use_shadows = true; // Toggle to turn shadows on/off
        this.use_snowflakes = true; // Toggle to turn snowflakes on/off
    }

    initWebSocket() {
        this.socketTimeLastSent = 0
        this.socket = new WebSocket('wss://snow.bazzled.com/ws') //new WebSocket('ws://184.72.14.50/ws'); // this.socket = new WebSocket('ws://3.101.2.62/ws'); //

        this.socket.onopen = () => {
            console.log('WebSocket connection established');
        };

        this.socket.onmessage = (event) => {
            this.handleWebSocketMessage(event);
        };

        this.socket.onerror = (event) => {
            console.error('WebSocket error:', event);
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket connection closed');
        };
    }

    sendPlayerAction(action) {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(action));
        }
    }


    handleWebSocketMessage(event) {
        let data;
        try {
            data = JSON.parse(event.data);
            event.timeStamp
        } catch  (e) {
            console.log(event.data)
            console.log(e)
            return
        }

        if (data.type === 'move') {
            // Handle move event
            const id = data.id
            const position = { x: data.x, y: data.y, z: data.z, };
            this.addOrUpdatePlayerMarker(id, position, data.rotation, data.skin);
        } else if (data.type === 'assignID') {
            this.id = data.id;
        } else if (data.type === 'playerDisconnected') {
            this.players.delete(data.playerId)
        } else if (data.type === 'snowball-throw') {
            const userDirection = [data.usr_dir1, data.usr_dir2, data.usr_dir3]

            this.requestThrowSnowball = false
            const snowballVelocity = vec3(data.vx, data.vy, data.vz)
            
            this.bodies.push(
                new Snowball(
                    this.data.shapes.ball, 
                    this.materials.snowballTexturedMtl,
                    vec3(0.7, 0.7, 0.7),
                    data.id
                ).emplace(
                    Mat4.translation(...userDirection.map(v => 5 * v)).times(data.matrix),
                    snowballVelocity, // vec3(0, -1, 0).randomized(2).normalized().times(3),
                    0
                )
            )
            console.log(this.bodies)
        } else if (data.type === 'player-kill') {
            console.log(data)
            console.log(this.id)
            if (data.playerKilled !== this.id) // || this.userIsDead)
                return
            console.log('user died')
            this.userIsDead = true
            this.userPos = genRandomStartingPos()
            this.cameraRotation = [this.userPos[2] < 0 ? Math.PI : 0, 0]
            this.userVel = [0, 0, 0]
        }
    }

    addOrUpdatePlayerMarker(id, position, rotation, skin) {
        if (id === this.id) {
            return;
        }
        if (this.players.has(id)) {
            const player = this.players.get(id);
            player.serverPos = position
            player.rotation = rotation
            player.skin = skin
        } else if (id) {
            const player = { x: position.x, y: position.y, z: position.z, serverPos: position , rotation: rotation, skin }
            this.players.set(id, player);
        }

    }

    handleKeydown(e) {
        if (e.key === 'e') {
            this.userZoom = !this.userZoom
        }
        if (e.key === 'q' || e.key === 'Escape') {
            this.moveActive = false
            document.exitPointerLock()
            console.log(this.userPos)
            document.getElementsByClassName('menu-bg')[0].style.opacity = 1;
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
        if (e.target.closest('.menu') && !e.target.closest('#start-col'))
            return

        const bgMusic = document.getElementById('background-music');
        bgMusic.volume = 0.5; // Set the volume (0.0 to 1.0)
        bgMusic.play().catch(error => {
            console.error('Error playing background music:', error);
        });

        document.getElementsByClassName('menu-bg')[0].style.opacity = 0;
        e.target?.requestPointerLock()
        this.moveActive = true

        this.downKeys['mouse'] = true

        if(!this.charging)
            this.charging = true;
    }

    handleMouseup(e) {
        if (e.target.closest('.menu') && !e.target.closest('#start-col'))
            return

        this.charging = false
        this.requestThrowSnowball = true
        document.getElementById('chargebar').style.opacity = 0
    }

    handleMousemove(e) {
        if (!this.moveActive)
            return
        this.mouseMovementAmt[0] += e.movementX
        this.mouseMovementAmt[1] += e.movementY
    }

    checkAllDownKeys() {
        if (!this.moveActive)
            return this.userMovementAmt = [0, 0]

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

        if (this.downKeys[' '] && this.userCanJump && this.userPos[1] <= this.activeGround) {
            this.userMovementAmt[2] = 1
            this.userCanJump = false
        }

        if (this.downKeys['mouse']) {
            if(this.charging) {
                // console.log('charging snowball: ', this.chargeTime)
                this.chargeTime += this.dt; //use this.dt (simulation time) or real time?
                    document.getElementById('chargebar').style.opacity = this.chargeTime < 1 ? 0.1 : (this.chargeTime - 1)
            }
        }
    }

    random_color() {
        return this.material.override(color(.6, .6 * Math.random(), .6 * Math.random(), 1));
    }

    // returns id of player collision or null if none
    checkPlayerCollisions(x, y, z) {
        let pid = null
        this.userPos
        for (const k of this.players.keys()) {
            const player = this.players.get(k)
            if (Math.sqrt((player.x-x)**2 + (player.y-y)**2 + (player.z-z)**2 ) < 2)
                pid = k
        }
        return pid
    }

    update_state(dt) {
        if (this.requestThrowSnowball && this.player.canFire()) {
            if (false) { //for map creation only
                const newWall = { translate: [Math.round(this.userPos[0]), 0, Math.round(this.userPos[2])],  rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] }
                mapComponents.push(newWall)
                if (!window.items)
                    window.items = []
                window.items.push(newWall)
            }

            const userDirection = [-this.camera_transform[0][2], -this.camera_transform[1][2], -this.camera_transform[2][2]]
            this.requestThrowSnowball = false
            const chargeAmount = Math.min( Math.max(this.chargeTime, 1.0), 2 )
            const snowballVelocity = vec3(...userDirection.map(v =>  chargeAmount * CONST.SNOWBALL_CHARGE_FACTOR * v))
            // const playerThrowSpeed = this.player.getFireSpeed();

            this.bodies.push(
                new Snowball(
                    this.data.shapes.ball, 
                    // this.materials.snowballMtl,
                    this.materials.snowballTexturedMtl,

                    vec3(0.7, 0.7, 0.7),
                    this.player.getPlayerID()
                ).emplace(
                    Mat4.translation(...userDirection.map(v => 5 * v)).times(this.camera_transform),
                    snowballVelocity, // vec3(0, -1, 0).randomized(2).normalized().times(3),
                    0
                )
            )

            // console.log("Fired snowball with localTime of " + this.bodies[this.bodies.length - 1].material.localTime);
            // console.log(this.player.getPlayerID() + " has thrown a snowball. Snowball knows it as " + this.bodies[this.bodies.length - 1].throwerID);


            this.player.indicateFired();
            this.chargeTime = 0.0; //Not sure about the order in which events are handled so setting it to 0 here
            this.sendPlayerAction({ 
                id: this.id, 
                type: 'snowball-throw', 
                x: this.userPos[0], 
                y: this.userPos[1], 
                z: this.userPos[2], 
                vx: snowballVelocity[0], 
                vy: snowballVelocity[1], 
                vz: snowballVelocity[2],
                usr_dir1: userDirection[0], 
                usr_dir2: userDirection[1], 
                usr_dir3: userDirection[2],
                chargeAmount: chargeAmount, 
                matrix: this.camera_transform,
            })

        }
         else if(this.requestThrowSnowball && !this.player.canFire()) {
             console.log("Player not allowed to fire. Fire rate is " + this.player.getFireRate());
             this.requestThrowSnowball = false; // Make the player press a key again to request another snowball
         }

         for (let i = 0; i < this.bodies.length; i++) {
            const b = this.bodies[i]


            if(b.constructor.name === "Snowball" && b.hasCollided()) {
                if(b.timeSinceCollision() > 1.0){
                    this.bodies.splice(i, 1);
                    i--;
                }
                continue;
            }


            // Gravity on Earth, where 1 unit in world space = 1 meter:
            b.linear_velocity[1] += dt * -9.8;

            // Player collision detection w/ snowballs here:
            // only check snowballs that this.player has thrown
            let collisionWithPlayer = (b.throwerID === this.player.getPlayerID()) && this.checkPlayerCollisions(b.center[0], b.center[1], b.center[2]);
            if(collisionWithPlayer) { 
                console.log(b.timeSinceCollision())
                console.log("HERE")
                b.slow_snowball();
                b.indicateCollision();
                this.sendPlayerAction({ 
                    id: this.id, 
                    type: 'player-kill', 
                    playerKilled: collisionWithPlayer
                })
            }

            // If about to fall through floor, reverse y velocity:
            let collisionResult = checkMapComponentCollisions(b.center, b.linear_velocity, true)
            if (
                b.center[0] < CONST.MAX_MAP_X && b.center[0] > CONST.MIN_MAP_X && 
                b.center[2] < CONST.MAX_MAP_Z && b.center[2] > CONST.MIN_MAP_Z && 
                b.center[1] < -1 && b.linear_velocity[1] < 0
            )
                b.linear_velocity[1] *= -CONST.FLOOR_BOUNCE_FACTOR;

            if(collisionResult.collision) {
                // console.log("[BODIES] Collided snowball at: " + b.center);
                b.slow_snowball();
                b.indicateCollision();
            }




        }

        // console.log("There are " + this.snowflakes.length + " snowflakes in the scene");
        for(let i = 0; i < this.snowflakes.length; i++) {

            let s = this.snowflakes[i];
            // Remove snowflakes that have been alive for a while.
            // Ideally would delete them after they fall through the floor, but since the movement is done in the shader, there's no way to get that value easily from here
            if(s.material.localTime >= 5.0) {
                this.snowflakes.splice(i, 1);
                // console.log("Deleting snowflake");
                i--;
            }
            else{
                // Comment out  --- want to implement in shader not in js
                // s.linear_velocity[1] += dt * -9.8; //Gravity
            }


        }
        this.bodies = this.bodies.filter(b => b.center.norm() < 200)

        // Add snowflakes each frame
        if(this.use_snowflakes)
        {
            for(let i = 0; i < 3; i++) {
                //TODO: only spawn snowflakes within the user's field of view
                let snowflakeLocation = Mat4.identity();
                snowflakeLocation = snowflakeLocation.times(Mat4.translation(Math.random() * 100 - 50, 50, Math.random() * 100 - 50));

                this.snowflakes.push(
                    new Body(
                        this.data.shapes.snowflake,
                        this.materials.snowflakeMtl.override({localTime: 0.0}),
                        vec3(0.3, 0.3, 0.3),
                    ).emplace(
                        snowflakeLocation,
                        vec3(0, -1, -1), // vec3(0, -1, 0).randomized(2).normalized().times(3),
                        0
                    )
                )

            }
        }


    }

    display(context, program_state) { 
        // display(): Draw everything else in the scene besides the moving bodies.
        super.display(context, program_state);

        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // program_state.set_camera(Mat4.translation(0, 0, -50));    // Locate the camera here (inverted matrix). // UNCOMMENT THIS AFTER TESTING SHADOWS
            // this.children.push(new defs.Program_State_Viewer());

            program_state.set_camera(Mat4.look_at( // ONLY FOR TESTING SHADOWS
                vec3(0, 12, 12),
                vec3(0, 2, 0),
                vec3(0, 1, 0)
            )); // Locate the camera here
        }
        program_state.projection_transform = Mat4.perspective(
            this.userZoom ? Math.PI / 8 : 0.33 * Math.PI, 
            context.width / context.height, 
            1, 500
        );

        // For shadows
        const gl = context.context;
        if (!this.init_ok) {
            const ext = gl.getExtension('WEBGL_depth_texture'); // Need WebGL's depth texture extension to be able to render shadows
            if (!ext) {
                return alert('need WEBGL_depth_texture');  // eslint-disable-line
            }
            this.texture_buffer_init(gl);

            this.init_ok = true;
        }


        // The position of the light
        this.light_position = Mat4.rotation(0, 0, 1, 0).times(vec4(1, 15, 0, 1));
        // The color of the light
        this.light_color = color(1,1,0,1);

        // This is a rough target of the light.
        // Although the light is point light, we need a target to set the POV of the light
        this.light_view_target = vec4(0, 0, 0, 1);
        //  TODO: the "cone" of the light is rather small, so wall obstacles on the edges of the map don't get shadows
        this.light_field_of_view = 160 * Math.PI / 180; // 160 degrees arbitrarily

        // Adjust the last parameter to make the light bigger
        program_state.lights = [new Light(this.light_position, this.light_color, this.use_shadows ? 10000 : 0)];

        if(this.use_shadows)
        {
            // Render shadows
            // Step 1: set the perspective and camera to the POV of light
            const light_view_mat = Mat4.look_at(
                vec3(this.light_position[0], this.light_position[1], this.light_position[2]),
                vec3(this.light_view_target[0], this.light_view_target[1], this.light_view_target[2]),
                vec3(0, 1, 0), // assume the light to target will have a up dir of +y, maybe need to change according to your case
            );
            const light_proj_mat = Mat4.perspective(this.light_field_of_view, 1, 0.5, 500);
            // Bind the Depth Texture Buffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer); // Draw to the lightDepthFramebuffer instead of the framebuffer that's shown onscreen
            gl.viewport(0, 0, this.lightDepthTextureSize, this.lightDepthTextureSize); // Viewport is the texture instead of the user's viewport
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            // Prepare uniforms
            program_state.light_view_mat = light_view_mat;
            program_state.light_proj_mat = light_proj_mat;
            program_state.light_tex_mat = light_proj_mat;
            program_state.view_mat = light_view_mat;
            program_state.projection_transform = light_proj_mat;
            this.render_scene(context, program_state, false,false, false); // Do z-buffer algorithm from light's POV

            // Step 2: unbind, draw to the canvas
            gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Don't draw to the lightDepthFrameBuffer, draw to the framebuffer that the user will see
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); // Re-set the viewport to the user's viewport
            program_state.view_mat = program_state.camera_inverse;
            // program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 0.5, 500);
            program_state.projection_transform = Mat4.perspective(this.userZoom ? Math.PI / 8 : 0.33 * Math.PI, context.width / context.height, 1, 500);
            this.render_scene(context, program_state, true,true, true); // Do the z-buffer algorithm from the eye's POV

        }


        else if (!this.use_shadows)
        {
            // Draw the ground
            this.shapes.square.draw(
                context, program_state,
                Mat4.translation(0, -2, 0)
                    .times(Mat4.rotation(Math.PI / 2, 1, 0, 0))
                    .times(Mat4.scale(CONST.MAX_MAP_X, CONST.MAX_MAP_Z, 1)),
                this.materials.snowgroundMtl
            )
            this.shapes.square.draw(
                context, program_state,
                Mat4.translation(0, -20, 0)
                    .times(Mat4.rotation(Math.PI / 2, 1, 0, 0))
                    .times(Mat4.scale(200, 200, 1)),
                this.materials.fullGround
            )
            this.shapes.ball.draw(
                context, program_state,
                Mat4.translation(0, 0, 0)
                    .times(Mat4.rotation(0, 1, 0, 0))
                    .times(Mat4.scale(200, 200, 200)),
                this.materials.backgroundOne
            )

            for (const piece of mapComponents) {
                this.shapes.cube.draw(
                    context, program_state,
                    Mat4.translation(...piece.translate)
                        .times(Mat4.rotation(piece.roationAngle, ...piece.rotation))
                        .times(Mat4.scale(...piece.scale)),
                    this.materials.wallMtl
                )
            }
        }


        this.checkAllDownKeys()
        //draw all the players
        this.players.forEach((player) => {
            for (const dir of ['x', 'y', 'z']) {
                player[dir] += 0.3 * (player.serverPos[dir] - player[dir])
            }
            // this.shapes.cube.draw(
            //     context, program_state,
            //     Mat4.translation(player.x, player.y, player.z).times(Mat4.scale(1, 2, 1)),
            //     this.materials.playerMtl
            // )
            this.shapes.snowman.draw(
                context, program_state,
                Mat4.translation(player.x, player.y, player.z).times(Mat4.scale(1, 1, 1)).times(Mat4.rotation(-player.rotation + 160, 0, 1, 0)),
                this.materials['playerMtl_' + (player.skin || 'red')]
            )
        })

        this.cameraRotation[0] +=CONST.USER_ROTATION_SPEED_X * this.mouseMovementAmt[0]
        if (this.cameraRotation[1] >= -1.5 && this.cameraRotation[1] + CONST.USER_ROTATION_SPEED_Y * this.mouseMovementAmt[1] > -1.5 
            && this.cameraRotation[1] <= 1.5 && this.cameraRotation[1] + CONST.USER_ROTATION_SPEED_Y * this.mouseMovementAmt[1] < 1.5) {
            this.cameraRotation[1] += CONST.USER_ROTATION_SPEED_Y * this.mouseMovementAmt[1]
        }
        this.mouseMovementAmt = [0, 0]
        
        // calculate new user position
        if (this.userMovementAmt[0]) {
            this.userPos[0] += this.userMovementAmt[0] * CONST.USER_SIDE_MOVE_SPEED * Math.cos(this.cameraRotation[0]);
            this.userPos[2] += this.userMovementAmt[0] * CONST.USER_SIDE_MOVE_SPEED * Math.sin(this.cameraRotation[0]);
        }
        if (this.userMovementAmt[1]) {
            const speed = this.userMovementAmt[1] === 1 ? CONST.USER_FWD_MOVE_SPEED : CONST.USER_BACK_MOVE_SPEED
            this.userPos[0] -= this.userMovementAmt[1] * speed * Math.cos(this.cameraRotation[0] + Math.PI / 2);
            this.userPos[2] -= this.userMovementAmt[1] * speed * Math.sin(this.cameraRotation[0] + Math.PI / 2);
        }
        if (this.userMovementAmt[2]) {
            this.userVel[1] += CONST.USER_JUMP_VEL
            this.userMovementAmt[2] = 0
        }
        

        const compCollisionData = checkMapComponentCollisions(this.userPos)
        const activeCeiling = compCollisionData.activeCeiling
        this.activeGround = compCollisionData.activeGround

        // use constant, handle death
        if (this.userPos[1] <= -18) {
            this.userPos = genRandomStartingPos()
            this.cameraRotation = [this.userPos[2] < 0 ? Math.PI : 0, 0]
            this.userVel = [0, 0, 0]
            console.log('handle death here')
        }

        if (this.userPos[1] <= this.activeGround && (this.userVel[1] <= 0 || Math.abs(this.userVel[1] < 0.1)) ) {
            this.userVel[1] = Math.min(0.3 * (this.activeGround - this.userPos[1]), 0.1)
            this.userCanJump = true
        }
        else 
            this.userVel[1] += 0.001 * -9.8 //use some animation time? look at simulation class.
        this.userPos[1] += this.userVel[1]
        if (Date.now() > this.socketTimeLastSent + CONST.WEBSOCKET_SEND_MIN_DELAY) {
            this.socketTimeLastSent = Date.now()
            this.sendPlayerAction({ id: this.id, type: 'move', x: this.userPos[0], y: this.userPos[1], z: this.userPos[2], rotation: this.cameraRotation[0], skin: (this.userSkin || 'red') });
        }

        if (this.userPos[1] > activeCeiling - 0.1){
            this.userPos[1] = activeCeiling - 0.1
            this.userVel[1] = 0
        }

        if (this.powerupPos) {
            if (Math.sqrt((this.userPos[0] - this.powerupPos[0])**2 + (this.userPos[1] - this.powerupPos[1])**2 + (this.userPos[2] - this.powerupPos[2])**2 ) < 2) {
                this.powerupPos = null
                this.activePowerup = this.powerupType
                this.powerupType = 0
                if (this.activePowerup === 1) {
                    this.player.setFireRate(5)
                    setTimeout(() => {
                        this.activePowerup = 0;
                        this.player.setFireRate(1)
                    }, CONST.POWERUP_TIME)
                }
                else {
                    CONST.USER_JUMP_VEL = 0.4
                    setTimeout(() => {
                        this.activePowerup = 0;
                        CONST.USER_JUMP_VEL = 0.2
                    }, CONST.POWERUP_TIME)
                }
            }
        }
        const scope = document.getElementById('scope')
        scope.style.borderWidth = this.activePowerup >= 1  ? '4px' : ''
        scope.style.borderColor = this.activePowerup === 2 ? 'green' : ''
        //draw powerups
        if (this.powerupPos)
            this.shapes[this.powerupType === 2 ? 'boots' : 'gun'].draw(
                context, program_state,
                Mat4.translation(...this.powerupPos)
                    .times(Mat4.scale(1, 1, 1))
                    .times(Mat4.rotation(program_state.animation_time * 0.001, 0, 1, 0))
                    .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0)),
                this.powerupType === 1 ? this.materials.powerupMtlFire : this.materials.powerupMtlJump
            )
        else if (!this.activePowerup) {
            this.powerupType = Math.random() < 0.5 ? 1 : 2
            this.powerupPos = genRandomPowerupPos()
        }

        // if (this.chargeTime > 1){ 
        //     this.cameraRotation[0] += 0.01 * (Math.random() - 0.5)
        //     this.cameraRotation[1] += 0.01 * (Math.random() - 0.5)
        // }
        program_state.camera_transform = Mat4.rotation(-this.cameraRotation[0], 0, 1, 0)
            .times(Mat4.rotation(-this.cameraRotation[1], 1, 0, 0));
        program_state.camera_inverse = Mat4.rotation(+this.cameraRotation[1], 1, 0, 0)
            .times(Mat4.rotation(+this.cameraRotation[0], 0, 1, 0));

        program_state.camera_transform.pre_multiply(Mat4.translation(...this.userPos));
        program_state.camera_inverse.post_multiply(Mat4.translation(...this.userPos.map(v => -v)));
        this.camera_transform = program_state.camera_transform
    }



    // Change the parameters depending on if it's the first pass or second pass (of shadow mapping)
    render_scene(context, program_state, shadow_pass, draw_light_source=false, draw_shadow=false) {
        // shadow_pass: true if this is the second pass that draw the shadow.
        // draw_light_source: true if we want to draw the light source.
        // draw_shadow: true if we want to draw the shadow

        let light_position = this.light_position;
        let light_color = this.light_color;
        const t = program_state.animation_time;

        program_state.draw_shadow = draw_shadow;

        if (draw_light_source && shadow_pass) {
            this.shapes.sphere.draw(context, program_state,
                Mat4.translation(light_position[0], light_position[1], light_position[2]).times(Mat4.scale(2.0,2.0,2.0)),
                this.light_src.override({color: light_color}));
        }


        // Draw the ground
        //  TODO: the ground is either a little high or a little low, adjust the translation amount
        this.shapes.cube.draw(
            context, program_state,
            Mat4.translation(0, -2, 0)
                .times(Mat4.rotation(Math.PI / 2, 1, 0, 0))
                .times(Mat4.scale(CONST.MAX_MAP_X, CONST.MAX_MAP_Z, 0.1)),
            shadow_pass ? this.floor: this.pure
        )
        // this.shapes.cube.draw(
        //     context, program_state,
        //     Mat4.translation(0, -20, 0)
        //         .times(Mat4.rotation(Math.PI / 2, 1, 0, 0))
        //         .times(Mat4.scale(200, 200, 1)),
        //     shadow_pass ? this.floor : this.pure
        // )
        this.shapes.ball.draw( // Draw the mountains in the background
            context, program_state,
            Mat4.translation(0, 0, 0)
                .times(Mat4.rotation(0, 1, 0, 0))
                .times(Mat4.scale(200, 200, 200)),
            // shadow_pass ? this.floor : this.pure
            this.materials.backgroundOne // no shadows needed for the background
        )

        for (const piece of mapComponents) { // Draw wall obstacles and the steps
            const scale = [...piece.scale]
            const translate = [...piece.translate]
            this.shapes.cube.draw(
                context, program_state,
                Mat4.translation(...translate)
                    .times(Mat4.rotation(piece.roationAngle, ...piece.rotation))
                    .times(Mat4.scale(...scale)),
                // shadow_pass ? this.floor : this.pure
                shadow_pass ? this.floor : this.pure
            )
        }


    }

    // For shadows -- creates the depth texture
    texture_buffer_init(gl) {
        // Depth Texture
        this.lightDepthTexture = gl.createTexture();
        // Bind it to TinyGraphics
        this.light_depth_texture = new Buffered_Texture(this.lightDepthTexture);
        // this.stars.light_depth_texture = this.light_depth_texture
        this.floor.light_depth_texture = this.light_depth_texture

        this.lightDepthTextureSize = LIGHT_DEPTH_TEX_SIZE;
        gl.bindTexture(gl.TEXTURE_2D, this.lightDepthTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,      // target
            0,                  // mip level
            gl.DEPTH_COMPONENT, // internal format
            this.lightDepthTextureSize,   // width
            this.lightDepthTextureSize,   // height
            0,                  // border
            gl.DEPTH_COMPONENT, // format
            gl.UNSIGNED_INT,    // type
            null);              // data
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Depth Texture Buffer
        this.lightDepthFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,       // target
            gl.DEPTH_ATTACHMENT,  // attachment point
            gl.TEXTURE_2D,        // texture target
            this.lightDepthTexture,         // texture
            0);                   // mip level
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // create a color texture of the same size as the depth texture
        // see article (https://webglfundamentals.org/webgl/lessons/webgl-shadows.html) for why this is needed
        this.unusedTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.unusedTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.lightDepthTextureSize,
            this.lightDepthTextureSize,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // attach it to the framebuffer
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,        // target
            gl.COLOR_ATTACHMENT0,  // attachment point
            gl.TEXTURE_2D,         // texture target
            this.unusedTexture,         // texture
            0);                    // mip level
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}