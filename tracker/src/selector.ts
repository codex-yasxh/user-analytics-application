import { SEL_MAX } from '@cf/shared/constants';

export function buildSelector(target: EventTarget | null): string | undefined {
  if (!(target instanceof Element)) return undefined;
  const tag = target.tagName.toLowerCase();
  if (target.id) return `${tag}#${target.id}`.slice(0, SEL_MAX);
  const classes = [...target.classList]
    .slice(0, 2)
    .map((name) => `.${name}`)
    .join('');
  if (classes) return `${tag}${classes}`.slice(0, SEL_MAX);
  const peers = [...(target.parentElement?.children ?? [])].filter(
    (child) => child.tagName === target.tagName,
  );
  return `${tag}:nth-of-type(${peers.indexOf(target) + 1})`.slice(0, SEL_MAX);
}
