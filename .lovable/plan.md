# Fix complete blog image rendering

## Root cause

The shared `BlogCover` component always forces a 16:9 wrapper with `overflow-hidden`, while its image fills that wrapper using `object-cover`. The individual article page and admin editor preview both use this default, so non-16:9 uploads are cropped even though the original file, storage object, and saved database path are unchanged.

## Changes

- Add a non-cropping, natural-ratio display mode to `BlogCover` while preserving its existing fixed 16:9 thumbnail mode.
- Use the natural-ratio mode for the individual blog article cover so its width stays responsive and its height follows the original image dimensions.
- Use the same non-cropping mode for the admin create/edit cover preview so admins see the complete uploaded image before saving.
- Keep the blog listing cards and compact admin table thumbnails unchanged because those are intentional fixed-format thumbnails.

## Verification

- Test wide, standard landscape, square, and portrait images in the article and admin preview.
- Check article rendering at 375, 390, 414, 768, 1280, and 1440px for full visibility, preserved aspect ratio, no clipping, distortion, overflow, or unexpected layout shift.
- Confirm existing stored paths and absolute image URLs still resolve after refresh and in a fresh browser context.
- Confirm blog listing thumbnails, create/edit/save/publish behavior, and article loading remain intact.
- Check browser console/network diagnostics, typecheck, and production build.
