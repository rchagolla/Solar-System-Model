'use strict'

var gl;

var appInput = new Input();
var time = new Time();
var camera = new OrbitCamera(appInput);

var groundSkyboxGeometry = null;
var topSkyboxGeometry = null;
var leftSkyboxGeometry = null;
var rightSkyboxGeometry = null;
var backSkyboxGeometry = null;
var frontSkyboxGeometry = null;
var barrelGeometry = null;
var sunGeometry = null;
var mercuryGeometry = null;
var venusGeometry = null;
var earthGeometry = null;
var moonGeometry = null;
var marsGeometry = null;
var jupiterGeometry = null;
var saturnGeometry = null;
var uranusGeometry = null;
var neptuneGeometry = null;
var skyboxDistance = 100.0;

var PlanetVariables = {
    sunScale: 0.05, sunRotationAngle: 60.0,
    mercuryScale: 0.007, mercuryRotationAngle: 45.0,
    venusScale: 0.01, venusRotationAngle: 35.0,
    earthScale: 0.01, earthRotationAngle: 25.0,
    moonScale: 0.006, moonRotationAngle: 0,
    marsScale: 0.007, marsRotationAngle: 20.0,
    jupiterScale: 0.013, jupiterRotationAngle: 15.0,
    saturnScale: 0.011, saturnRotationAngle: 10.0,
    uranusScale: 0.011, uranusRotationAngle: 8.0,
    neptuneScale: 0.011, neptuneRotationAngle: 5.0,
};

var projectionMatrix = new Matrix4();
var lightPosition = new Vector4(0, 0, 0, 0);

// the shader that will be used by each piece of geometry (they could each use their own shader but in this case it will be the same)
var phongShaderProgram;
var sunShaderProgram;

// auto start the app when the html page is ready
window.onload = window['initializeAndStartRendering'];

// we need to asynchronously fetch files from the "server" (your local hard drive)
var loadedAssets = {
    phongTextVS: null, phongTextFS: null,
    sphereJSON: null,
    sunImage: null,
    sunVS: null,
    sunFS: null,
    NegativeXSkybox: null, PositiveXSkybox: null,
    NegativeYSkybox: null, PositiveYSkybox: null,
    NegativeZSkybox: null, PositiveZSkybox: null,
    mercuryImage: null, venusImage: null,
    earthImage: null, moonImage: null,
    marsImage: null, jupiterImage: null,
    saturnImage: null, uranusImage: null,
    neptuneImage: null
};

// -------------------------------------------------------------------------
function initializeAndStartRendering() {
    initGL();
    loadAssets(function() {
        createShaders(loadedAssets);
        createScene();

        updateAndRender();
    });
}

