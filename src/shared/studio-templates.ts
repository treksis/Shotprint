import type { StudioTemplate } from './studio';

/**
 * Template catalog. "ready" = taken apart into sandbox/templates/<id> (recipe, ingredient set, storyboards,
 * docs/template_spec.md), copied into a project's workspace when it is picked. A ready template makes
 * 30 s and 15 s spots (`cuts`); `proof` is a side-by-side of the real footage cut the same way and a
 * blind rebuild from the template alone (local only, public/templates/proof/). "reference" = only the
 * source film exists, which goes into the workspace's inputs/ for the agent to take apart.
 */
export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: 'meta-vr-glasses-launch',
    title: 'Hardware launch film',
    source: 'Meta, "Introducing Meta VR Glasses"',
    format: 'Product reveal',
    status: 'ready',
    durationSec: 86.1,
    shots: 10,
    shotsMeasured: true,
    setups: 8,
    lines: 4,
    cuts: [30, 15],
    thumbnail: '/templates/meta-vr-glasses-launch.jpg',
    preview: '/templates/meta-vr-glasses-launch.mp4',
    proof: { '30': '/templates/proof/meta-vr-glasses-launch-30.mp4', '15': '/templates/proof/meta-vr-glasses-launch-15.mp4' },
    description:
      'A lens wakes in the dark, the hero lands on the beat, then the product lives in a loft, a stadium and a hero orbit before the end card.',
    prompt: 'Make a 30-second launch film for my product from the hardware launch template.',
  },
  {
    id: 'bluechip-factory',
    title: 'Founder on the factory floor',
    source: 'BlueChip, "Rebuilding American Computer Manufacturing"',
    format: 'Founder story',
    status: 'ready',
    durationSec: 117.3,
    shots: 15,
    shotsMeasured: true,
    setups: 13,
    lines: 10,
    cuts: [30, 15],
    thumbnail: '/templates/bluechip-factory.jpg',
    preview: '/templates/bluechip-factory.mp4',
    proof: { '30': '/templates/proof/bluechip-factory-30.mp4', '15': '/templates/proof/bluechip-factory-15.mp4' },
    description:
      'A three-camera founder interview cut across factory B-roll and an archive still, a hero reveal in gloved hands and a laser-etched payoff.',
    prompt: 'Make a 30-second founder film for my company from the factory floor template.',
  },
  {
    id: 'muse-introduction',
    title: 'Agent product intro',
    source: 'Meta, "Introducing Muse"',
    format: 'Motion graphics',
    status: 'ready',
    durationSec: 82.6,
    shots: 14,
    shotsMeasured: true,
    lines: 4,
    cuts: [30, 15],
    thumbnail: '/templates/muse-introduction.jpg',
    preview: '/templates/muse-introduction.mp4',
    proof: { '30': '/templates/proof/muse-introduction-30.mp4', '15': '/templates/proof/muse-introduction-15.mp4' },
    description:
      'Kinetic type and app UI on a soft gradient: an object grid pulls back to the icon, one task is done end to end, a mascot celebrates.',
    prompt: 'Make a 30-second intro film for my app from the agent product intro template.',
  },
  {
    id: 'muse-tour',
    title: 'Feature tour',
    source: 'Meta, "Take the full tour of Muse"',
    format: 'Presenter + screens',
    status: 'ready',
    durationSec: 157.1,
    shots: 9,
    shotsMeasured: true,
    setups: 4,
    lines: 7,
    cuts: [30, 15],
    thumbnail: '/templates/muse-tour.jpg',
    preview: '/templates/muse-tour.mp4',
    proof: { '30': '/templates/proof/muse-tour-30.mp4', '15': '/templates/proof/muse-tour-15.mp4' },
    description:
      'A presenter at a desk talks to camera, cut with phone screen recordings on a gradient: chats, a task list, goals, then the app end card.',
    prompt: 'Make a 30-second feature tour of my app from the feature tour template.',
  },
];
