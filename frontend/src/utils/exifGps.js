export async function readExifGpsClient(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target.result);
        if (view.getUint16(0) !== 0xFFD8) { resolve(null); return; }
        let offset = 2;
        while (offset < view.byteLength - 4) {
          const marker = view.getUint16(offset);
          const segLen = view.getUint16(offset + 2);
          if (marker === 0xFFE1) {
            const h = String.fromCharCode(view.getUint8(offset+4), view.getUint8(offset+5), view.getUint8(offset+6), view.getUint8(offset+7));
            if (h === 'Exif') {
              const tiff = offset + 10;
              const littleEndian = view.getUint16(tiff) === 0x4949;
              const getU16 = (o) => view.getUint16(o, littleEndian);
              const getU32 = (o) => view.getUint32(o, littleEndian);
              const ifd0 = tiff + getU32(tiff + 4);
              const count = getU16(ifd0);
              for (let i = 0; i < count; i++) {
                if (getU16(ifd0 + 2 + i * 12) === 0x8825) { resolve(true); return; }
              }
            }
          }
          if (segLen < 2) break;
          offset += 2 + segLen;
        }
        resolve(null);
      } catch { resolve(null); }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file.slice(0, 128 * 1024));
  });
}
