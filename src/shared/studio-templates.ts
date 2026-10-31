import type { StudioTemplate } from './studio';

/**
 * Template catalog. "ready" = dissected into lab/templates/<id> (TEMPLATE.md + template.json) and
 * validated by a judged run; "reference" = the source ad is in the library but not dissected yet.
 * Shot counts for references are scene-detection estimates, labelled as such in the UI.
 */
export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: 'bluechip-factory',
    title: 'Founder on the factory floor',
    source: 'BlueChip, "Rebuilding American Computer Manufacturing"',
    status: 'ready',
    durationSec: 117.3,
    shots: 52,
    shotsMeasured: true,
    setups: 5,
    lines: 6,
    thumbnail: '/templates/bluechip-factory.jpg',
    preview: '/templates/bluechip-factory.mp4',
    description:
      'A three-camera founder interview cut across factory B-roll, a late hero reveal and a laser-etched payoff. 30-second cutdown, 15 shots.',
    prompt: 'Make a 30-second Meta VR Glasses ad from the BlueChip factory template.',
    example: { demoId: 'bluechip-v3', product: 'Meta VR Glasses', score: 8.55 },
  },
  {
    id: 'meta-vr-glasses-launch',
    title: 'Hardware launch film',
    source: 'Meta, "Introducing Meta VR Glasses"',
    status: 'reference',
    durationSec: 86.1,
    shots: 21,
    shotsMeasured: false,
    thumbnail: '/templates/meta-vr-glasses-launch.jpg',
    preview: '/templates/meta-vr-glasses-launch.mp4',
    description: 'Studio product reveal: black void, slow orbit, title cards. Dissect it to use as a template.',
    prompt: 'Dissect the Meta VR Glasses launch film into a template, then rebuild it for my product.',
  },
  {
    id: 'muse-introduction',
    title: 'Agent product intro',
    source: 'Meta, "Introducing Muse"',
    status: 'reference',
    durationSec: 82.6,
    shots: 3,
    shotsMeasured: false,
    thumbnail: '/templates/muse-introduction.jpg',
    preview: '/templates/muse-introduction.mp4',
    description: 'Screen-led walkthrough with soft transitions instead of hard cuts. Dissect it to use as a template.',
    prompt: 'Dissect the Introducing Muse film into a template, then rebuild it for my app.',
  },
  {
    id: 'muse-tour',
    title: 'Feature tour',
    source: 'Meta, "Take the full tour of Muse"',
    status: 'reference',
    durationSec: 157.1,
    shots: 19,
    shotsMeasured: false,
    thumbnail: '/templates/muse-tour.jpg',
    preview: '/templates/muse-tour.mp4',
    description: 'Long-form feature tour on device mockups. Dissect it to use as a template.',
    prompt: 'Dissect the Muse tour into a template, then make a 30-second cutdown for my app.',
  },
];
