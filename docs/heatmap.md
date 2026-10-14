# Heatmap Rendering

How click coordinates are captured, stored, and rendered accurately across viewports.

## The Problem

A user clicks "Add to Cart" on their phone at coordinates (195, 460) on a 390px-wide page. The reviewer opens the heatmap on their 1280px desktop monitor. If we just plot (195, 460) on the desktop layout, the dot lands in the wrong place — the button has reflowed to a completely different position.

## The Solution: Viewport Bucketing

Every event is classified into a bucket based on `vw` (viewport width):

| Bucket    | Viewport Width | Reference Width |
| --------- | -------------- | --------------- |
| `mobile`  | < 768px        | 390px           |
| `tablet`  | 768px – 1023px | 768px           |
| `desktop` | >= 1024px      | 1280px          |

The heatmap iframe renders the demo page at the bucket's reference width. Clicks are filtered by bucket. Mobile clicks only appear on the mobile heatmap, rendered against a 390px-wide iframe.

## Coordinate Math

Clicks store `pageX`/`pageY` (document-relative) and `doc_w`/`doc_h` (document scroll dimensions at click time).

Rendering uses uniform aspect-ratio scaling:

```
scale = renderWidth / doc_w
px = x * scale
py = y * scale
```

Both axes use the same scale factor (derived from width) to prevent aspect distortion on tall or dynamic pages. Independent `x/doc_w` and `y/doc_h` ratios are avoided.

## Canvas Rendering

- **HiDPI:** Canvas dimensions multiplied by `devicePixelRatio`, CSS dimensions set to logical size
- **Radial gradients:** Each click renders as a radial gradient (red center → orange → transparent edge)
- **Additive blending:** `globalCompositeOperation = 'lighter'` — overlapping clicks create bright hotspots
- **Radius:** Scaled proportionally to canvas width (`width / 35`, clamped to 16–32px)

## Demo vs External Pages

- **Demo pages** (same origin): Rendered inside an iframe with `?cf_ignore=1` appended to prevent the iframe from tracking itself
- **External pages** (cross-origin): Can't be iframed due to `X-Frame-Options`/CSP. Falls back to a coordinate grid with a diagnostic notice

## Known Limitations

- **Sticky/fixed elements:** Clicks on `position: fixed` headers record document-relative coordinates. If the user scrolls before clicking, the dot appears at the absolute document offset, not pinned to the viewport top.
- **Intra-bucket reflow:** Layouts that shift dramatically within a bucket (e.g., 1024px vs 1279px both map to `desktop`) may show slight visual offset.
