import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_ADVOCAT_VOICE_VERSION,
  splitSpeechText,
  pickMacedonianVoice,
  speechRecognitionErrorMessage
} from "../assets/ai-advokat-voice.mjs";

test("voice runtime exposes the governed R1 contract",()=>{
  assert.equal(AI_ADVOCAT_VOICE_VERSION,"AI_ADVOCAT_VOICE_R1");
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
});
