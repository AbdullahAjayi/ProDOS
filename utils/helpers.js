const formatDate = (date, locale = "en-US") => {
  const parsedDate = typeof date === "string" ? new Date(date) : date

  if (isNaN(parsedDate)) {
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
