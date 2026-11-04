# {{title}}: a Shotprint template

A video template written for an AI agent to run, not a project file to edit.

- `template/`: the template. `TEMPLATE.md` (read first), `template.json` (every shot's timing,
  framing, camera, light, text and sound), `boards/` (a storyboard per shot), `set/` (the cast,
  product and places to swap).
- `recipe/`: the fill recipe. `SKILL.md` is how an agent turns this template into a new 30 s or
  15 s spot; `template_spec.md` is the format.

## Use it

Give both folders to your agent with your product, your cast and one sentence, and tell it to follow
`recipe/SKILL.md`. It works with any image and video model: where the recipe says `bin/img` or
`bin/h3`, use the ones you have.

https://shotprint.dev
