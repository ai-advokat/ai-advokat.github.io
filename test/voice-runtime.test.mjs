import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  AI_ADVOCAT_VOICE_VERSION,
  splitSpeechText,
  pickMacedonianVoice,
  pickVoiceForLanguage,
  speechRecognitionErrorMessage,
  microphonePermissionErrorMessage,
  createAIAdvokatVoiceRuntime
} from "../assets/ai-advokat-voice.mjs";

test("voice runtime exposes the governed R4 browser-plus-Workers-AI contract",()=>{
  assert.equal(AI_ADVOCAT_VOICE_VERSION,"AI_ADVOCAT_VOICE_R4");
});

test("speech chunking keeps long legal answers bounded without losing order",()=>{
  const text=("Прва реченица со правен контекст. "+"Втора реченица со подолг опис на изворите и Human Gate. ").repeat(30);
  const chunks=splitSpeechText(text,{maxChars:120,maxChunks:20});
  assert.ok(chunks.length>1);
  assert.ok(chunks.length<=20);
  assert.ok(chunks.every(x=>x.length<=120));
  assert.match(chunks[0],/Прва реченица/);
});

test("Macedonian voice selection never substitutes a neighbouring-language voice",()=>{
  const voices=[
    {lang:"sr-RS",name:"Serbian"},
    {lang:"mk-MK",name:"Macedonian"},
    {lang:"en-US",name:"English"}
  ];
  assert.equal(pickMacedonianVoice(voices)?.name,"Macedonian");
  assert.equal(pickMacedonianVoice([{lang:"sr-RS",name:"Serbian"}]),null);
});

test("microphone permission and device errors have actionable Macedonian messages",()=>{
  assert.match(speechRecognitionErrorMessage("not-allowed"),/Дозволете пристап/);
  assert.match(speechRecognitionErrorMessage("audio-capture"),/микрофон/iu);
  assert.match(speechRecognitionErrorMessage("no-speech"),/Не слушнав/);
  assert.match(microphonePermissionErrorMessage({name:"NotAllowedError"}),/Allow|Дозволи/iu);
  assert.match(microphonePermissionErrorMessage({name:"NotFoundError"}),/пронајден микрофон/iu);
});

test("Voice R4 starts browser-native recognition without pre-acquiring and closing the microphone stream",async()=>{
  let getUserMediaCalls=0;
  class FakeRecognition{
    constructor(){FakeRecognition.last=this;}
    start(){this.onstart?.();}
    abort(){this.onend?.();}
  }
  class FakeEvent{constructor(type){this.type=type;}}
  const win={
    isSecureContext:true,
    SpeechRecognition:FakeRecognition,
    Event:FakeEvent,
    navigator:{mediaDevices:{async getUserMedia(){getUserMediaCalls++;}}}
  };
  const runtime=createAIAdvokatVoiceRuntime(win,{lang:"mk-MK"});
  const button=fakeButton();
  const input={value:"",dispatchEvent(){}};
  let status="";
  runtime.bindMicrophone({button,input,status:value=>{status=value;}});
  await button.click();
  assert.ok(FakeRecognition.last);
  assert.equal(getUserMediaCalls,0);
  assert.equal(FakeRecognition.last.lang,"mk-MK");
  assert.match(status,/активен|вклучувам/iu);
});

test("Voice R4 keeps the microphone retryable when browser permission is already denied",async()=>{
  class FakeRecognition{constructor(){FakeRecognition.created=true;} start(){}}
  FakeRecognition.created=false;
  const win={
    isSecureContext:true,
    SpeechRecognition:FakeRecognition,
    navigator:{permissions:{async query(){return {state:"denied"};}}}
  };
  const runtime=createAIAdvokatVoiceRuntime(win,{lang:"mk-MK"});
  const button=fakeButton();
  const input={value:"",dispatchEvent(){}};
  let status="";
  runtime.bindMicrophone({button,input,status:value=>{status=value;}});
  await button.click();
  assert.equal(FakeRecognition.created,false);
  assert.equal(button.disabled,false);
  assert.equal(button.dataset.voiceState,"idle");
  assert.match(status,/Allow|Дозволи/iu);
});

