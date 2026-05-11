/**
 * Normalizes the AI Result payload from the backend to ensure consistent structure
 * across the frontend, handling both Full Fusion and Partial Success scenarios.
 * 
 * @param {Object} rawResult - The raw ai_result from the backend
 * @returns {Object|null} Normalized AI result object
 */
export function normalizeAiResult(rawResult) {
  if (!rawResult) return null;

  // Check if it's a "partial_success" from backend (Computer Vision only, missing GPS)
  if (rawResult.status === 'partial_success') {
    return {
      isPartial: true,
      cvFeatures: rawResult.ai_analysis || {},
      contextData: null,
      fusionResult: null,
      note: rawResult.note || "Analysis limited to Computer Vision due to missing GPS",
      annotatedImage: rawResult.ai_analysis?.annotated_image_filename || null
    };
  }

  // Full Fusion success
  return {
    isPartial: false,
    cvFeatures: rawResult.cv_features || {},
    contextData: rawResult.context_data || null,
    fusionResult: rawResult.fusion_result || null,
    note: null,
    annotatedImage: rawResult.cv_features?.annotated_image_filename || null
  };
}
