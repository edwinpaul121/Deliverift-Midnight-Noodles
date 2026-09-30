# Car and road models

The models are included. The game looks for these names, in this folder:

| File | Car |
|---|---|
| `car-vanguard-gtx.glb` | Vanguard GT-X |
| `car-sable-200.glb` | Sable 200 Turbo |
| `car-kestrel-1600.glb` | Kestrel 1600 Coupe |
| `car-corsair-r3.glb` | Corsair Rotary R3 |
| `car-talon-rally.glb` | Talon Rally IV |
| `car-halcyon-v10.glb` | Halcyon V10 Circuit |
| `car-meridian-sprint.glb` | Meridian Sprint V6 |
| `car-vanguard-gtx-ii.glb` | Vanguard GT-X Series II |
| `car-sable-250.glb` | Sable 250 Fox |
| `car-vanguard-apex.glb` | Vanguard Apex Courier-spec |
| `roads-tileset.glb` | Road surface tiles |

Rename your downloads to these names. The game looks in `models/` beside the
page and nowhere else, so a file with the wrong name will not be found — the
loading screen names the file it wanted.

Any that are missing fall back to the built-in bodywork; the game still
runs. Filenames are mapped in `CAR_MODELS` at the top of `src/03-cars.js`.

## Compress them before publishing

The models total about 69 MB as supplied, which is far too much for a web
page — and too much for a comfortable git repository. Compressing geometry and
resizing textures typically brings that down by 80–90% with no visible
difference at the size cars appear on screen.

```bash
npm install -g @gltf-transform/cli
gltf-transform optimize in.glb out.glb --texture-size 1024 --compress draco
```

Check each one afterwards: `npm test` does not cover model appearance, and the
adapter that finds wheels and bodywork can be upset by an aggressive
simplification. `checks/` has scripts that measure wheelbase and wheel
placement against the real files.

The largest two (`nissan_silvia_s15_custom.glb` at 20 MB and
`mitsubishi_lancer_evo_x.glb` at 18 MB) are worth doing first.

## Git and large files

GitHub warns above 50 MB per file and refuses above 100 MB. Compressed models
sit well under that, but a repository carrying ten of them plus their history
gets heavy. Two sane options:

1. **Git LFS** — `git lfs track "*.glb"`, commit `.gitattributes` first.
2. **Keep them out of git** — host the models on the same static host and add
   `public/models/*.glb` to `.gitignore`. The repository stays small and
   readable; the deploy step uploads models separately.
