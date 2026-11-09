export const AI_ADVOCAT_VOICE_VERSION="AI_ADVOCAT_VOICE_R3";

export function splitSpeechText(value,{maxChars=260,maxChunks=48}={}){
  const text=String(value||"")
    .replace(/https?:\/\/\S+/giu," линк ")
    .replace(/[\t ]+/g," ")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
  if(!text) return [];
  const sentences=text.split(/(?<=[.!?…:])\s+|\n+/u).map(x=>x.trim()).filter(Boolean);
  const chunks=[];
  for(const sentence of sentences){
    let rest=sentence;
    while(rest.length>maxChars && chunks.length<maxChunks){
      let cut=rest.lastIndexOf(" ",maxChars);
      if(cut<Math.floor(maxChars*0.55)) cut=maxChars;
      chunks.push(rest.slice(0,cut).trim());
      rest=rest.slice(cut).trim();
    }
    if(rest && chunks.length<maxChunks) chunks.push(rest);
    if(chunks.length>=maxChunks) break;
  }
  return chunks;
}

export function pickMacedonianVoice(voices=[]){
  const list=Array.isArray(voices)?voices:[];
  return list.find(v=>String(v?.lang||"").toLowerCase()==="mk-mk")
    || list.find(v=>String(v?.lang||"").toLowerCase().startsWith("mk"))
    || null;
}

export function pickVoiceForLanguage(voices=[],language="mk-MK"){
  const list=Array.isArray(voices)?voices:[];
  const target=String(language||"mk-MK").toLowerCase();
  if(target.startsWith("mk")) return pickMacedonianVoice(list);
  return list.find(v=>String(v?.lang||"").toLowerCase()===target)
    || list.find(v=>String(v?.lang||"").toLowerCase().startsWith(target.split("-")[0]))
    || null;
}

export function speechRecognitionErrorMessage(code){
  const key=String(code||"unknown").toLowerCase();
  const messages={
    "not-allowed":"Микрофонот е блокиран. Дозволете пристап до микрофонот во прелистувачот и обидете се повторно.",
    "service-not-allowed":"Speech service е блокиран од прелистувачот. Проверете ги browser permissions.",
    "audio-capture":"Не е пронајден достапен микрофон. Проверете го уредот и системските audio permissions.",
    "no-speech":"Не слушнав говор. Притиснете го микрофонот и зборувајте повторно.",
    "network":"Speech recognition сервисот моментално не е достапен. Можете да продолжите со пишување.",
    "aborted":"Диктирањето е запрено.",
    "language-not-supported":"Македонскиот говор не е поддржан од овој browser speech service."
  };
  return messages[key]||"Диктирањето не успеа. Проверете го микрофонот и browser permissions или продолжете со пишување.";
}

export function microphonePermissionErrorMessage(error){
  const name=String(error?.name||error||"unknown").toLowerCase();
  if(name==="notallowederror" || name==="permissiondeniederror" || name==="securityerror"){
    return "Микрофонот е блокиран. Кликнете на иконата за дозволи до адресата на страницата, изберете Allow/Дозволи за Microphone и обидете се повторно.";
  }
  if(name==="notfounderror" || name==="devicesnotfounderror"){
    return "Не е пронајден микрофон. Проверете дали микрофонот е поврзан и овозможен во Windows/уредот.";
  }
  if(name==="notreadableerror" || name==="trackstarterror"){
    return "Микрофонот постои, но не може да се отвори. Затворете друга апликација што можеби го користи и обидете се повторно.";
  }
  return "Микрофонот не можеше да се активира. Проверете ги browser и системските microphone permissions и обидете се повторно.";
}

function setButtonState(button,state){
  if(!button) return;
  button.dataset.voiceState=state;
  button.setAttribute("aria-pressed",state==="listening"||state==="speaking"?"true":"false");
  button.classList.remove("is-listening","is-speaking","is-requesting");
  if(state==="requesting"){
    button.classList.add("is-requesting");
    button.title="Се бара дозвола за микрофон…";
    button.setAttribute("aria-label","Се бара дозвола за микрофон");
  }else if(state==="listening"){
    button.classList.add("is-listening");
    button.title="Запри диктирање";
    button.setAttribute("aria-label","Запри диктирање");
  }else if(state==="speaking"){
    button.classList.add("is-speaking");
  }
}

