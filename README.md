# CASEWARS — PvP inventory duel prototype

Standalone mobile-first web prototype. There is no build step or server dependency. Open `index.html` locally or publish these three files through GitHub Pages.

## Loop

1. Select items from a randomly drawn deck. Click a card, then a free cell in the 8×5 case. Rotate with ↻. You can drag from the deck to the case on touch screens or with a mouse.
2. Start a duel with a local bot. The case remains open; click or drag a weapon into the arena to fire. The pistol uses pistol ammo, shotgun uses shells, and launcher fires once.
3. Click or drag a green herb to heal. Select two or three herbs and click **Смешать травы** to make a mix. Green + red increases healing; a mix containing green + yellow adds maximum HP.

This is a single-player interaction test with a simulated opponent, not network PvP. All visuals are simple original CSS and symbols. Character names and familiar item categories are temporary concept references to Resident Evil and would need to be replaced for a standalone commercial product.

## Publish on GitHub Pages

Create a repository, put the contents of this directory at the repository root, and push to `main`. In **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`. The prototype will appear at `https://<username>.github.io/<repository>/`.
