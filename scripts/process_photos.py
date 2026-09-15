"""Descarga y grada la fotografía del sitio AURA Carballo.

IMPORTANTE — procedencia: el brief pedía fotografía generada con el mismo
grading cálido. En este entorno NO había herramienta de generación de imagen,
así que se usan fotografías con licencia Unsplash (uso comercial libre, sin
atribución obligatoria; se acredita igualmente en el README) elegidas para el
concepto "cuerpo en movimiento, luz natural". NINGUNA es una foto real de
AURA Carballo y la web las etiqueta como "fotografía de ambiente".
Sustituir por fotografía propia o generada en cuanto exista.

  manos       Sincerely Media  https://unsplash.com/photos/wGFibXDQlBI  (manos de terapeuta sobre hombro)
  piel-sombra Redd Francisco   https://unsplash.com/photos/XgC_lGgHD8c  (piel con sombra de planta, luz lateral)
  atleta      Filipe Amaral    https://unsplash.com/photos/wWvDODdTRTE  (atleta, mano en la rodilla, sol bajo)
  pistola     Javier Esteban   https://unsplash.com/photos/vw353SJTT80  (pistola de masaje negra)
  cesped      Long Chung       https://unsplash.com/photos/U1mEPbF_ejA  (césped artificial de entrenamiento)
  sombra-pared Alex He         https://unsplash.com/photos/IGsLkWL4JMM  (sombra de rama en pared cálida)
  monstera    Ranurte          https://unsplash.com/photos/7L-u875mqNQ  (sombra de monstera, oscuro)
  sombra-sage Pawel Czerwinski https://unsplash.com/photos/fK_d1gBw2s0  (sombras de plantas sobre pared verde)

Gradación común: luces viradas a madera clara, sombras a negro cálido
(no azul), saturación contenida y un toque terroso en los medios. Genera
-1600 / -900 y un LQIP real para el blur-up.
"""
import os, urllib.request, concurrent.futures
import numpy as np
from PIL import Image, ImageFilter, ImageOps

PHOTOS = {
    "manos": "wGFibXDQlBI",
    "piel-sombra": "XgC_lGgHD8c",
    "atleta": "wWvDODdTRTE",
    "pistola": "vw353SJTT80",
    "cesped": "U1mEPbF_ejA",
    "sombra-pared": "IGsLkWL4JMM",
    "monstera": "7L-u875mqNQ",
    "sombra-sage": "fK_d1gBw2s0",
}
# recortes (fracciones left, top, right, bottom) para que el encuadre cuente lo que toca
CROPS = {
    "cesped": (0.50, 0.74, 1.0, 0.97),    # solo el césped con sombras de hojas (sin máquinas)
    "pistola": (0.18, 0.05, 1.0, 0.95),   # el cuerpo negro de la pistola
}
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "img", "photos")
os.makedirs(OUT, exist_ok=True)

NEGRO = np.array([0x16, 0x12, 0x0E]) / 255.0   # sombras: negro cálido
MADERA = np.array([0xE6, 0xC9, 0x9A]) / 255.0  # luces: madera clara
TIERRA = np.array([0x9A, 0x4A, 0x32]) / 255.0  # medios: pizca terrosa


def grade(im: Image.Image) -> Image.Image:
    a = np.asarray(im.convert("RGB")).astype(np.float32) / 255.0
    lum = a @ np.array([0.299, 0.587, 0.114])
    a = lum[..., None] + (a - lum[..., None]) * 0.86           # saturación contenida
    a = 0.04 + a * 0.93                                          # negros levantados un pelo
    sh = np.clip(1.0 - lum, 0, 1)[..., None] ** 2
    hi = np.clip(lum - 0.5, 0, 1)[..., None] * 1.7
    mid = (np.exp(-((lum - 0.5) ** 2) / 0.06))[..., None]
    a = a + (NEGRO - 0.5) * 0.14 * sh + (MADERA - 0.5) * 0.22 * hi + (TIERRA - 0.5) * 0.05 * mid
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def fetch(pid, w):
    url = f"https://unsplash.com/photos/{pid}/download?force=true&w={w}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=240) as r:
        return r.read()


def process(name):
    pid = PHOTOS[name]
    src = os.path.join(OUT, f"{name}-src.jpg")
    if not os.path.exists(src):
        with open(src, "wb") as f:
            f.write(fetch(pid, 1800))
    im = ImageOps.exif_transpose(Image.open(src))
    if name in CROPS:
        l, t, r, b = CROPS[name]
        W, H = im.size
        im = im.crop((int(W * l), int(H * t), int(W * r), int(H * b)))
    im = grade(im)
    for w in (1600, 900):
        r = im.copy(); r.thumbnail((w, w * 3), Image.LANCZOS)
        r.save(os.path.join(OUT, f"{name}-{w}.jpg"), quality=82, optimize=True, progressive=True)
    tiny = im.copy(); tiny.thumbnail((32, 96), Image.LANCZOS)
    tiny.filter(ImageFilter.GaussianBlur(1.5)).save(os.path.join(OUT, f"{name}-lqip.jpg"), quality=45)
    os.remove(src)
    return name, im.size


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(3) as ex:
        for r in ex.map(process, list(PHOTOS)):
            print(r)