export function createAIAdvokatVoiceRuntime(win=globalThis,{lang="mk-MK"}={}){
  const SpeechRecognitionCtor=win?.SpeechRecognition||win?.webkitSpeechRecognition||null;
  const synth=win?.speechSynthesis||null;
  const Utterance=win?.SpeechSynthesisUtterance||null;
  const mediaDevices=win?.navigator?.mediaDevices||null;
  let activeRecognition=null;
  let speechGeneration=0;
  let activeSpeakButton=null;
  let microphonePermissionState="unknown";

  const setStatus=(status,value)=>{
    if(typeof status==="function") status(String(value||""));
    else if(status && "textContent" in status) status.textContent=String(value||"");
  };

  function stopRecognition(){
    if(activeRecognition){
      const rec=activeRecognition;
      activeRecognition=null;
      try{
        if(typeof rec.abort==="function") rec.abort();
        else rec.stop?.();
      }catch{}
    }
  }

  async function ensureMicrophonePermission(status){
    if(win?.isSecureContext===false){
      setStatus(status,"Микрофонот бара безбедна HTTPS страница. Отворете ја официјалната HTTPS верзија на AI Advokat.");
      return false;
    }
    const permissions=win?.navigator?.permissions;
    if(!permissions?.query) return true;
    try{
      const permission=await permissions.query({name:"microphone"});
      microphonePermissionState=String(permission?.state||"unknown");
      if(microphonePermissionState==="denied"){
        setStatus(status,microphonePermissionErrorMessage({name:"NotAllowedError"}));
        return false;
      }
    }catch{
      microphonePermissionState="unknown";
    }
    return true;
  }

  function bindMicrophone({button,input,status,onTranscript,language}={}){
    if(!button||!input) return {supported:false,stop:()=>{}};
    button.hidden=false;
    button.type="button";
    if(!SpeechRecognitionCtor){
      button.disabled=true;
      button.title="Диктирањето не е поддржано од овој прелистувач.";
      button.setAttribute("aria-label","Диктирањето не е поддржано");
      setStatus(status,"Овој прелистувач нема Speech Recognition. Пишувањето и гласното читање остануваат достапни.");
      return {supported:false,stop:()=>{}};
    }

    const dictationLabel=()=>{
      const locale=String(typeof language==="function"?language():language||lang||"mk-MK");
      return "Гласовно внесување · "+locale;
    };
    button.disabled=false;
    button.title=dictationLabel();
    button.setAttribute("aria-label",dictationLabel());
    button.setAttribute("aria-pressed","false");

    const start=async()=>{
      if(activeRecognition){
        stopRecognition();
        return;
      }
      if(button.dataset.voiceState==="requesting") return;
      setButtonState(button,"requesting");
      const permissionGranted=await ensureMicrophonePermission(status);
      if(!permissionGranted){
        setButtonState(button,"idle");
        button.title=dictationLabel();
        button.setAttribute("aria-label",dictationLabel());
        return;
      }

      const rec=new SpeechRecognitionCtor();
      activeRecognition=rec;
      let committed=false;
      const recognitionLang=typeof language==="function"?language():language||lang;
      rec.lang=String(recognitionLang||lang);
      rec.continuous=false;
      rec.interimResults=true;
      rec.maxAlternatives=1;

      rec.onstart=()=>{
        microphonePermissionState="granted";
        setButtonState(button,"listening");
        setStatus(status,"🎙 Микрофонот е активен · "+rec.lang+" — зборувајте.");
      };
      rec.onresult=event=>{
        let finalText="";
        let interim="";
        for(let i=event.resultIndex||0;i<(event.results?.length||0);i++){
          const part=String(event.results[i]?.[0]?.transcript||"").trim();
          if(!part) continue;
          if(event.results[i].isFinal) finalText+=(finalText?" ":"")+part;
          else interim+=(interim?" ":"")+part;
        }
        if(interim) setStatus(status,"🎙 Слушам: "+interim.slice(0,120));
        if(finalText && !committed){
          committed=true;
          input.value=(String(input.value||"")+" "+finalText).trim();
          try{input.dispatchEvent(new win.Event("input",{bubbles:true}));}catch{}
          if(typeof onTranscript==="function") onTranscript(finalText);
          setStatus(status,"✓ Диктирањето е внесено. Проверете го текстот и испратете.");
        }
      };
      let recognitionError="";
      rec.onerror=event=>{
        recognitionError=String(event?.error||"unknown");
        if(recognitionError==="not-allowed"||recognitionError==="service-not-allowed") microphonePermissionState="denied";
        setStatus(status,speechRecognitionErrorMessage(recognitionError));
      };
      rec.onend=()=>{
        if(activeRecognition===rec) activeRecognition=null;
        setButtonState(button,"idle");
        button.title=dictationLabel();
        button.setAttribute("aria-label",dictationLabel());
        if(!committed && !recognitionError){
          setStatus(status,"Микрофонот е запрен. Притиснете 🎙 за ново гласовно внесување.");
        }
      };
      try{
        setStatus(status,microphonePermissionState==="granted"
          ?"🎙 Го вклучувам микрофонот…"
          :"🎙 Го вклучувам микрофонот. Ако browser-от побара дозвола, изберете Allow / Дозволи.");
        rec.start();
      }catch(error){
        activeRecognition=null;
        setButtonState(button,"idle");
        button.title=dictationLabel();
        button.setAttribute("aria-label",dictationLabel());
        setStatus(status,microphonePermissionErrorMessage(error));
      }
    };

    button.addEventListener("click",start);
    return {supported:true,stop:stopRecognition};
  }

  function stopSpeaking(){
    speechGeneration++;
    try{synth?.cancel?.();}catch{}
    if(activeSpeakButton){
      activeSpeakButton.textContent="🔊 Прочитај";
      activeSpeakButton.title="Прочитај го AI одговорот";
      activeSpeakButton.setAttribute("aria-label","Прочитај го AI одговорот");
      setButtonState(activeSpeakButton,"idle");
      activeSpeakButton=null;
    }
  }

  function speak(text,{button,status,langOverride=lang,onComplete=null,onError=null}={}){
    if(!synth||!Utterance){
      setStatus(status,"Гласното читање не е поддржано од овој прелистувач.");
      if(typeof onError==="function") onError(new Error("speech_output_unsupported"));
      return false;
    }
    if(button && activeSpeakButton===button && button.dataset.voiceState==="speaking"){
      stopSpeaking();
      setStatus(status,"Гласното читање е запрено.");
      return true;
    }

    stopSpeaking();
    const chunks=splitSpeechText(text);
    if(!chunks.length) return false;
    const generation=++speechGeneration;
    const effectiveLang=String(langOverride||lang||"mk-MK");
    activeSpeakButton=button||null;
    if(button){
      button.textContent="■ Стоп";
      button.title="Запри гласно читање";
      button.setAttribute("aria-label","Запри гласно читање");
      setButtonState(button,"speaking");
    }
    setStatus(status,effectiveLang.toLowerCase().startsWith("en")
      ?"🔊 AI Advokat is reading the answer in English."
      :"🔊 AI Advokat го чита одговорот на македонски.");

    const voices=typeof synth.getVoices==="function"?synth.getVoices():[];
    const selectedVoice=pickVoiceForLanguage(voices,effectiveLang);
    let index=0;
    const next=()=>{
      if(generation!==speechGeneration) return;
      if(index>=chunks.length){
        if(button){
          button.textContent="🔊 Прочитај";
          button.title="Прочитај го AI одговорот";
          button.setAttribute("aria-label","Прочитај го AI одговорот");
          setButtonState(button,"idle");
        }
        if(activeSpeakButton===button) activeSpeakButton=null;
        setStatus(status,effectiveLang.toLowerCase().startsWith("en")
          ?"✓ English voice playback finished."
          :"✓ Гласното читање заврши.");
        if(typeof onComplete==="function") onComplete();
        return;
      }
      const utter=new Utterance(chunks[index++]);
      utter.lang=effectiveLang;
      if(selectedVoice) utter.voice=selectedVoice;
      utter.rate=1;
      utter.pitch=1;
      utter.volume=1;
      utter.onend=next;
      utter.onerror=event=>{
        if(generation!==speechGeneration) return;
        const error=new Error(String(event?.error||"speech_output_error"));
        if(typeof onError==="function") onError(error);
        stopSpeaking();
        setStatus(status,"Гласното читање беше прекинато"+(event?.error?" ("+event.error+")":"")+".");
      };
      try{synth.speak(utter);}
      catch(error){
        if(typeof onError==="function") onError(error);
        stopSpeaking();
        setStatus(status,"Гласното читање не можеше да се стартува.");
      }
    };
    next();
    return true;
  }

  function bindSpeakButton({button,text,status,language}={}){
    if(!button) return {supported:false};
    if(!synth||!Utterance){
      button.disabled=true;
      button.title="Гласното читање не е поддржано од овој прелистувач.";
      return {supported:false};
    }
    button.disabled=false;
    button.textContent="🔊 Прочитај";
    button.title="Прочитај го AI одговорот";
    button.setAttribute("aria-label","Прочитај го AI одговорот");
    button.addEventListener("click",()=>speak(
      typeof text==="function"?text():text,
      {button,status,langOverride:typeof language==="function"?language():language||lang}
    ));
    return {supported:true};
  }

  async function saveSpokenAudio(text,{status,language=lang,filename="AI-Advokat-voice.webm"}={}){
    const MediaRecorderCtor=win?.MediaRecorder||null;
    const MediaStreamCtor=win?.MediaStream||null;
    if(!mediaDevices?.getDisplayMedia||!MediaRecorderCtor||!MediaStreamCtor){
      setStatus(status,"Зачувување аудио не е поддржано од овој прелистувач. Користете Chrome/Edge на компјутер.");
      return {ok:false,reason:"capture_unsupported"};
    }
    let capture=null;
    let recorder=null;
    let timeoutId=null;
    try{
      setStatus(status,'💾 Изберете го тековниот browser tab и вклучете “Share tab audio”.');
      capture=await mediaDevices.getDisplayMedia({
        video:{displaySurface:"browser"},
        audio:true,
        preferCurrentTab:true,
        selfBrowserSurface:"include"
      });
      const audioTracks=capture.getAudioTracks?.()||[];
      if(!audioTracks.length){
        setStatus(status,'Нема споделен tab audio. Повторете и вклучете “Share tab audio”.');
        capture.getTracks?.().forEach(track=>track.stop?.());
        return {ok:false,reason:"no_audio_track"};
      }
      const audioStream=new MediaStreamCtor(audioTracks);
      const candidates=["audio/webm;codecs=opus","audio/webm"];
      const mimeType=candidates.find(type=>typeof MediaRecorderCtor.isTypeSupported==="function"&&MediaRecorderCtor.isTypeSupported(type))||"";
      const chunks=[];
      recorder=new MediaRecorderCtor(audioStream,mimeType?{mimeType}:{});
      const recorded=new Promise((resolve,reject)=>{
        recorder.ondataavailable=event=>{if(event.data?.size) chunks.push(event.data);};
        recorder.onerror=event=>reject(event?.error||new Error("audio_recording_failed"));
        recorder.onstop=()=>resolve(new win.Blob(chunks,{type:mimeType||"audio/webm"}));
      });
      recorder.start();
      timeoutId=win.setTimeout?.(()=>{try{if(recorder?.state!=="inactive") recorder.stop();}catch{}},180000);
      const started=speak(text,{
        status,
        langOverride:language,
        onComplete:()=>win.setTimeout?.(()=>{try{if(recorder?.state!=="inactive") recorder.stop();}catch{}},250),
        onError:()=>{try{if(recorder?.state!=="inactive") recorder.stop();}catch{}}
      });
      if(!started){
        try{recorder.stop();}catch{}
        throw new Error("speech_output_unavailable");
      }
      const blob=await recorded;
      if(!blob?.size) throw new Error("audio_recording_empty");
      const url=win.URL.createObjectURL(blob);
      const a=win.document.createElement("a");
      a.href=url;
      a.download=filename;
      a.rel="noopener";
      a.style.display="none";
      win.document.body.appendChild(a);
      a.click();
      a.remove();
      win.setTimeout?.(()=>win.URL.revokeObjectURL(url),1000);
      setStatus(status,"✓ Аудио-одговорот е зачуван локално.");
      return {ok:true,filename,size:blob.size,type:blob.type};
    }catch(error){
      const name=String(error?.name||"").toLowerCase();
      if(name==="notallowederror"||name==="aborterror"){
        setStatus(status,"Снимањето е откажано. За Save audio изберете го тековниот tab и Share tab audio.");
      }else{
        setStatus(status,"Аудио-снимањето не успеа. Проверете дали е избран тековниот tab со Share tab audio.");
      }
      return {ok:false,reason:String(error?.message||error||"recording_failed")};
    }finally{
      if(timeoutId) win.clearTimeout?.(timeoutId);
      try{capture?.getTracks?.().forEach(track=>track.stop?.());}catch{}
    }
  }

  function bindSaveAudioButton({button,text,status,language,filename}={}){
    if(!button) return {supported:false};
    const supported=Boolean(mediaDevices?.getDisplayMedia&&win?.MediaRecorder&&win?.MediaStream);
    button.disabled=!supported;
    button.title=supported
      ?"Зачувај го прочитаниот AI одговор како локално аудио"
      :"Save audio бара Chrome/Edge со tab-audio capture.";
    button.setAttribute("aria-label","Зачувај го AI одговорот како аудио");
    if(supported) button.addEventListener("click",()=>saveSpokenAudio(
      typeof text==="function"?text():text,
      {
        status,
        language:typeof language==="function"?language():language||lang,
        filename:typeof filename==="function"?filename():filename||"AI-Advokat-voice.webm"
      }
    ));
    return {supported};
  }

  return Object.freeze({
    version:AI_ADVOCAT_VOICE_VERSION,
    capabilities:Object.freeze({
      dictation:Boolean(SpeechRecognitionCtor),
      speechOutput:Boolean(synth&&Utterance),
      audioSave:Boolean(mediaDevices?.getDisplayMedia&&win?.MediaRecorder&&win?.MediaStream),
      languages:Object.freeze(["mk-MK","en-US"]),
      language:lang
    }),
    bindMicrophone,
    bindSpeakButton,
    bindSaveAudioButton,
    saveSpokenAudio,
    speak,
    stopSpeaking,
    stopRecognition
  });
}
