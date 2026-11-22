# Spec: taking a photo for the scanner

## Recommendation: don't build an in-page camera

The repo says the page runs mostly on iPhones, and the phone's file picker already offers "Take Photo", which opens the native camera. Users can already take a photo for the scanner. An in-page camera (getUserMedia with a live preview) would duplicate that and cost more than it returns:

- It needs a camera permission prompt, which the native route doesn't.
- It needs handling for denied permission, no camera, and an insecure context.
- iOS Safari has quirks: a video element needs `playsinline`, orientation behaves oddly, and a PWA or in-app webview may block it.
- The result is worse than the native camera: lower resolution, no HDR or Night mode, no tap-to-focus, and no EXIF orientation handling.
- It adds code and tests to maintain, and it touches the "photos never leave the device" privacy story for no benefit.

The request is already met by what exists. The only work worth doing is making that path obvious and reliable.

## What to do instead (small, one PR)

1. **Check the input.** Confirm the file input uses `accept="image/*"` and no `capture` attribute.
   - Without `capture`, iOS shows the full sheet: Photo Library, Take Photo, Choose File. That lets people pick an existing photo or take a new one.
   - Adding `capture="environment"` or `capture="user"` would skip the sheet and force the camera on iOS. That would take away library uploads, which the app also supports, so don't add it unless Chase wants a camera-only button.
2. **Add a hint.** Put one line of copy by the picker, such as "Choose a photo or take one". Optionally add a second "Take a photo" button wired to a hidden input with `capture="user"`, so people see the camera option without opening the sheet. This is a product call for Chase. My default is the single input plus the hint.
3. **Handle orientation.** Test that a photo taken in portrait on an iPhone renders upright. Use `createImageBitmap(file, {imageOrientation: 'from-image'})` or CSS `image-orientation: from-image`.
4. **Handle large files.** Phone photos are 3-12 MB. Downscale to the processing size before analysis, in the browser only.
5. **Keep it on device.** No upload, no analytics, as the hard rules already require.

## Acceptance criteria

- On iPhone Safari, tapping the picker offers Take Photo, and a photo taken that way is scanned with no extra steps.
- A portrait photo shows upright.
- Choosing from the library still works.
- No network request is made when a photo is chosen.
- A desktop browser still shows an ordinary file picker.

## Tests

- A unit test checks the input's `accept` attribute and that there is no forced `capture` on the main input (or the exact `capture` value on the optional second button).
- A test covers EXIF-rotated fixture handling. The fixture must be generated or CC0, never a real person.
- A test confirms no network call happens on selection.

## Out of scope

- A live camera preview, a capture button, camera switching, and getUserMedia.
- Revisit only if Chase wants live framing guidance, such as a body outline overlay, or a desktop webcam flow. Neither is needed for the stated iPhone case.

## Decision for Chase

Keep the single picker and add the hint (recommended), or add a separate "Take a photo" button. Either is a small change. I'd skip the in-page camera.
