import {defs, tiny} from '../examples/common.js';
import {Particle_Shader} from "./particleshader.js";
import {Snow_Shader} from "./snowballshader.js";

const {vec3, unsafe3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

export class Test_Data {
    // **Test_Data** pre-loads some Shapes and Textures that other Scenes can borrow.
    constructor() {
        this.textures = {
            rgb: new Texture("assets/rgb.jpg"),
            earth: new Texture("assets/earth.gif"),
            snowground: new Texture("assets/snowground.png"),
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

            snowball_flatshaded: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(3),
        };

        const shader = new defs.Fake_Bump_Map(1);

        this.materials = {

            snowballMtl: new Material(new defs.Phong_Shader(), {
                color: color(1, 1, 1, 1),
                ambient: 0.8,
            }),

            snowballExplosionMtl: new Material(new Particle_Shader(), {
                color: color(1, 1, 1, 1),
                ambient: 0.8,
                localTime: 0.0,
            }),

            snowballTexturedMtl: new Material(new defs.Textured_Phong(), { ambient: 1.0, texture: new Texture("assets/snow.jpg")   }),
            snowgroundMtl:       new Material(new defs.Textured_Phong(), { ambient: 1.0, texture: new Texture("assets/snow.jpg")   }),
            wallMtl:             new Material(new defs.Textured_Phong(), { ambient: 0.3, texture: new Texture("assets/snow.jpg")   }),
            fullGround:          new Material(new defs.Textured_Phong(), { ambient: 0.6, texture: new Texture("assets/snow.jpg"), color: color(0.6, 0.6, 1, 1)   }),
            backgroundOne:       new Material(new defs.Textured_Phong(), { ambient: 1,   texture: new Texture("assets/a1_c2.png")   }),
            backgroundTwo:       new Material(new defs.Textured_Phong(), { ambient: 1,   texture: new Texture("assets/a2.png")   }),

        };

    }

    random_shape(shape_list = this.shapes) {
        // random_shape():  Extract a random shape from this.shapes.
        const shape_names = Object.keys(shape_list);
        return shape_list[shape_names[~~(shape_names.length * Math.random())]]
    }
}