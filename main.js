'use strict';

let gl;                         // WebGL context
let surface;                    // Surface model
let shProgram;                  // Shader program
let spaceball;                  // TrackballRotator for rotating the view

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// Model constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        this.count = vertices.length / 3;
    };

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    };
}

// ShaderProgram constructor
function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;

    this.iAttribVertex = -1;
    this.iColor = -1;
    this.iModelViewProjectionMatrix = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    };
}

// Draw function
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.perspective(Math.PI / 8, 1, 8, 50);
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -40);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    let modelViewProjection = m4.multiply(projection, matAccum1);
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    // Рендер поверхні
    gl.uniform4fv(shProgram.iColor, [0.8, 0.4, 0.2, 1]);
    surface.Draw();

    // Рендер u-лінії (червона)
    gl.uniform4fv(shProgram.iColor, [1.0, 0.0, 0.0, 1.0]);
    uDirectionLine.Draw();

    // Рендер v-лінії (синя)
    gl.uniform4fv(shProgram.iColor, [0.0, 0.0, 1.0, 1.0]);
    vDirectionLine.Draw();
}


// Generate Richmond's Minimal Surface data
function CreateSurfaceData() {
    const vertexList = [];
    const uMin = -2.0;
    const uMax = 2.0;
    const vMin = -2.0;
    const vMax = 2.0;
    const uStep = (uMax - uMin) / 100;
    const vStep = (vMax - vMin) / 100;

    // Generate horizontal lines
    for (let v = vMin; v <= vMax; v += vStep) {
        for (let u = uMin; u < uMax; u += uStep) {
            const x1 = (1 / 3) * Math.pow(u, 3) - u * Math.pow(v, 2) + u / (u * u + v * v);
            const y1 = -Math.pow(u, 2) * v + (1 / 3) * Math.pow(v, 3) - v / (u * u + v * v);
            const z1 = 2 * u;

            const x2 = (1 / 3) * Math.pow(u + uStep, 3) - (u + uStep) * Math.pow(v, 2) + (u + uStep) / ((u + uStep) * (u + uStep) + v * v);
            const y2 = -Math.pow(u + uStep, 2) * v + (1 / 3) * Math.pow(v, 3) - v / ((u + uStep) * (u + uStep) + v * v);
            const z2 = 2 * (u + uStep);

            vertexList.push(x1, y1, z1, x2, y2, z2);
        }
    }

    // Generate vertical lines
    for (let u = uMin; u <= uMax; u += uStep) {
        for (let v = vMin; v < vMax; v += vStep) {
            const x1 = (1 / 3) * Math.pow(u, 3) - u * Math.pow(v, 2) + u / (u * u + v * v);
            const y1 = -Math.pow(u, 2) * v + (1 / 3) * Math.pow(v, 3) - v / (u * u + v * v);
            const z1 = 2 * u;

            const x2 = (1 / 3) * Math.pow(u, 3) - u * Math.pow(v + vStep, 2) + u / (u * u + (v + vStep) * (v + vStep));
            const y2 = -Math.pow(u, 2) * (v + vStep) + (1 / 3) * Math.pow(v + vStep, 3) - (v + vStep) / (u * u + (v + vStep) * (v + vStep));
            const z2 = 2 * u;

            vertexList.push(x1, y1, z1, x2, y2, z2);
        }
    }

    return vertexList;
}

function CreateDirectionLines() {
    const arrowVertices = {
        u: [], // Вершини для напряму u
        v: []  // Вершини для напряму v
    };
    const scale = 10.0; // Масштаб довжини стрілки

    // Початкова точка на поверхні
    const x = 0;
    const y = 0;
    const z = 0;

    // Додати стрілку для напряму u (червона)
    arrowVertices.u.push(x, y, z, x + scale, y, z);

    // Додати стрілку для напряму v (синя)
    arrowVertices.v.push(x, y, z, x, y + scale, z);

    return arrowVertices;
}

let uDirectionLine;
let vDirectionLine;

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, 'vertex');
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, 'ModelViewProjectionMatrix');
    shProgram.iColor = gl.getUniformLocation(prog, 'color');

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());

    const directionLines = CreateDirectionLines();

    uDirectionLine = new Model('uDirectionLine');
    uDirectionLine.BufferData(directionLines.u);

    vDirectionLine = new Model('vDirectionLine');
    vDirectionLine.BufferData(directionLines.v);

    gl.enable(gl.DEPTH_TEST);
}



// Create shader program
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error('Error in vertex shader: ' + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error('Error in fragment shader: ' + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error('Link error in program: ' + gl.getProgramInfoLog(prog));
    }
    return prog;
}

// Initialization function
function init() {
    let canvas;
    try {
        canvas = document.getElementById('webglcanvas');
        gl = canvas.getContext('webgl');
        if (!gl) {
            throw 'Browser does not support WebGL';
        }
    } catch (e) {
        document.getElementById('canvas-holder').innerHTML =
            '<p>Sorry, could not get a WebGL graphics context.</p>';
        return;
    }
    try {
        initGL();
    } catch (e) {
        document.getElementById('canvas-holder').innerHTML =
            '<p>Sorry, could not initialize the WebGL graphics context: ' + e + '</p>';
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}