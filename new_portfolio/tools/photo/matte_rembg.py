"""Background removal helper for process-photo.mjs.
usage: python matte_rembg.py <input> <output.png> [model]
Writes an RGBA PNG with a soft alpha matte. Exit code 2 when rembg is unavailable."""
import sys

try:
    from rembg import new_session, remove
    from PIL import Image
except Exception as e:  # rembg/onnxruntime not installed
    sys.stderr.write("rembg unavailable: %r\n" % (e,))
    sys.exit(2)

src, dst = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else "isnet-general-use"
im = Image.open(src).convert("RGB")
session = new_session(model)
out = remove(
    im,
    session=session,
    alpha_matting=True,
    alpha_matting_foreground_threshold=240,
    alpha_matting_background_threshold=15,
    alpha_matting_erode_size=8,
)
out.save(dst)
