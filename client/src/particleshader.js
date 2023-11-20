import {tiny} from '../tiny-graphics.js';
import {widgets} from '../tiny-graphics-widgets.js';
// Pull these names into this module's scope for convenience:
const {
    Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4,
    Light, Shape, Material, Shader, Texture, Scene, program
} = tiny;


export class Particle_Shader extends Shader {
    // **Phong_Shader** is a subclass of Shader, which stores and maanges a GPU program.
    // Graphic cards prior to year 2000 had shaders like this one hard-coded into them
    // instead of customizable shaders.  "Phong-Blinn" Shading here is a process of
    // determining brightness of pixels via vector math.  It compares the normal vector
    // at that pixel with the vectors toward the camera and light sources.


    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` precision mediump float;
                const int N_LIGHTS = ` + this.num_lights + `;
                uniform float ambient, diffusivity, specularity, smoothness;
                uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
                uniform float light_attenuation_factors[N_LIGHTS];
                uniform vec4 shape_color;
                uniform vec3 squared_scale, camera_center;
        
                uniform float localTime; 
                
                // Specifier "varying" means a variable's final value will be passed from the vertex shader
                // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
                // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
                varying vec3 N, vertex_worldspace;
                
                varying vec3 normalvector_worldspace; 
                
                // ***** PHONG SHADING HAPPENS HERE: *****                                       
                vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
                    // phong_model_lights():  Add up the lights' contributions.
                    vec3 E = normalize( camera_center - vertex_worldspace );
                    vec3 result = vec3( 0.0 );
                    for(int i = 0; i < N_LIGHTS; i++){
                        // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                        // light will appear directional (uniform direction from all points), and we 
                        // simply obtain a vector towards the light by directly using the stored value.
                        // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                        // the point light's location from the current surface point.  In either case, 
                        // fade (attenuate) the light as the vector needed to reach it gets longer.  
                        vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                                       light_positions_or_vectors[i].w * vertex_worldspace;                                             
                        float distance_to_light = length( surface_to_light_vector );
        
                        vec3 L = normalize( surface_to_light_vector );
                        vec3 H = normalize( L + E );
                        // Compute the diffuse and specular components from the Phong
                        // Reflection Model, using Blinn's "halfway vector" method:
                        float diffuse  =      max( dot( N, L ), 0.0 );
                        float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                        float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                        
                        vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                                  + light_colors[i].xyz * specularity * specular;
                        result += attenuation * light_contribution;
                      }
                    return result;
                  } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
                attribute vec3 position, normal;           
                attribute vec4 color; 
                // attribute float localTime; 
                                 
                // Position is expressed in object coordinates.
                uniform mat4 model_transform;
                uniform mat4 projection_camera_model_transform;
                
                // float velocity = 3; 

                float random(vec2 v_vector) {
                  return fract(sin(dot(v_vector, vec2(12.9898, 78.233))) * 43758.5453);
                }
                void main(){                                                                   
                    // The vertex's final resting place (in NDCS):
                    
                    // Need normal vector to tell triangles which way they should explode 
                    normalvector_worldspace = normal; 
                    
                    vec4 offset = vec4(position, 1.0);
                    float explosionSpeed = 1.0;
                    offset.xyz += normal * explosionSpeed * localTime;

                    // gl_Position = projection_camera_model_transform * vec4( position, 1.0 ) * offset;
                    gl_Position = projection_camera_model_transform *  model_transform * offset; 
                    
                    // The final normal vector in screen space.
                    N = normalize( mat3( model_transform ) * normal / squared_scale);
                    vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                     
                  } 
                
                
                  
                  `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `

                void main(){                                                           
                    // Compute an initial (ambient) color:
                    gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                    // Compute the final color with contributions from lights:
                    gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                    
                    // gl_FragColor = vec4(normalvector_worldspace, 1.0); // For debugging purposes so it's easier to see the triangles from the explosion 
                  } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);

        if(material.hasOwnProperty('localTime')) {
            gl.uniform1f(gpu.localTime, material.localTime);
            let time = material.localTime;
            console.log("[SHADER] Snowball's localTime is " + time);
            // gl.vertexAttrib1f(gpu.localTime, material.localTime);
            //
            // gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0);
            // gpu.shader_attributes.localTime = time;
        }
        else {
            console.log("[SHADER] has no localTime variable");
        }

    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));

        // Debugging
        console.log(gpu);

    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40, localTime: 0.0};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}



// export class Particle_Shader extends defs.Phong_Shader {
//     // **Basic_Shader** is nearly the simplest example of a subclass of Shader, which stores and
//     // maanges a GPU program.  Basic_Shader is a trivial pass-through shader that applies a
//     // shape's matrices and then simply samples literal colors stored at each vertex.
//     update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
//         // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
//         const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
//             PCM = P.times(C).times(M);
//         context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
//             Matrix.flatten_2D_to_1D(PCM.transposed()));
//     }
//
//     shared_glsl_code() {
//         // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
//         return `precision mediump float;
//                 varying vec4 VERTEX_COLOR;
//             `;
//     }
//
//     vertex_glsl_code() {
//         // ********* VERTEX SHADER *********
//         return this.shared_glsl_code() + `
//                 attribute vec4 color;
//                 attribute vec3 position;
//                 // Position is expressed in object coordinates.
//                 uniform mat4 projection_camera_model_transform;
//
//                 varying vec3 particle_position;
//                 void main(){
//                     // Compute the vertex's final resting place (in NDCS), and use the hard-coded color of the vertex:
//                     // gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
//                     VERTEX_COLOR = color;
//
//                      local_time = time - starting_time;
//                       current_position = start_position +
//                          velocity * local_time +
//                          acceleration * local_time * local_time;
//                     particle_position = vec3(current_position, current_position, current_position); //flies out equally in all 3 dimensions
//
//                     gl_Position = projection_camera_model_transform * vec4( particle_position, 1.0 );
//                 }`;
//     }
//
//     fragment_glsl_code() {
//         // ********* FRAGMENT SHADER *********
//         return this.shared_glsl_code() + `
//                 void main(){
//                     // The interpolation gets done directly on the per-vertex colors:
//                     gl_FragColor = VERTEX_COLOR;
//                 }`;
//     }
// }