import React, { useState } from "react";
import {
  Camera,
  MapPinned,
  ImageIcon,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/**
 * Road report panel — bright, semi-formal, easy to read for the public
 */

/**
 * Photo example data
 * -------------------------------------------------------
 * Developer: Replace the src of each item with the actual image path.
 * Images should be placed in: public/guide-images/
 *
 *   - example-1.svg (or .jpg/.png) → pothole example
 *   - example-2.svg                 → cracked road example
 *   - example-3.svg                 → unsuitable image example
 * -------------------------------------------------------
 */
const PHOTO_EXAMPLES = [
  {
    id: 1,
    src: "/guide-images/example-1.svg",
    alt: "Example of a clear pothole photo",
    label: "Pothole — Clearly Visible",
    tip: "Take a close-up photo showing the edges and depth of the pothole.",
    good: true,
  },
  {
    id: 2,
    src: "/guide-images/example-2.svg",
    alt: "Example of a clear cracked road photo",
    label: "Road Cracks — Clearly Visible",
    tip: "Capture the full length of the crack without cutting off the edges.",
    good: true,
  },
  {
    id: 3,
    src: "/guide-images/example-3.svg",
    alt: "Example of an unsuitable photo",
    label: "Dark / Blurry Image — Avoid",
    tip: "AI may not be able to analyze images that are too dark or blurry.",
    good: false,
  },
];

function PhotoGuideCard() {
  const [current, setCurrent] = useState(0);

  const total = PHOTO_EXAMPLES.length;
  const example = PHOTO_EXAMPLES[current];

  const prev = () =>
    setCurrent((c) => (c - 1 + total) % total);

  const next = () =>
    setCurrent((c) => (c + 1) % total);

  return (
    <div className="bg-paper/90 border border-line rounded-2xl p-5 anim-rise flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        <ImageIcon
          size={16}
          className="text-mark-deep shrink-0"
        />

        <p className="font-display text-sm text-ink leading-tight">
          Photo Examples
        </p>

        <span className="ml-auto text-[11px] font-medium text-asphalt/45 tabular-nums">
          {current + 1} / {total}
        </span>
      </div>

      {/* Image area */}
      <div className="relative overflow-hidden rounded-xl border border-line bg-mist/40 aspect-[4/3]">

        <img
          key={example.id}
          src={example.src}
          alt={example.alt}
          className="w-full h-full object-cover transition-opacity duration-300"
          onError={(e) => {
            /* Show placeholder when the image is not available */
            e.currentTarget.style.display = "none";

            if (e.currentTarget.nextElementSibling) {
              e.currentTarget.nextElementSibling.style.display = "flex";
            }
          }}
        />

        {/* Fallback placeholder */}
        <div
          className="absolute inset-0 hidden flex-col items-center justify-center gap-2 bg-mist/60"
          aria-hidden="true"
        >
          <ImageIcon
            size={32}
            className="text-asphalt/30"
          />

          <span className="text-xs text-asphalt/40">
            Photo example not available
          </span>
        </div>

        {/* Good / Bad badge */}
        <div
          className={`absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm ${
            example.good
              ? "bg-emerald-500/90 text-white"
              : "bg-red-500/90 text-white"
          }`}
        >
          {example.good ? (
            <CheckCircle2 size={12} />
          ) : (
            <XCircle size={12} />
          )}

          {example.good ? "Recommended" : "Avoid"}
        </div>

        {/* Previous arrow */}
        <button
          type="button"
          onClick={prev}
          aria-label="Previous image"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-ink/60 text-paper hover:bg-ink transition-colors backdrop-blur-sm"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Next arrow */}
        <button
          type="button"
          onClick={next}
          aria-label="Next image"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-ink/60 text-paper hover:bg-ink transition-colors backdrop-blur-sm"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Caption */}
      <div>
        <p className="text-xs font-semibold text-ink leading-snug">
          {example.label}
        </p>

        <p className="text-[11px] text-asphalt/60 mt-0.5 leading-relaxed">
          {example.tip}
        </p>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5">
        {PHOTO_EXAMPLES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to image ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current
                ? "w-4 bg-mark-deep"
                : "w-1.5 bg-asphalt/25"
            }`}
          />
        ))}
      </div>

      {/* DEV NOTE:
          Replace src values in PHOTO_EXAMPLES above
          and place the actual images in public/guide-images/
      */}
    </div>
  );
}

export default function Sidebar({
  formData,
  setFormData,
  handleFileChange,
  loading,
}) {
  return (
    <aside className="w-full lg:w-[340px] shrink-0 flex flex-col gap-5">

      {/* ========================================================
          REPORT FORM
      ======================================================== */}

      <div className="bg-paper/90 border border-line rounded-2xl p-5 anim-rise">

        <p className="font-display text-lg text-ink leading-tight">
          Report a Road Issue
        </p>

        <p className="text-sm text-asphalt/65 mt-1 leading-relaxed">
          Take a photo of the damaged road and submit it to the system — it takes less than a minute.
        </p>

        {/* Steps */}
        <ol className="mt-4 space-y-2 text-sm text-asphalt/75">

          <li className="flex gap-2">
            <span className="font-display text-mark-deep w-5 shrink-0">
              1.
            </span>

            Enter your name and a short description.
          </li>

          <li className="flex gap-2">
            <span className="font-display text-mark-deep w-5 shrink-0">
              2.
            </span>

            Choose a photo or take a picture of the road.
          </li>

          <li className="flex gap-2">
            <span className="font-display text-mark-deep w-5 shrink-0">
              3.
            </span>

            If the photo has no location data, you will be asked to pin the location on the map.
          </li>

        </ol>

        <div className="mt-5 flex flex-col gap-3">

          {/* Reporter Name */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">
              Reporter Name
            </label>

            <input
              type="text"
              placeholder="Enter your name"
              className="w-full bg-white border border-line px-3.5 py-3 rounded-xl text-sm outline-none focus:border-ink-soft focus:ring-2 focus:ring-ink/10 transition-all placeholder:text-asphalt/35"
              value={formData.reporter_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  reporter_name: e.target.value,
                })
              }
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">
              Additional Details
            </label>

            <textarea
              placeholder="e.g. Large pothole near the entrance of the alley..."
              className="w-full bg-white border border-line px-3.5 py-3 rounded-xl text-sm h-24 outline-none focus:border-ink-soft focus:ring-2 focus:ring-ink/10 transition-all resize-none placeholder:text-asphalt/35"
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
            />
          </div>

          {/* Upload Buttons */}
          <div className="flex flex-col gap-2">

            {/* Take Photo */}
            <label
              className={`block w-full text-center py-3.5 rounded-xl font-display text-base cursor-pointer transition-all ${
                loading
                  ? "bg-asphalt/25 text-asphalt/50 cursor-wait"
                  : "bg-ink text-paper hover:bg-ink-soft active:scale-[0.99]"
              }`}
            >
              <span className="inline-flex items-center justify-center gap-2">

                <Camera size={18} />

                {loading
                  ? "Uploading and analyzing..."
                  : "Take a Photo"}

              </span>

              {/* capture="environment" opens the rear camera on mobile */}
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                disabled={loading}
              />
            </label>

            {/* Choose from Gallery */}
            <label
              className={`block w-full text-center py-3.5 rounded-xl font-display text-base cursor-pointer transition-all ${
                loading
                  ? "bg-mist text-asphalt/50 cursor-wait border border-line/50"
                  : "bg-white text-ink hover:bg-mist active:scale-[0.99] border border-line"
              }`}
            >
              <span className="inline-flex items-center justify-center gap-2">

                <ImageIcon size={18} />

                Choose from Gallery

              </span>

              <input
                type="file"
                hidden
                onChange={handleFileChange}
                accept="image/*"
                disabled={loading}
              />
            </label>

          </div>

          {/* Location Information */}
          <div className="flex items-start gap-2 text-xs text-asphalt/60 leading-relaxed">

            <MapPinned
              size={14}
              className="text-mark-deep shrink-0 mt-0.5"
            />

            <p>
              The system automatically reads location data from the photo. If no location is available, you will be asked to select the location manually on the map.
            </p>

          </div>

        </div>
      </div>

      {/* ========================================================
          PHOTO GUIDE
      ======================================================== */}

      <PhotoGuideCard />

    </aside>
  );
}