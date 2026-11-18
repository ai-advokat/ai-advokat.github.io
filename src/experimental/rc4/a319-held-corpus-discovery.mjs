/** RC7 single-source compatibility bridge, never a second A3.19 implementation.
 * Canonical implementation is PR #716 src/a319-held-corpus-discovery.js.
 * Held statutory content remains LEGAL_HOLD, not a legal answer source.
 */
export {
  A319_DISCOVERY_GATE_VERSION,
  validateA319Corpus,
  retrieveA319,
  a319AttachCorpusToChat,
} from '../../a319-held-corpus-discovery.js';
