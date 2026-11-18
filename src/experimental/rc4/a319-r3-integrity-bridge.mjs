/** Isolated integration seam, never an authorization of held legal sources. */
import {a319AttachCorpusToChat} from './a319-held-corpus-discovery.mjs';
import {assertDisplayableLegalResponse} from './legal-response-integrity.mjs';

export async function prepareDisplayWithHeldDiscovery({corpus, chatResponse, question} = {}) {
  // Verify the original provider response BEFORE attaching any discovery metadata.
  // An invalid response remains blocked even when the held corpus is valid.
  assertDisplayableLegalResponse(chatResponse);
  const result = await a319AttachCorpusToChat({corpus, chatResponse, question});
  if (!result.ok) {
    return {ok:false, code:result.error || 'A319_DISCOVERY_FAILED', displayAllowed:false,
      humanGateRequired:true, legalCitationGranted:false};
  }
  const response = assertDisplayableLegalResponse(result.chatResponse);
  const layer = response.a319DiscoveryOnly;
  if (layer?.status !== 'LEGAL_HOLD' || layer.authoritativeCitationAllowed !== false ||
      layer.humanGateRequired !== true || !Array.isArray(layer.sources) ||
      layer.sources.some(s => s.legalStatus !== 'LEGAL_HOLD' ||
        s.authorizedForAiCitation !== false || s.verifiedLegalCitation !== false ||
        s.discoveryOnly !== true || 'text' in s || 'url' in s)) {
    return {ok:false,code:'A319_GATE_VIOLATION',displayAllowed:false,
      humanGateRequired:true,legalCitationGranted:false};
  }
  return {ok:true,displayAllowed:true,legalCitationGranted:false,
    humanGateRequired:true, response};
}
