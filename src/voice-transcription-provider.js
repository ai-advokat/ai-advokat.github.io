export const VOICE_TRANSCRIPTION_MODEL="@cf/openai/whisper-large-v3-turbo";

// Categorise upstream failures without returning provider raw error messages,
// transcribed audio, credentials or service internals to a public client.
export function classifyVoiceTranscriptionFailure(error){
  const detail=String(error?.message||error||"").slice(0,320);
  if(/\b(?:3036|4006)\b/i.test(detail) && /daily free allocation|neurons|quota|capacity/i.test(detail)){
    return "voice_transcription_capacity_exhausted";
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
