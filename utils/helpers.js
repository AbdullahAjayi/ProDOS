const formatDate = (date, locale = "en-US") => {
  if (!date) {
    console.warn("No date provided to formatDate")
    return "N/A"
  }

  const parsedDate = typeof date === "string" ? new Date(date) : date

  if (!(parsedDate instanceof Date) || isNaN(parsedDate)) {
    console.error("Invalid date:", date)
    return "Invalid date"
  }

  return parsedDate.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function addCorrectSuffix(date) {
  const num = parseInt(date, 10) // Convert the date to a number
  if (isNaN(num)) return date // If it's not a valid number, return as is

  const lastDigit = num % 10
  const lastTwoDigits = num % 100

  // Determine the correct suffix
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${num}th`
  }
  if (lastDigit === 1) {
    return `${num}st`
  }
  if (lastDigit === 2) {
    return `${num}nd`
  }
  if (lastDigit === 3) {
    return `${num}rd`
  }
  return `${num}th`
}

module.exports = {
  formatDate,
  addCorrectSuffix,
}
