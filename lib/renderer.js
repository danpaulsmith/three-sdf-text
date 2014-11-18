var createText = require('gl-sprite-text')
var mat4 = require('gl-mat4')

var modelTransform = mat4.create()
var flip = mat4.create()
mat4.scale(flip, flip, [1, -1, 1])

var WrapTexture = require('./texture-wrap')
var number = require('as-number')
var xtend = require('xtend')

var glslify = require('glslify')
var sdfShader = glslify({
    vertex: './shader/sdf.vert',
    fragment: './shader/sdf.frag'
})

function copyColor(out, color, opacity) {
    out[0] = color.r
    out[1] = color.g 
    out[2] = color.b 
    out[3] = opacity
}

module.exports = function(THREE) {
    function TextRenderer(renderer, opt) {
        if (!(this instanceof TextRenderer))
            return new TextRenderer(renderer, opt)
        opt=opt||{}

        var gl = renderer.getContext()
        this.gl = gl
        this.color = new THREE.Color()
        if (opt.color !== null && typeof opt.color !== 'undefined')
            this.color.set(opt.color)
        this.opacity = number(opt.opacity, 1.0)

        //if no textures are given, presume they are base64 packed
        //into the Font object (like with bmfont-lato)
        var textOpts = xtend(opt)
        if (textOpts.textures) {
            textOpts.textures = textOpts.textures.map(function(tex) {
                // return require('gl-texture2d')(gl, tex.image)
                if (tex instanceof THREE.Texture)
                    return WrapTexture(renderer, tex)
                return tex
            })
        }
        
        this.element = createText(gl, textOpts)
        this.transform = mat4.create()

        this.shader = sdfShader(gl)
        this.shader.bind()

        this.padding = number(opt.padding, 0)

        var s = number(opt.smoothing, 1.0/32.0)
        this.shader.uniforms.smoothing = s
        this.shader.uniforms.texture0 = 0
    }

    TextRenderer.prototype.begin = function() {
        var gl = this.gl

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        // gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)

        gl.frontFace( gl.CCW )    
        gl.disable(gl.CULL_FACE)
        gl.cullFace( gl.FRONT )
        gl.colorMask(true, true, true, true)
        gl.disable(gl.STENCIL_TEST)
        gl.activeTexture(gl.TEXTURE0)
        gl.depthMask(true)
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        this.shader.bind()
        
        // var tex = this.element.textures[0]
        // tex.bind(0)
    }

    TextRenderer.prototype.end = function() {
        var gl = this.gl
        
        gl.enable(gl.CULL_FACE)
        gl.cullFace( gl.BACK )
    }

    TextRenderer.prototype.draw = function(camera, object) {
        var gl = this.gl

        if (!object.visible)
            return

        if (!this.element.textures 
                || this.element.textures.length === 0
                || typeof this.element.textures[0].bind !== 'function')
            return

        this.element.textures[0].bind(0)
        this.shader.uniforms.fade = this.fade


        // gl.colorMask(true, true, true, true)

        // gl.cullFace(gl.FRONT)

        mat4.multiply(modelTransform, object.matrix.elements, this.transform)
        mat4.multiply(modelTransform, modelTransform, flip)

        this.shader.bind()
        this.shader.uniforms.projection = camera.projectionMatrix.elements
        this.shader.uniforms.view = camera.matrixWorldInverse.elements

        this.shader.uniforms.model = modelTransform
            
        copyColor(this.element.batch.color, this.color, this.opacity)
        this.element.draw(this.shader, this.padding, this.padding)
    }


    return TextRenderer
}