export const VOICE_TRANSCRIPTION_MODEL="@cf/openai/whisper-large-v3-turbo";

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
    return {ok:false,error:"voice_transcription_failed",detail:String(error?.message||error).slice(0,160)};
  }
}
