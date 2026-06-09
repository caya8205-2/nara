export const formatDate = (date: Date): string =>
  date.toISOString().split('T')[0]

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))
