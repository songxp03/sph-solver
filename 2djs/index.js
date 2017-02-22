const simulateAll = document.getElementById('simulateAll');
const stepper = document.getElementById('stepper');
const canvas = document.getElementById('display');
const ctx = canvas.getContext('2d');

const particles = [];

/* Simulation Constants */
const timestep = 1/60;
const solverIterations = 10;
const restDensity = 1000;
const particleMass = 1;
const kernelRadius = 0.1;
const epsilon = 500;

const numParticles = 50;

/* Physical constraints and constants */
const gravity = vec2.fromValues(0, 9.8);

const initializeParticles = () => {
    for(let i = 0; i < numParticles; i++){
        particles.push({
            pos: vec2.fromValues(Math.random(), Math.random()),
            vel: vec2.fromValues(0, 0),
            newPos: vec2.fromValues(0, 0),
            deltaP: vec2.fromValues(0, 0),
            neighbours: [],
            lambda: 0,
            density: 0,
        });
    }
}

/* Applies the poly6 kernel*/
const poly6 = (p1, p2) => {
    const r = vec2.create();
    vec2.sub(r, p1, p2);

    const result = 315.0 / (64.0 * Math.PI * Math.pow(kernelRadius, 9)) * Math.pow( kernelRadius * kernelRadius - vec2.len(r) * vec2.len(r), 3);
    return result;
}

/* Returns the gradient of the spiky kernel */
const spiky = (p1, p2) => {
    const r = vec2.create();
    vec2.sub(r, p1, p2);

    if( vec2.len(r) > kernelRadius || vec2.len(r) === 0){
        return vec2.fromValues(0, 0);
    }

    const result = -45.0 / (Math.PI * Math.pow(kernelRadius, 6)) * Math.pow( kernelRadius * kernelRadius - vec2.len(r) * vec2.len(r), 2) * 1 / ( vec2.len(r));
    
    vec2.scale(r, r, result);
    console.assert(isFinite(result), "spiky not finite");
    return r;
}

const predictPositions = () => {
    particles.forEach((p1) => {
        vec2.scaleAndAdd(p1.vel, p1.vel, gravity, timestep);
        vec2.scaleAndAdd(p1.newPos, p1.pos, p1.vel, timestep);
    });
}

const updateNeighbours = () => {
    particles.forEach((p1) => {
        const neighbours = [];
        particles.forEach((p2) => {
            const r = vec2.create();
            vec2.sub(r, p1.newPos, p2.newPos);
            if( vec2.len(r) > 0 && vec2.len(r) < kernelRadius){
                neighbours.push(p2);
            }
        });
        p1.neighbours = neighbours;
    });
}

const calculateDensities = () => {
    particles.forEach((p1) => {
        let rhoSum = 0;
        p1.neighbours.forEach((p2) => {
            rhoSum += poly6(p1.newPos, p2.newPos); 
        });
        p1.density = rhoSum;
    });
}

const calculateLambda = () => {
    particles.forEach((p1) => {
        const constraint = p1.density / restDensity - 1;

        let gradientSum = 0;
        let gradientKI = vec2.create();

        /* Sum up gradient norms for the denominator */
        p1.neighbours.forEach((p2) => {
            const gradient = spiky(p1.newPos, p2.newPos);
            vec2.scale(gradient, gradient, 1 / restDensity);

            gradientSum += vec2.len(gradient) * vec2.len(gradient);

            vec2.add(gradientKI, gradientKI, gradient);
        });

        gradientSum += vec2.len(gradientKI) * vec2.len(gradientKI);

        p1.lambda = - constraint / (gradientSum + epsilon);
    });
}

const calculateDeltaP = () => {
    particles.forEach((p1) => {
        let lambdaSum = vec2.fromValues(0, 0);
        p1.neighbours.forEach((p2) => {
            const gradient = spiky(p1.newPos, p2.newPos);

            vec2.scaleAndAdd(lambdaSum, lambdaSum, gradient, p1.lambda + p2.lambda);
        });
        vec2.scale(p1.deltaP, lambdaSum, 1 / restDensity );
    });
};

const adjustDeltaP = () => {
    particles.forEach((p1) => {
        vec2.add(p1.newPos, p1.newPos, p1.deltaP);
    });
};

const updatePosition = () => {
    particles.forEach((p1) => {
        p1.pos = p1.newPos;
    });
};

const constrainParticles = () => {
     particles.forEach((p1) => {
         //console.log(p1.pos);
         if(p1.pos[0] > 1){
             p1.newPos[0] =  1 - 0.001 * Math.random();
         }
         if(p1.pos[0] < 0){
             p1.newPos[0] =  0.001 * Math.random();
         }
         if(p1.pos[1] < 0){
             p1.newPos[1] = 0.001 * Math.random();
         }
         if(p1.pos[1] > 1){
             p1.newPos[1] =  1 - 0.001 * Math.random();
         }
     });
};

const render = () => {
    ctx.clearRect(0, 0, 600, 600);
    particles.forEach((p1) => {
        //console.log(p1.pos.x);
        ctx.beginPath();
        ctx.arc(p1.pos[0] * 500, p1.pos[1] * 500 , 2, 0, 2*Math.PI);
        ctx.stroke();
        ctx.fill();
    });
}

const simulate = () => {
    predictPositions();
    updateNeighbours();
    for(let i = 0; i < solverIterations; i++){
        calculateDensities();
        calculateLambda();
        calculateDeltaP();
        adjustDeltaP();
        constrainParticles();
    }
    updatePosition();
}

simulateAll.onclick = () => {
    console.log('simulation step complete');
    simulate();
    render();
    window.setTimeout(() => simulateAll.onclick(), 500);
}

stepper.onclick = () => {
    simulate();
    render();
}

/* Initial render*/
initializeParticles();
render();