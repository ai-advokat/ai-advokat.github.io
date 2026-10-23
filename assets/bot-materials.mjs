export async function localGuideDocuments(vault, ids, enabled) {
  if (!enabled) return [];
  if (!vault) throw new Error('Локалната збирка не е достапна.');
  return vault.documentsForGuides(ids.map(id => ({id})), {max:2});
}
