precision mediump float;

uniform vec3 uLightPosition;
uniform vec3 uCameraPosition;
uniform sampler2D uTexture;

varying vec2 vTexcoords;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main(void) {
    // calculating direction from the current world space position to the light point (normalized)
    vec3 lightToWorldSpace = normalize(uLightPosition - vWorldPosition);

    // diffuse contribution
    // normalize the light direction and store in a separate variable
    vec3 normalLightPosition = normalize(lightToWorldSpace);
    // normalize the world normal and store in a separate variable
    vec3 normalWorld = normalize(vWorldNormal);
    // calculate the lambert term
    float lambertTerm = max(dot(normalLightPosition, normalWorld), 0.0);

    vec3 albedo = texture2D(uTexture, vTexcoords).rgb;

    vec3 diffuseColor = albedo * lambertTerm;

    gl_FragColor = vec4(diffuseColor, 1.0);
}

// EOF 00100001-10