test("Voice R4 uses abort for immediate microphone stop when available",async()=>{
  let aborted=0;
  class FakeRecognition{
    constructor(){FakeRecognition.last=this;}
    start(){this.onstart?.();}
    abort(){aborted++;this.onend?.();}
  }
  const win={isSecureContext:true,SpeechRecognition:FakeRecognition};
  const runtime=createAIAdvokatVoiceRuntime(win,{lang:"en-US"});
  const button=fakeButton();
  const input={value:"",dispatchEvent(){}};
  runtime.bindMicrophone({button,input,status:()=>{},language:()=>"en-US"});
  await button.click();
  await button.click();
  assert.equal(aborted,1);
  assert.equal(button.dataset.voiceState,"idle");
});


function fakeButton(){
  const listeners=new Map();
  const classes=new Set();
  return {
    hidden:false,disabled:false,title:"",textContent:"",dataset:{},
    classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x)},
    setAttribute(name,value){this[name]=String(value);},
    addEventListener(name,fn){listeners.set(name,fn);},
    click(){return listeners.get("click")?.({type:"click"});}
  };
}

test("Voice R4 falls back to MediaRecorder plus Workers AI transcription when SpeechRecognition is unavailable",async()=>{
  const track={stop(){}};
  const stream={getTracks:()=>[track]};
  class FakeMediaRecorder{
    static isTypeSupported(type){return type.includes("webm");}
    constructor(input,opts={}){this.stream=input;this.mimeType=opts.mimeType||"audio/webm";this.state="inactive";FakeMediaRecorder.last=this;}
    start(){this.state="recording";this.ondataavailable?.({data:new Blob(["voice"],{type:"audio/webm"})});}
    stop(){if(this.state==="inactive") return;this.state="inactive";queueMicrotask(()=>this.onstop?.());}
  }
  class FakeEvent{constructor(type){this.type=type;}}
  let fetchCalls=0;
  const win={
    MediaRecorder:FakeMediaRecorder,
    Event:FakeEvent,
    Blob,
    navigator:{mediaDevices:{async getUserMedia(){return stream;}}},
    fetch:async(url,opts)=>{
      fetchCalls++;
      assert.equal(url,"/api/voice/transcribe");
      assert.equal(opts.method,"POST");
      assert.equal(opts.headers["X-Voice-Language"],"mk-MK");
      return {ok:true,json:async()=>({ok:true,text:"договор за услуги"})};
    },
    setTimeout:()=>1,
    clearTimeout(){}
  };
  const runtime=createAIAdvokatVoiceRuntime(win,{lang:"mk-MK"});
  assert.equal(runtime.capabilities.browserSpeechRecognition,false);
  assert.equal(runtime.capabilities.workersAITranscriptionFallback,true);
  assert.equal(runtime.capabilities.dictation,true);
  const button=fakeButton();
  const input={value:"",dispatchEvent(){}};
  let transcript="";
  runtime.bindMicrophone({button,input,status:()=>{},onTranscript:text=>{transcript=text;}});
  await button.click();
  assert.equal(button.dataset.voiceState,"listening");
  await button.click();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(fetchCalls,1);
  assert.equal(input.value,"договор за услуги");
  assert.equal(transcript,"договор за услуги");
});

test("shared microphone binding commits final Macedonian transcript into the composer",async()=>{
  class FakeRecognition{
    constructor(){FakeRecognition.last=this;}
    start(){this.onstart?.();}
    stop(){this.onend?.();}
  }
  class FakeEvent{constructor(type){this.type=type;}}
  const win={SpeechRecognition:FakeRecognition,Event:FakeEvent};
  const runtime=createAIAdvokatVoiceRuntime(win,{lang:"mk-MK"});
  const button=fakeButton();
  const input={value:"Почеток",dispatchEvent(){}};
  let status="";
  runtime.bindMicrophone({button,input,status:value=>{status=value;}});
  await button.click();
  const result=[{transcript:"договор за услуги"}];
  result.isFinal=true;
  FakeRecognition.last.onresult?.({resultIndex:0,results:[result]});
  assert.equal(input.value,"Почеток договор за услуги");
  assert.match(status,/Диктирањето е внесено/);
});

test("shared speech output reads a long answer in bounded chunks and returns the button to idle",()=>{
  const spoken=[];
  class FakeUtterance{constructor(text){this.text=text;}}
  const synth={
    getVoices:()=>[{lang:"mk-MK",name:"MK"}],
    cancel(){},
    speak(utter){spoken.push(utter.text);utter.onend?.();}
  };
  const win={speechSynthesis:synth,SpeechSynthesisUtterance:FakeUtterance};
  const runtime=createAIAdvokatVoiceRuntime(win,{lang:"mk-MK"});
  const button=fakeButton();
  runtime.bindSpeakButton({
    button,
    text:()=>("Ова е правен одговор со Human Gate. ").repeat(30),
    status:()=>{}
  });
  button.click();
  assert.ok(spoken.length>1);
  assert.equal(button.textContent,"🔊 Прочитај");
  assert.equal(button.dataset.voiceState,"idle");
});


