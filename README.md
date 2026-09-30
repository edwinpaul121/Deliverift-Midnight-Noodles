# Midnight Noodles

A late-shift noodle delivery game set in the city of Han. Drive a hot tray
across town before it goes cold, drift for the money, and take the mountain
road up to Fox Mountain when you want to stop working and set a lap time.

Made the game just as a project to test out threejs and also have something I
could link to on my site to casually play. Enjoyed the idea of a delivery game
where you can just drift around town, so decided to make one for some practice.

Built with [three.js](https://threejs.org). No engine, no build framework, no
runtime dependencies beyond three.js itself: the city, the road surfaces, the
buildings and every texture are generated in code when the page loads.

This code was built with the assistance of AI so do keep in mind the faults.

![gameplay](docs/screenshot.png)

## Requirements
- Node18 or newer
- Browser with WebGL2

## Playing

- **WASD / arrows** drive · **Space** handbrake · **Shift** clutch
- **E / Q** shift up and down · **N** nitrous · **B** look behind
- **F** pick up a tray at the shop · **G** garage · **M** map · **C** camera
- **R** recover the car to the nearest road · **Esc** pause

Deliveries pay by how hot the noodles still are; drifting pays on top and is
the faster route up the ranks. Fifty clean deliveries reaches the top rank, and
the last one is always to the viewpoint at the summit.

## Running it locally

```bash
npm install      # fetches three.js, which the build copies into dist/vendor
npm run build    # writes dist/
npm run dev      # builds, then serves dist/ at http://localhost:5173
npm test         # the test suite: physics, geometry, progression, timing
```

Game has a base car build that runs in case of load failure or non-existing models of vehicles. Make sure [public/models](public/models) contains glb files of the cars.

## Layout

```
src/01-world.js   terrain, roads, textures, the mountain and the circuit
src/02-city.js    buildings, props, instancing, delivery destinations
src/03-cars.js    the car roster, physics, gearbox, audio, model adapter
src/04-game.js    jobs, progression, HUD, garage, lap timing, main loop
src/shell.html    the page, its stylesheet and the UI markup
build.mjs         assembles src/ into a deployable dist/
tests/            a headless suite that runs the real game code
deploy/           header and host configuration
docs/             deployment, embedding and contribution notes
```

The four source files are loaded in order and share one scope, which is why
they are numbered.

## Tests

`npm test` runs over 130 checks against the real game code with a stubbed
renderer: gearing and acceleration for every car, drift behaviour, road and
terrain geometry, delivery placement, career length, and the lap timer's rules.
It needs no browser and takes a few seconds.

`checks/` holds scripts that additionally need the real three.js and the model
files — mesh orientation, model fitting, garage options.

## Licence and credits

Code is MIT (see [LICENSE](LICENSE)). **The 3D models are not mine and carry
their own licences — read [CREDITS.md](CREDITS.md).** 
