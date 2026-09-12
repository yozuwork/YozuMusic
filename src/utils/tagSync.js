export function buildTagUpdates(current, section, tags, additions = []) {
  const updates = { [section]: tags }
  for (const { tag, sections } of additions) {
    for (const target of sections) {
      if (target === section || !Object.hasOwn(current, target)) continue
      const existing = updates[target] || current[target]
      const duplicate = existing.some((item) => item.id === tag.id
        || item.label.trim().toLocaleLowerCase('zh-Hant') === tag.label.trim().toLocaleLowerCase('zh-Hant'))
      if (!duplicate) updates[target] = [...existing, tag]
    }
  }
  return updates
}