// -------------------------------------------------------------------------
function initGL(canvas) {
    var canvas = document.getElementById("webgl-canvas");

    try {
        gl = canvas.getContext("webgl");
        gl.canvasWidth = canvas.width;
        gl.canvasHeight = canvas.height;

        gl.enable(gl.DEPTH_TEST);
    } catch (e) {}

    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

// -------------------------------------------------------------------------
function loadAssets(onLoadedCB) {
    var filePromises = [
        fetch('./shaders/phong.vs.glsl').then((response) => { return response.text(); }), // 0
        fetch('./shaders/phong.pointlit.fs.glsl').then((response) => { return response.text(); }), // 1
        fetch('./data/sphere.json').then((response) => { return response.json(); }), // 2
        loadImage('./data/sun.jpg'), // 3
        fetch('./shaders/sun.vs.glsl').then((response) => { return response.text(); }), // 4
        fetch('./shaders/sun.fs.glsl').then((response) => { return response.text(); }), // 5
        loadImage('./data/GalaxyTex_NegativeX.png'), // 6
        loadImage('./data/GalaxyTex_PositiveX.png'), // 7
        loadImage('./data/GalaxyTex_NegativeY.png'), // 8
        loadImage('./data/GalaxyTex_PositiveY.png'), // 9
        loadImage('./data/GalaxyTex_NegativeZ.png'), // 10
        loadImage('./data/GalaxyTex_PositiveZ.png'), // 11
        loadImage('./data/earth.jpg'), // 12
        loadImage('./data/moon.png'), // 13
        loadImage('./data/mercury.jpg'), // 14
        loadImage('./data/venusAt.jpg'), // 15
        loadImage('./data/mars.jpg'), // 16
        loadImage('./data/jupiter.jpg'), // 17
        loadImage('./data/saturn.jpg'), // 18
        loadImage('./data/uranus.jpg'), // 19
        loadImage('./data/neptune.jpg') // 20
    ];

    Promise.all(filePromises).then(function(values) {
        // Assign loaded data to our named variables
        loadedAssets.phongTextVS = values[0];
        loadedAssets.phongTextFS = values[1];
        loadedAssets.sphereJSON = values[2];
        loadedAssets.sunImage = values[3];
        loadedAssets.sunVS = values[4];
        loadedAssets.sunFS = values[5];
        loadedAssets.NegativeXSkybox = values[6];
        loadedAssets.PositiveXSkybox = values[7];
        loadedAssets.NegativeYSkybox = values[8];
        loadedAssets.PositiveYSkybox = values[9];
        loadedAssets.NegativeZSkybox = values[10];
        loadedAssets.PositiveZSkybox = values[11];
        loadedAssets.earthImage = values[12];
        loadedAssets.moonImage = values[13];
        loadedAssets.mercuryImage = values[14];
        loadedAssets.venusImage = values[15];
        loadedAssets.marsImage = values[16];
        loadedAssets.jupiterImage = values[17];
        loadedAssets.saturnImage = values[18];
        loadedAssets.uranusImage = values[19];
        loadedAssets.neptuneImage = values[20];
    }).catch(function(error) {
        console.error(error.message);
    }).finally(function() {
        onLoadedCB();
    });
}

// -------------------------------------------------------------------------
function createShaders(loadedAssets) {
    phongShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.phongTextVS, loadedAssets.phongTextFS);

    phongShaderProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(phongShaderProgram, "aVertexPosition"),
        vertexNormalsAttribute: gl.getAttribLocation(phongShaderProgram, "aNormal"),
        vertexTexcoordsAttribute: gl.getAttribLocation(phongShaderProgram, "aTexcoords")
    };

    phongShaderProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uProjectionMatrix"),
        lightPositionUniform: gl.getUniformLocation(phongShaderProgram, "uLightPosition"),
        cameraPositionUniform: gl.getUniformLocation(phongShaderProgram, "uCameraPosition"),
        textureUniform: gl.getUniformLocation(phongShaderProgram, "uTexture"),
    };

    sunShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.sunVS, loadedAssets.sunFS);

    sunShaderProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(sunShaderProgram, "aVertexPosition"),
        vertexNormalsAttribute: gl.getAttribLocation(sunShaderProgram, "aNormal"),
        vertexTexcoordsAttribute: gl.getAttribLocation(sunShaderProgram, "aTexcoords")
    };

    sunShaderProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(sunShaderProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(sunShaderProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation( sunShaderProgram, "uProjectionMatrix"),
        lightPositionUniform: gl.getUniformLocation( sunShaderProgram, "uLightPosition"),
        cameraPositionUniform: gl.getUniformLocation(sunShaderProgram, "uCameraPosition"),
        textureUniform: gl.getUniformLocation(sunShaderProgram, "uTexture"),
    };
}

