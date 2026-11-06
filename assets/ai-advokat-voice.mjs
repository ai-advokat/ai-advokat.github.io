export const AI_ADVOCAT_VOICE_VERSION="AI_ADVOCAT_VOICE_R2";

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
  let microphonePermissionGranted=false;
  let microphonePermissionPending=null;

  const setStatus=(status,value)=>{
    if(typeof status==="function") status(String(value||""));
    else if(status && "textContent" in status) status.textContent=String(value||"");
  };

  function stopRecognition(){
    if(activeRecognition){
      try{activeRecognition.stop();}catch{}
      activeRecognition=null;
    }
  }

  async function ensureMicrophonePermission(status){
    if(win?.isSecureContext===false){
      setStatus(status,"Микрофонот бара безбедна HTTPS страница. Отворете ја официјалната HTTPS верзија на AI Advokat.");
      return false;
    }
    if(microphonePermissionGranted) return true;
    if(!mediaDevices?.getUserMedia) return true;
    if(microphonePermissionPending) return microphonePermissionPending;

    microphonePermissionPending=(async()=>{
      setStatus(status,"🎙 Се бара дозвола за микрофон. Во browser прозорецот изберете Allow / Дозволи.");
      let stream=null;
      try{
        stream=await mediaDevices.getUserMedia({audio:true});
        microphonePermissionGranted=true;
        setStatus(status,"✓ Микрофонот е дозволен. Го вклучувам диктирањето…");
        return true;
      }catch(error){
        setStatus(status,microphonePermissionErrorMessage(error));
        return false;
      }finally{
        try{stream?.getTracks?.().forEach(track=>track?.stop?.());}catch{}
        microphonePermissionPending=null;
      }
    })();
    return microphonePermissionPending;
  }

  function bindMicrophone({button,input,status,onTranscript}={}){
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

    button.disabled=false;
    button.title="Диктирај на македонски";
    button.setAttribute("aria-label","Диктирај на македонски");
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
        button.title="Диктирај на македонски";
        button.setAttribute("aria-label","Диктирај на македонски");
        return;
      }

      const rec=new SpeechRecognitionCtor();
      activeRecognition=rec;
      let committed=false;
      rec.lang=lang;
      rec.continuous=false;
      rec.interimResults=true;
      rec.maxAlternatives=1;

      rec.onstart=()=>{
        setButtonState(button,"listening");
        setStatus(status,"🎙 Микрофонот е активен — зборувајте на македонски.");
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
      rec.onerror=event=>{
        setStatus(status,speechRecognitionErrorMessage(event?.error));
      };
      rec.onend=()=>{
        activeRecognition=null;
        setButtonState(button,"idle");
        button.title="Диктирај на македонски";
        button.setAttribute("aria-label","Диктирај на македонски");
        if(!committed && !String(status?.textContent||"").includes("блокиран")){
          // Keep any explicit error message already written by onerror.
        }
      };
      try{rec.start();}
      catch(error){
        activeRecognition=null;
        setButtonState(button,"idle");
        setStatus(status,"Микрофонот не можеше да се стартува. Проверете ги browser permissions и обидете се повторно.");
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

  function speak(text,{button,status}={}){
    if(!synth||!Utterance){
      setStatus(status,"Гласното читање не е поддржано од овој прелистувач.");
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
    activeSpeakButton=button||null;
    if(button){
      button.textContent="■ Стоп";
      button.title="Запри гласно читање";
      button.setAttribute("aria-label","Запри гласно читање");
      setButtonState(button,"speaking");
    }
    setStatus(status,"🔊 AI Advokat го чита одговорот.");

    const voices=typeof synth.getVoices==="function"?synth.getVoices():[];
    const mkVoice=pickMacedonianVoice(voices);
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
        setStatus(status,"✓ Гласното читање заврши.");
        return;
      }
      const utter=new Utterance(chunks[index++]);
      utter.lang=lang;
      if(mkVoice) utter.voice=mkVoice;
      utter.rate=1;
      utter.pitch=1;
      utter.volume=1;
      utter.onend=next;
      utter.onerror=event=>{
        if(generation!==speechGeneration) return;
        stopSpeaking();
        setStatus(status,"Гласното читање беше прекинато"+(event?.error?" ("+event.error+")":"")+".");
      };
      try{synth.speak(utter);}
      catch{
        stopSpeaking();
        setStatus(status,"Гласното читање не можеше да се стартува.");
      }
    };
    next();
    return true;
  }

  function bindSpeakButton({button,text,status}={}){
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
    button.addEventListener("click",()=>speak(typeof text==="function"?text():text,{button,status}));
    return {supported:true};
  }

  return Object.freeze({
    version:AI_ADVOCAT_VOICE_VERSION,
    capabilities:Object.freeze({
      dictation:Boolean(SpeechRecognitionCtor),
      speechOutput:Boolean(synth&&Utterance),
      language:lang
    }),
    bindMicrophone,
    bindSpeakButton,
    speak,
    stopSpeaking,
    stopRecognition
  });
}
