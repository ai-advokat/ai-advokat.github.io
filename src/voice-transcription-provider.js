export const VOICE_TRANSCRIPTION_MODEL="@cf/openai/whisper-large-v3-turbo";

// Categorise upstream failures without returning provider raw error messages,
// transcribed audio, credentials or service internals to a public client.
export function classifyVoiceTranscriptionFailure(error){
  const detail=String(error?.message||error||"").slice(0,320);
  // 3036 is daily allocation exhaustion; 3040 is temporary *model*
  // capacity. Never report 3040 as spent Neurons, even if HTTP is 429.
  if(/\b3036\b|daily free allocation|10[,.]?000\s*neurons/i.test(detail)){
    return "voice_transcription_capacity_exhausted";
  }
  if(/\b3040\b|capacity temporarily exceeded|out of capacity/i.test(detail)){
    return "voice_transcription_model_busy";
  }
  if(/\b429\b|rate.limit|too many requests/i.test(detail)){
    return "voice_transcription_provider_rate_limited";
  }
  if(/timeout|timed out|\b504\b/i.test(detail)){
    return "voice_transcription_upstream_timeout";
  }
  return "voice_transcription_failed";
}

export async function runVoiceTranscriptionAI(env,{audioBase64,language}={}){
  if(!env?.AI || typeof env.AI.run!=="function"){
    return {ok:false,error:"voice_transcription_unavailable"};
  }
  const input={
    audio:String(audioBase64||""),
    task:"transcribe",
    vad_filter:true,
    condition_on_previous_text:false
  };
  if(language) input.language=String(language);
  try{
    const result=await env.AI.run(VOICE_TRANSCRIPTION_MODEL,input);
    const text=String(result?.text||"").trim();
    if(!text) return {ok:false,error:"empty_transcript"};
    return {ok:true,text,model:VOICE_TRANSCRIPTION_MODEL,provider:"workers_ai"};
  }catch(error){
    return {ok:false,error:classifyVoiceTranscriptionFailure(error)};
  }
}