// -------------------------------------------------------------------------
function createScene() {
    // adding textures to skybox sides
    // bottom
    groundSkyboxGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    groundSkyboxGeometry.create(loadedAssets.NegativeYSkybox);

    // top
    topSkyboxGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    topSkyboxGeometry.create(loadedAssets.PositiveYSkybox);

    // left
    leftSkyboxGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    leftSkyboxGeometry.create(loadedAssets.NegativeXSkybox);

    // right
    rightSkyboxGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    rightSkyboxGeometry.create(loadedAssets.PositiveXSkybox);

    // back
    backSkyboxGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    backSkyboxGeometry.create(loadedAssets.PositiveZSkybox);

    // front
    frontSkyboxGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    frontSkyboxGeometry.create(loadedAssets.NegativeZSkybox);

    //adding textures to planets/sun
    // sun
    sunGeometry = new WebGLGeometryJSON(gl, sunShaderProgram);
    sunGeometry.create(loadedAssets.sphereJSON, loadedAssets.sunImage);

    // mercury
    mercuryGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    mercuryGeometry.create(loadedAssets.sphereJSON, loadedAssets.mercuryImage);

    // venus
    venusGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    venusGeometry.create(loadedAssets.sphereJSON, loadedAssets.venusImage);

    // earth
    earthGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    earthGeometry.create(loadedAssets.sphereJSON, loadedAssets.earthImage);

    // moon
    moonGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    moonGeometry.create(loadedAssets.sphereJSON, loadedAssets.moonImage);

    // mars
    marsGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    marsGeometry.create(loadedAssets.sphereJSON, loadedAssets.marsImage);

    // jupiter
    jupiterGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    jupiterGeometry.create(loadedAssets.sphereJSON, loadedAssets.jupiterImage);

    // saturn
    saturnGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    saturnGeometry.create(loadedAssets.sphereJSON, loadedAssets.saturnImage);
    
    // uranus
    uranusGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    uranusGeometry.create(loadedAssets.sphereJSON, loadedAssets.uranusImage);

    // neptune
    neptuneGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    neptuneGeometry.create(loadedAssets.sphereJSON, loadedAssets.neptuneImage);

    // moving skybox sides to proper position
    var scale = new Matrix4().makeScale(skyboxDistance, skyboxDistance, skyboxDistance);

    // compensate for the model being flipped on its side
    var rotation = new Matrix4().makeRotationX(-90);

    // creating and adjusting planes for skybox
    // bottom
    groundSkyboxGeometry.worldMatrix.makeIdentity();
    var transform = new Matrix4().makeTranslation(0, -skyboxDistance, 0);
    groundSkyboxGeometry.worldMatrix.multiply(transform).multiply(rotation).multiply(scale);

    // top
    topSkyboxGeometry.worldMatrix.makeIdentity();
    transform = new Matrix4().makeTranslation(0, skyboxDistance, 0);
    rotation = new Matrix4().makeRotationX(90);
    topSkyboxGeometry.worldMatrix.multiply(transform).multiply(rotation).multiply(scale);

    // left
    leftSkyboxGeometry.worldMatrix.makeIdentity();
    transform = new Matrix4().makeTranslation(-skyboxDistance, 0, 0);
    rotation = new Matrix4().makeRotationY(90);
    leftSkyboxGeometry.worldMatrix.multiply(transform).multiply(rotation).multiply(scale);

    // right
    rightSkyboxGeometry.worldMatrix.makeIdentity();
    transform = new Matrix4().makeTranslation(skyboxDistance, 0, 0);
    rotation = new Matrix4().makeRotationY(-90);
    rightSkyboxGeometry.worldMatrix.multiply(transform).multiply(rotation).multiply(scale);

    // back
    backSkyboxGeometry.worldMatrix.makeIdentity();
    transform = new Matrix4().makeTranslation(0, 0, -skyboxDistance);
    backSkyboxGeometry.worldMatrix.multiply(transform).multiply(scale);

    // front
    frontSkyboxGeometry.worldMatrix.makeIdentity();
    transform = new Matrix4().makeTranslation(0, 0, skyboxDistance);
    rotation = new Matrix4().makeRotationY(180);
    frontSkyboxGeometry.worldMatrix.multiply(transform).multiply(rotation).multiply(scale);

    // sun transformation
    var scale = new Matrix4().makeScale(PlanetVariables.sunScale, PlanetVariables.sunScale, PlanetVariables.sunScale);
    sunGeometry.worldMatrix.makeIdentity().multiply(scale);

    // mercury transformation
    scale = new Matrix4().makeScale(PlanetVariables.mercuryScale, PlanetVariables.mercuryScale, PlanetVariables.mercuryScale);
    transform = new Matrix4().makeTranslation(4, 0, 0);
    mercuryGeometry.worldMatrix.makeIdentity().multiply(transform).multiply(scale);

    // venus transformation
    scale = new Matrix4().makeScale(PlanetVariables.venusScale, PlanetVariables.venusScale, PlanetVariables.venusScale);
    transform = new Matrix4().makeTranslation(0, 0, 6);
    venusGeometry.worldMatrix.makeIdentity().multiply(transform).multiply(scale);

    // earth transformation
    scale = new Matrix4().makeScale(PlanetVariables.earthScale, PlanetVariables.earthScale, PlanetVariables.earthScale);
    transform = new Matrix4().makeTranslation(9, 0, 0);
    earthGeometry.worldMatrix.makeIdentity().multiply(transform).multiply(scale);

    // moon transformation
    scale = new Matrix4().makeScale(PlanetVariables.moonScale, PlanetVariables.moonScale, PlanetVariables.moonScale);
    transform = new Matrix4().makeTranslation(10, 0.05, 0);
    moonGeometry.worldMatrix.makeIdentity().multiply(transform).multiply(scale);

    // mars transformation
    scale = new Matrix4().makeScale(PlanetVariables.marsScale, PlanetVariables.marsScale, PlanetVariables.marsScale);
    transform = new Matrix4().makeTranslation(0, 0, -12);
    marsGeometry.worldMatrix.makeIdentity().multiply(transform).multiply(scale);

    // jupiter transformation
    scale = new Matrix4().makeScale(PlanetVariables.jupiterScale, PlanetVariables.jupiterScale, PlanetVariables.jupiterScale);
    transform = new Matrix4().makeTranslation(-14, 0, 0);
    jupiterGeometry.worldMatrix.makeIdentity().multiply(transform).multiply(scale);

    // saturn transformation
    scale = new Matrix4().makeScale(PlanetVariables.saturnScale, PlanetVariables.saturnScale, PlanetVariables.saturnScale);
    transform = new Matrix4().makeTranslation(0, 0, 16);
    saturnGeometry.worldMatrix.makeIdentity().multiply(transform).multiply(scale);

    // uranus transformation
    scale = new Matrix4().makeScale(PlanetVariables.uranusScale, PlanetVariables.uranusScale, PlanetVariables.uranusScale);
    transform = new Matrix4().makeTranslation(18, 0, 0);
    uranusGeometry.worldMatrix.makeIdentity().multiply(transform).multiply(scale);

    // neptune transformation
    scale = new Matrix4().makeScale(PlanetVariables.neptuneScale, PlanetVariables.neptuneScale, PlanetVariables.neptuneScale);
    transform = new Matrix4().makeTranslation(0, 0, -20);
    neptuneGeometry.worldMatrix.makeIdentity().multiply(transform).multiply(scale);
}

