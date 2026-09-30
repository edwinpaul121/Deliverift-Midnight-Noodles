# Credits and third-party licences

The code in this repository is MIT licensed (see LICENSE). **The 3D models are
not.** They came from elsewhere and each carries its own licence. Before this
game goes on the public web, every row of the table below needs filling in from
the page you downloaded the model from.

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
| `roads-tileset.glb` | Roads & bridges tileset pack | **not yet recorded** | ? | ? |

Licence texts: [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) ·
[CC BY-NC 4.0](http://creativecommons.org/licenses/by-nc/4.0/) ·
[CC BY-NC-SA 4.0](http://creativecommons.org/licenses/by-nc-sa/4.0/)

The S13 and Evo links were not supplied; add them in this table and in
`MODEL_CREDITS` when you have them. The road tileset still has no credit at all
— the game flags it in red until it does.

`public/models/sketchfab-license-r32.txt` is the licence file that came with
the R32 download; keep any others you have beside it.

## What these licences mean for this project

**Six of the ten cars are NonCommercial.** The game must stay free: no
advertising, no sponsorship, no payment, no promoting a business with it. This
is the constraint that decides how the site can be run, so it is worth deciding
now rather than after launch.

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

Fill a row and the artist appears in the game with a link to their page. Leave
one blank and the panel says so in red and counts how many are outstanding — a
missing credit is usually a licence breach, so it should be hard to ship
without noticing. The test suite also checks that every model file has a row.

Crediting in the game is the part that matters. Most licences that allow this
kind of use require the author to be named *where people can see the work*; a
line in a repository file that players never open does not satisfy that.

### What to check on each one

1. **Does the licence allow redistribution on a public website?** Creative
   Commons BY does, with credit. CC BY-NC allows it only if your site is
   non-commercial — no ads, no sponsorship, nothing sold. Some marketplace
   licences forbid redistributing the model file itself at all, which is what
   putting a `.glb` on a web server does. "Personal use only" and "editorial
   use only" both mean no.
2. **If credit is required, it has to be visible.** Add each author and licence
   to the in-game credits panel, not only to this file — a player should be
   able to see it without reading the repository.
3. **Check whether the licence requires a link back** to the original page.
4. **Watch for ND and NC.** Searching these filenames turns up models from
   several different artists — the same name has been published many times —
   and at least one prominent one is **CC BY-NC-ND**. NonCommercial rules out
   anything with ads or sales; NoDerivatives is the awkward one, because it
   restricts publishing a modified version, and compressing or simplifying a
   model to make it web-ready is a modification. Some of these models also
   carry a "NoAI" tag from the author.

Because several artists have used identical filenames, work from the page you
actually downloaded from — your browser history or Sketchfab's download list —
rather than from a search. Crediting the wrong person is worse than not
crediting at all.

If a model's licence does not permit this, the options are to replace it, to
commission or model a replacement, or to ship the game with the built-in
procedural bodywork for that car (the game still runs without any `.glb`).

## Car names — already dealt with

The cars carry invented names on invented marques: Kestrel, Sable, Meridian,
Talon, Corsair, Vanguard and Halcyon. No manufacturer or model trademark
appears anywhere a player can see, and the model filenames are neutral too.
There is a test for this in the suite, so it cannot quietly creep back in.

What renaming does **not** change is what the models depict. The shapes are
still recognisably particular real cars, and a distinctive car shape can be
protected in its own right. Renaming removes the trademark question — the part
that is cheap and certain to fix — and leaves the model licences, which is why
the table above matters more than anything else in this file.

If you ever want to close that gap too, the answer is different bodywork rather
than different words: the game runs on its built-in procedural cars, and the
handling and progression are unchanged by which body is on screen.

## Fonts and everything else

All textures, road surfaces, buildings, trees and UI art are generated in code
at load time — there are no third-party image or font files to license.
