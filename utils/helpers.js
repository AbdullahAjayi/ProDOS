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

module.exports = {
  formatDate,
}
