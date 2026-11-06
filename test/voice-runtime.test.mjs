import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_ADVOCAT_VOICE_VERSION,
  splitSpeechText,
  pickMacedonianVoice,
  speechRecognitionErrorMessage,
  microphonePermissionErrorMessage,
  createAIAdvokatVoiceRuntime
} from "../assets/ai-advokat-voice.mjs";

test("voice runtime exposes the governed R2 contract",()=>{
  assert.equal(AI_ADVOCAT_VOICE_VERSION,"AI_ADVOCAT_VOICE_R2");
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

test("Voice R2 requests real microphone permission before starting recognition",async()=>{
  const stopped=[];
  class FakeRecognition{
    constructor(){FakeRecognition.last=this;}
    start(){this.onstart?.();}
    stop(){this.onend?.();}
  }
  class FakeEvent{constructor(type){this.type=type;}}
  const win={
    isSecureContext:true,
    SpeechRecognition:FakeRecognition,
    Event:FakeEvent,
    navigator:{
      mediaDevices:{
        async getUserMedia(constraints){
          assert.deepEqual(constraints,{audio:true});
          return {getTracks:()=>[{stop(){stopped.push(true);}}]};
        }
      }
    }
  };
  const runtime=createAIAdvokatVoiceRuntime(win,{lang:"mk-MK"});
  const button=fakeButton();
  const input={value:"",dispatchEvent(){}};
  let status="";
  runtime.bindMicrophone({button,input,status:value=>{status=value;}});
  await button.click();
  assert.ok(FakeRecognition.last);
  assert.equal(stopped.length,1);
  assert.match(status,/активен|вклучувам/iu);
});

test("Voice R2 keeps the microphone retryable when browser permission is denied",async()=>{
  class FakeRecognition{constructor(){FakeRecognition.created=true;} start(){}}
  FakeRecognition.created=false;
  const win={
    isSecureContext:true,
    SpeechRecognition:FakeRecognition,
    navigator:{mediaDevices:{async getUserMedia(){
      const error=new Error("denied"); error.name="NotAllowedError"; throw error;
    }}}
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
