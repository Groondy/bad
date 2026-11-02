export default defineEventHandler((event) => {
  const group = Number(getQuery(event).group)
  return getRanking(useDb(), Number.isInteger(group) && group > 0 ? group : undefined)
})