test("bilingual voice selection prefers the requested language without cross-language substitution",()=>{
  const voices=[
    {lang:"mk-MK",name:"Macedonian"},
    {lang:"en-US",name:"English US"},
    {lang:"en-GB",name:"English UK"}
  ];
  assert.equal(pickVoiceForLanguage(voices,"mk-MK")?.name,"Macedonian");
  assert.equal(pickVoiceForLanguage(voices,"en-US")?.name,"English US");
  assert.equal(pickVoiceForLanguage([{lang:"mk-MK",name:"MK"}],"en-US"),null);
});

test("speech output can switch from Macedonian to English per message",()=>{
  const spoken=[];
  class FakeUtterance{constructor(text){this.text=text;}}
  const synth={
    getVoices:()=>[{lang:"mk-MK",name:"MK"},{lang:"en-US",name:"EN"}],
    cancel(){},
    speak(utter){spoken.push({text:utter.text,lang:utter.lang,voice:utter.voice?.name});utter.onend?.();}
  };
  const win={speechSynthesis:synth,SpeechSynthesisUtterance:FakeUtterance};
  const runtime=createAIAdvokatVoiceRuntime(win,{lang:"mk-MK"});
  runtime.speak("This is an English legal answer.",{langOverride:"en-US",status:()=>{}});
  assert.equal(spoken[0].lang,"en-US");
  assert.equal(spoken[0].voice,"EN");
});

test("audio-save capability records shared tab audio locally and downloads WEBM",async()=>{
  const downloads=[];
  class FakeUtterance{constructor(text){this.text=text;}}
  const synth={
    getVoices:()=>[{lang:"mk-MK",name:"MK"}],
    cancel(){},
    speak(utter){queueMicrotask(()=>utter.onend?.());}
  };
  class FakeMediaRecorder{
    static isTypeSupported(type){return type.includes("webm");}
    constructor(stream,opts){this.stream=stream;this.opts=opts;this.state="inactive";}
    start(){this.state="recording";queueMicrotask(()=>this.ondataavailable?.({data:new Blob(["audio"],{type:"audio/webm"})}));}
    stop(){if(this.state==="inactive")return;this.state="inactive";queueMicrotask(()=>this.onstop?.());}
  }
  class FakeMediaStream{constructor(tracks){this.tracks=tracks;}}
  const captureTrack={stop(){}};
  const capture={getAudioTracks:()=>[captureTrack],getTracks:()=>[captureTrack]};
  const body={appendChild(){}};
  const win={
    speechSynthesis:synth,
    SpeechSynthesisUtterance:FakeUtterance,
    MediaRecorder:FakeMediaRecorder,
    MediaStream:FakeMediaStream,
    Blob,
    URL:{createObjectURL:()=> "blob:test",revokeObjectURL(){}},
    document:{body,createElement:()=>({style:{},click(){downloads.push(this.download);},remove(){}})},
    navigator:{mediaDevices:{getDisplayMedia:async()=>capture}},
    setTimeout:(fn)=>{queueMicrotask(fn);return 1;},
    clearTimeout(){}
  };
  const runtime=createAIAdvokatVoiceRuntime(win,{lang:"mk-MK"});
  const out=await runtime.saveSpokenAudio("Правен одговор",{status:()=>{},filename:"answer-MK.webm"});
  assert.equal(out.ok,true);
  assert.equal(downloads[0],"answer-MK.webm");
  assert.equal(runtime.capabilities.audioSave,true);
  assert.deepEqual(runtime.capabilities.languages,["mk-MK","en-US"]);
});


test("Voice R4 worker endpoint is bounded, rate-limited and uses Workers AI Whisper without app storage",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/\/api\/voice\/transcribe/);
  assert.match(worker,/VOICE_TRANSCRIBE_MAX_BYTES=2\*1024\*1024/);
  assert.match(worker,/scope:"voice_transcription"/);
  assert.match(worker,/@cf\/openai\/whisper-large-v3-turbo/);
  assert.match(worker,/retention:"no_application_storage"/);
  assert.match(worker,/humanGate:"review_transcript_before_legal_use"/);
});
