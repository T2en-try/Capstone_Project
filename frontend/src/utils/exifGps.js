export async function readExifGpsClient(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const view = new DataView(e.target.result);

                // JPEG only
                if (view.getUint16(0) !== 0xFFD8) {
                    resolve(null);
                    return;
                }

                let offset = 2;

                while (offset < view.byteLength - 4) {
                    const marker = view.getUint16(offset);
                    const segLen = view.getUint16(offset + 2);

                    if (marker === 0xFFE1) {
                        const exifHeader = String.fromCharCode(
                            view.getUint8(offset + 4),
                            view.getUint8(offset + 5),
                            view.getUint8(offset + 6),
                            view.getUint8(offset + 7)
                        );

                        if (exifHeader === "Exif") {
                            const tiff = offset + 10;

                            const byteOrder = view.getUint16(tiff);

                            let littleEndian;

                            if (byteOrder === 0x4949) {
                                littleEndian = true;
                            } else if (byteOrder === 0x4D4D) {
                                littleEndian = false;
                            } else {
                                resolve(null);
                                return;
                            }

                            const getU16 = (o) =>
                                view.getUint16(o, littleEndian);

                            const getU32 = (o) =>
                                view.getUint32(o, littleEndian);

                            const getRational = (o) => {
                                const numerator = getU32(o);
                                const denominator = getU32(o + 4);

                                if (denominator === 0) {
                                    return null;
                                }

                                return numerator / denominator;
                            };

                            const ifd0Offset = getU32(tiff + 4);
                            const ifd0 = tiff + ifd0Offset;

                            const count = getU16(ifd0);

                            let gpsOffset = null;

                            // หา GPSInfo pointer (0x8825)
                            for (let i = 0; i < count; i++) {
                                const entry = ifd0 + 2 + i * 12;
                                const tag = getU16(entry);

                                if (tag === 0x8825) {
                                    gpsOffset = getU32(entry + 8);
                                    break;
                                }
                            }

                            if (gpsOffset == null) {
                                resolve(null);
                                return;
                            }

                            const gpsIfd = tiff + gpsOffset;
                            const gpsCount = getU16(gpsIfd);

                            let latitudeRef = null;
                            let longitudeRef = null;
                            let latitudeOffset = null;
                            let longitudeOffset = null;
                            let altitudeOffset = null;
                            let altitudeRef = null;

                            for (let i = 0; i < gpsCount; i++) {
                                const entry = gpsIfd + 2 + i * 12;

                                const tag = getU16(entry);
                                const type = getU16(entry + 2);
                                const countValue = getU32(entry + 4);

                                // GPSLatitudeRef
                                if (tag === 0x0001) {
                                    const valueOffset = entry + 8;

                                    latitudeRef = String.fromCharCode(
                                        view.getUint8(valueOffset)
                                    );
                                }

                                // GPSLatitude
                                else if (
                                    tag === 0x0002 &&
                                    type === 5 &&
                                    countValue >= 3
                                ) {
                                    latitudeOffset = getU32(entry + 8);
                                }

                                // GPSLongitudeRef
                                else if (tag === 0x0003) {
                                    const valueOffset = entry + 8;

                                    longitudeRef = String.fromCharCode(
                                        view.getUint8(valueOffset)
                                    );
                                }

                                // GPSLongitude
                                else if (
                                    tag === 0x0004 &&
                                    type === 5 &&
                                    countValue >= 3
                                ) {
                                    longitudeOffset = getU32(entry + 8);
                                }

                                // GPSAltitudeRef
                                else if (tag === 0x0005) {
                                    altitudeRef = view.getUint8(entry + 8);
                                }

                                // GPSAltitude
                                else if (
                                    tag === 0x0006 &&
                                    type === 5 &&
                                    countValue >= 1
                                ) {
                                    altitudeOffset = getU32(entry + 8);
                                }
                            }

                            if (
                                latitudeOffset == null ||
                                longitudeOffset == null ||
                                !latitudeRef ||
                                !longitudeRef
                            ) {
                                resolve(null);
                                return;
                            }

                            const latBase = tiff + latitudeOffset;
                            const lonBase = tiff + longitudeOffset;

                            const latDeg = getRational(latBase);
                            const latMin = getRational(latBase + 8);
                            const latSec = getRational(latBase + 16);

                            const lonDeg = getRational(lonBase);
                            const lonMin = getRational(lonBase + 8);
                            const lonSec = getRational(lonBase + 16);

                            if (
                                latDeg == null ||
                                latMin == null ||
                                latSec == null ||
                                lonDeg == null ||
                                lonMin == null ||
                                lonSec == null
                            ) {
                                resolve(null);
                                return;
                            }

                            let latitude =
                                latDeg +
                                latMin / 60 +
                                latSec / 3600;

                            let longitude =
                                lonDeg +
                                lonMin / 60 +
                                lonSec / 3600;

                            if (latitudeRef === "S") {
                                latitude *= -1;
                            }

                            if (longitudeRef === "W") {
                                longitude *= -1;
                            }

                            let altitude = null;

                            if (altitudeOffset != null) {
                                altitude = getRational(
                                    tiff + altitudeOffset
                                );

                                if (
                                    altitude != null &&
                                    altitudeRef === 1
                                ) {
                                    altitude *= -1;
                                }
                            }

                            resolve({
                                hasGps: true,
                                latitude,
                                longitude,
                                altitude,
                                // EXIF GPS accuracy ไม่ได้มีมาตรฐาน
                                // ที่กล้อง/มือถือทุกเครื่องจะเขียน
                                accuracy: null,
                            });

                            return;
                        }
                    }

                    if (segLen < 2) {
                        break;
                    }

                    offset += 2 + segLen;
                }

                resolve(null);
            } catch (error) {
                console.error("EXIF GPS parsing failed:", error);
                resolve(null);
            }
        };

        reader.onerror = () => resolve(null);

        reader.readAsArrayBuffer(
            file.slice(0, 128 * 1024)
        );
    });
}