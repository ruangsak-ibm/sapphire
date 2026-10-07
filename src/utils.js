/**
 * Utility functions
 */

/**
 * Generate unique IDs with prefixes for different entity types
 */
function generateId(prefix) {
  if (!prefix) {
    throw new Error('Prefix is required for ID generation');
  }

  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}${random}`;
}

/**
 * Validate blood pressure values
 */
function validateBloodPressure(systolic, diastolic) {
  if (typeof systolic !== 'number' || typeof diastolic !== 'number') {
    throw new Error('Systolic and diastolic must be numbers');
  }

  if (systolic < 0 || systolic > 300) {
    throw new Error('Systolic must be between 0 and 300 mmHg');
  }

  if (diastolic < 0 || diastolic > 200) {
    throw new Error('Diastolic must be between 0 and 200 mmHg');
  }

  if (systolic < diastolic) {
    throw new Error('Systolic must be greater than or equal to diastolic');
  }
}

/**
 * Format blood pressure reading as human-readable string
 */
function formatBloodPressure(systolic, diastolic, pulse = null) {
  let result = `${systolic}/${diastolic} mmHg`;
  if (pulse) {
    result += ` @ ${pulse} bpm`;
  }
  return result;
}

/**
 * Categorize blood pressure according to medical guidelines
 */
function categorizeBP(systolic, diastolic) {
  if (systolic > 180 || diastolic > 120) {
    return 'Hypertensive Crisis';
  }
  if (systolic < 120 && diastolic < 80) {
    return 'Normal';
  }
  if (systolic >= 120 && systolic < 130 && diastolic < 80) {
    return 'Elevated';
  }
  if ((systolic >= 130 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) {
    return 'High BP Stage 1';
  }
  if (systolic >= 140 || diastolic >= 90) {
    return 'High BP Stage 2';
  }
  return 'Unknown';
}

module.exports = {
  generateId,
  validateBloodPressure,
  formatBloodPressure,
  categorizeBP
};
