# Credits and third-party licences

The code in this repository is MIT licensed (see LICENSE). **The 3D models are
not.** They came from elsewhere and each carries its own licence.

## Software

| Component | Version | Licence | Notes |
|---|---|---|---|
| [three.js](https://threejs.org) | r128 | MIT | Rendering. Copied into `dist/vendor/` at build time. |
| three.js `GLTFLoader`, `DRACOLoader` | r128 | MIT | Part of the three.js examples. |

three.js is MIT, which requires the copyright notice be preserved — keeping the
unmodified library files in `dist/vendor/` satisfies that.

## 3D models — ACTION REQUIRED

| File | Model | Author | Source | Licence |
|---|---|---|---|---|
| `car-kestrel-1600.glb` | Toyota Corolla AE86 Trueno | Lexyc16 | [skfb.ly/o8CNI](https://skfb.ly/o8CNI) | CC BY 4.0 |
| `car-sable-200.glb` | Nissan Silvia S13 [Updated] | Lexyc16 | Sketchfab | CC BY-NC 4.0 |
| `car-meridian-sprint.glb` | Honda NSX 1990 | Lexyc16 | [skfb.ly/6WFwI](https://skfb.ly/6WFwI) | CC BY 4.0 |
| `car-talon-rally.glb` | 2006 Mitsubishi Lancer Evolution IX MR | Ddiaz Design | Sketchfab | CC BY-NC-SA 4.0 |
| `car-corsair-r3.glb` | Mazda RX-7 FD | Lexyc16 | [skfb.ly/6SKZr](https://skfb.ly/6SKZr) | CC BY 4.0 |
| `car-vanguard-gtx.glb` | Nissan Skyline (R32) GT-R | Lexyc16 | [Sketchfab](https://sketchfab.com/3d-models/nissan-skyline-r32-gt-r-8810e677eca543a6b840cf67dd064aa4) | CC BY-NC 4.0 |
| `car-sable-250.glb` | 2002 Nissan Silvia S15 Spec R Aero | Ddiaz Design | [skfb.ly/pA6yn](https://skfb.ly/pA6yn) | CC BY-NC-SA 4.0 |
| `car-vanguard-gtx-ii.glb` | Nissan Skyline R34 GT-R | Lexyc16 | [skfb.ly/6TxFX](https://skfb.ly/6TxFX) | CC BY 4.0 |
| `car-vanguard-apex.glb` | 2017 Nissan Aimgain GT R35 GT-R Type 2 | Outlaw Games | [skfb.ly/p9KQu](https://skfb.ly/p9KQu) | CC BY-NC 4.0 |
| `car-halcyon-v10.glb` | 2012 Lexus LFA Nurburgring Package | Ddiaz Design | [skfb.ly/prwLy](https://skfb.ly/prwLy) | CC BY-NC-SA 4.0 |
| `roads-tileset.glb` | Roads&Bridges - Tileset pack | (https://skfb.ly/6T8oD) by MRowa is licensed under Creative Commons Attribution-ShareAlike (http://creativecommons.org/licenses/by-sa/4.0/).

Licence texts: [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) ·
[CC BY-NC 4.0](http://creativecommons.org/licenses/by-nc/4.0/) ·
[CC BY-NC-SA 4.0](http://creativecommons.org/licenses/by-nc-sa/4.0/)


## What these licences mean for this project

**Six of the ten cars are NonCommercial.** The game will stay free: no
advertising, no sponsorship, no payment, no promoting a business with it. This
is the constraint that decides how the site can be run.

**Three are also ShareAlike** (the S15, the Evo and the LFA). ShareAlike bites
on *adaptations* of those files. Publishing a compressed or simplified version
of one — which is what `gltf-transform` produces, and what the deployment guide
recommends for page weight — means publishing that modified file under CC
BY-NC-SA 4.0 as well. It does not make the game's own code ShareAlike; the code
is not an adaptation of a car model.

**All ten require attribution**, which is why the credits panel exists and why
it shows each model's own title, its author and its licence.

### The game has a credits panel — fill it in

Pause the game and press **Credits**. It is built from the `MODEL_CREDITS`
table at the top of `src/03-cars.js`, one row per model file:

```js
{ file: 'car-sable-250.glb', subject: 'Sable 250 Fox',
  artist: 'Name as given on the download page',
  licence: 'CC BY 4.0',
  url: 'https://sketchfab.com/3d-models/...' },
```


## Fonts and everything else

All textures, road surfaces, buildings, trees and UI art are generated in code
at load time — there are no third-party image or font files to license.
