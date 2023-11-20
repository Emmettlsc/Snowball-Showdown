import {tiny} from '../tiny-graphics.js';
import {widgets} from '../tiny-graphics-widgets.js';
// Pull these names into this module's scope for convenience:
const {
    Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4,
    Light, Shape, Material, Shader, Texture, Scene, program
} = tiny;
export class Snowflake_Shader extends Shader {
    // **Basic_Shader** is nearly the simplest example of a subclass of Shader, which stores and
    // maanges a GPU program.  Basic_Shader is a trivial pass-through shader that applies a
    // shape's matrices and then simply samples literal colors stored at each vertex.
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `precision mediump float;
                varying vec4 VERTEX_COLOR;
            `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
                attribute vec4 color;
                attribute vec3 position;                            
                // Position is expressed in object coordinates.
                uniform mat4 projection_camera_model_transform;
        
                void main(){
                    // Compute the vertex's final resting place (in NDCS), and use the hard-coded color of the vertex:
                    
                    vec3 new_position = vec3(position.x, position.y - 1.0, position.z); 
                    gl_Position = projection_camera_model_transform * vec4( new_position, 1.0 );
                    VERTEX_COLOR = color;
                }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code() + `
                void main(){
                    // The interpolation gets done directly on the per-vertex colors:
                    gl_FragColor = VERTEX_COLOR;
                }`;
    }
}