// -------------------------------------------------------------------------
function updateAndRender() {
    requestAnimationFrame(updateAndRender);

    var aspectRatio = gl.canvasWidth / gl.canvasHeight;
    var rotationMatrix = new Matrix4().makeRotationY(PlanetVariables.sunRotationAngle * time.deltaTime);
    var planetRoationMatrix = new Matrix4().makeRotationY(25.0 * time.deltaTime);

    // rotate sun around it's y-axis
    sunGeometry.worldMatrix.multiply(rotationMatrix);

    // rotate mercury around it's y-axis
    mercuryGeometry.worldMatrix.multiply(planetRoationMatrix);
    // rotate mecrcury around sun
    rotationMatrix = new Matrix4().makeRotationY(PlanetVariables.mercuryRotationAngle * time.deltaTime);
    mercuryGeometry.worldMatrix = rotationMatrix.multiply(mercuryGeometry.worldMatrix);

    // rotate venus around it's y-axis
    venusGeometry.worldMatrix.multiply(planetRoationMatrix);
    // rotate venus around sun
    rotationMatrix = new Matrix4().makeRotationY(PlanetVariables.venusRotationAngle * time.deltaTime);
    venusGeometry.worldMatrix = rotationMatrix.multiply(venusGeometry.worldMatrix);

    // rotate earth around it's y-axis
    earthGeometry.worldMatrix.multiply(planetRoationMatrix);
    // rotate earth around sun
    rotationMatrix = new Matrix4().makeRotationY(PlanetVariables.earthRotationAngle * time.deltaTime);
    earthGeometry.worldMatrix = rotationMatrix.multiply(earthGeometry.worldMatrix);

    // // rotate moon around it's y-axis
    moonGeometry.worldMatrix.multiply(planetRoationMatrix);
    // rotate moon around earth
    PlanetVariables.moonRotationAngle += 35.0 * time.deltaTime;
    rotationMatrix = new Matrix4().makeRotationY(PlanetVariables.moonRotationAngle);
    // earth offset
    var earthOffsetMatrix = new Matrix4().makeTranslation(1, 0, 0);
    // getting position of earth and making a translation matrix to it
    var earthPos = new Vector3(earthGeometry.worldMatrix.elements[3], earthGeometry.worldMatrix.elements[7], earthGeometry.worldMatrix.elements[11]);
    var earthTranslationMatrix = new Matrix4().makeTranslation(earthPos);
    var scaleMatrix = new Matrix4().makeScale(PlanetVariables.moonScale, PlanetVariables.moonScale, PlanetVariables.moonScale);
    // scaling, rotating, then translating
    moonGeometry.worldMatrix = earthTranslationMatrix.multiply(rotationMatrix).multiply(earthOffsetMatrix).multiply(scaleMatrix);

    // rotate mars around it's y-axis
    marsGeometry.worldMatrix.multiply(planetRoationMatrix);
    // rotate mars around sun
    rotationMatrix = new Matrix4().makeRotationY(PlanetVariables.marsRotationAngle * time.deltaTime);
    marsGeometry.worldMatrix = rotationMatrix.multiply(marsGeometry.worldMatrix);

    // rotate jupiter around it's y-axis
    jupiterGeometry.worldMatrix.multiply(planetRoationMatrix);
    // rotate jupiter around sun
    rotationMatrix = new Matrix4().makeRotationY(PlanetVariables.jupiterRotationAngle * time.deltaTime);
    jupiterGeometry.worldMatrix = rotationMatrix.multiply(jupiterGeometry.worldMatrix);
    
    // rotate saturn around it's y-axis
    saturnGeometry.worldMatrix.multiply(planetRoationMatrix);
    // rotate saturn around sun
    rotationMatrix = new Matrix4().makeRotationY(PlanetVariables.saturnRotationAngle * time.deltaTime);
    saturnGeometry.worldMatrix = rotationMatrix.multiply(saturnGeometry.worldMatrix);

    // rotate uranus around it's y-axis
    uranusGeometry.worldMatrix.multiply(planetRoationMatrix);
    // rotate uranus around sun
    rotationMatrix = new Matrix4().makeRotationY(PlanetVariables.uranusRotationAngle * time.deltaTime);
    uranusGeometry.worldMatrix = rotationMatrix.multiply(uranusGeometry.worldMatrix);

    // rotate neptune around it's y-axis
    neptuneGeometry.worldMatrix.multiply(planetRoationMatrix);
    // rotate neptune around sun
    rotationMatrix = new Matrix4().makeRotationY(PlanetVariables.neptuneRotationAngle * time.deltaTime);
    neptuneGeometry.worldMatrix = rotationMatrix.multiply(neptuneGeometry.worldMatrix);

    time.update();
    camera.update(time.deltaTime);

    // specify what portion of the canvas we want to draw to (all of it, full width and height)
    gl.viewport(0, 0, gl.canvasWidth, gl.canvasHeight);

    // this is a new frame so let's clear out whatever happened last frame
    gl.clearColor(0.707, 0.707, 1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(phongShaderProgram);
    var uniforms = phongShaderProgram.uniforms;
    var cameraPosition = camera.getPosition();
    gl.uniform3f(uniforms.lightPositionUniform, lightPosition.x, lightPosition.y, lightPosition.z);
    gl.uniform3f(uniforms.cameraPositionUniform, cameraPosition.x, cameraPosition.y, cameraPosition.z);

    projectionMatrix.makePerspective(45, aspectRatio, 0.1, 1000);
    groundSkyboxGeometry.render(camera, projectionMatrix, phongShaderProgram);
    topSkyboxGeometry.render(camera, projectionMatrix, phongShaderProgram);
    leftSkyboxGeometry.render(camera, projectionMatrix, phongShaderProgram);
    rightSkyboxGeometry.render(camera, projectionMatrix, phongShaderProgram);
    backSkyboxGeometry.render(camera, projectionMatrix, phongShaderProgram);
    frontSkyboxGeometry.render(camera, projectionMatrix, phongShaderProgram);
    sunGeometry.render(camera, projectionMatrix, sunShaderProgram);
    mercuryGeometry.render(camera, projectionMatrix, phongShaderProgram);
    venusGeometry.render(camera, projectionMatrix, phongShaderProgram);
    earthGeometry.render(camera, projectionMatrix, phongShaderProgram);
    moonGeometry.render(camera, projectionMatrix, phongShaderProgram);
    marsGeometry.render(camera, projectionMatrix, phongShaderProgram);
    jupiterGeometry.render(camera, projectionMatrix, phongShaderProgram);
    saturnGeometry.render(camera, projectionMatrix, phongShaderProgram);
    uranusGeometry.render(camera, projectionMatrix, phongShaderProgram);
    neptuneGeometry.render(camera, projectionMatrix, phongShaderProgram);
}

// EOF 00100001-10