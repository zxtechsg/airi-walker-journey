# AIRI — The Everyday Journey

An animated product site for AIRI: Assisted Intelligent Reactive Independence.

## Run locally

Use Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

## Build and publish

```sh
npm run build
```

The `Publish AIRI` workflow builds and deploys `codex/publish` to GitHub Pages. Set the repository's Pages source to **GitHub Actions**. The project base path is `/airi-walker-journey/` in `vite.config.ts`.

## Forms

This public copy runs entirely in the browser. Demo and enquiry forms prepare a pre-filled email to `e1523083@u.nus.edu`. The visitor must send it from their email app. The site does not claim that a booking is confirmed or a message has been saved.

## Media

The product film is 51 seconds. It includes the full folding, lifting and car-loading sequence. Generated product and lifestyle visuals illustrate AIRI's concept; the motor cutaway is conceptual rather than verified production CAD.

The original Sites-hosted project and Apple-style version are maintained separately.

[GitHub Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Playable game

The card immediately below the hero opens `/airi-walker-journey/game/`. `game-source/` contains the standalone browser game. Run `npm --prefix game-source ci` before the root build; the deployment workflow builds both apps.

The public game uses browser-local text command matching and sample buttons. GitHub Pages does not run the desktop Python/Whisper/Qwen backend; no microphone or AI inference is claimed for this web edition. Gameplay is a scripted concept demonstration. The card's “First Person” wording invites hands-on play; the game camera remains third-person. The local AI-enabled version is maintained separately.
